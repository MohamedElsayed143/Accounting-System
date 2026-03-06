// app/(dashboard)/sales-invoices/actions.tsx
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSystemSettings } from "@/app/(dashboard)/settings/actions";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// دالة مساعدة لحساب الرصيد الحالي لمنتج
async function getCurrentStock(productId: number, tx?: any) {
  const client = tx || prisma;
  const result = await client.stockMovement.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

export async function getSalesInvoices() {
  const session = await getSession();
  if (!session) return [];
  
  const canView = await hasPermission(session.userId, "sales_view");
  if (!canView) return [];

  try {
    const invoices = await prisma.salesInvoice.findMany({
      orderBy: { invoiceDate: 'desc' },
      include: {
        _count: {
          select: { salesReturns: true }
        },
        salesReturns: {
          select: { total: true }
        }
      }
    });

    return invoices.map(inv => {
      const returnsTotal = inv.salesReturns.reduce((sum, ret) => sum + ret.total, 0);
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        invoiceDate: inv.invoiceDate,
        total: inv.total,
        netTotal: inv.total - returnsTotal,
        status: inv.status,
        returnsCount: inv._count.salesReturns,
        returnsTotal,
      };
    });
  } catch (error) {
    console.error("Error fetching sales invoices:", error);
    return [];
  }
}

export async function getSalesInvoiceWithItems(id: number) {
  return prisma.salesInvoice.findUnique({
    where: { id },
    include: { items: true }
  });
}

export async function getSalesInvoiceWithReturns(id: number) {
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: true }
      },
      customer: true,
      salesReturns: {
        include: { items: true }
      }
    }
  });
  return invoice;
}

export async function getSalesInvoiceById(id: number) {
  return prisma.salesInvoice.findUnique({
    where: { id },
    include: { items: true },
  });
}

export async function getNextInvoiceNumber(): Promise<number> {
  const last = await prisma.salesInvoice.findFirst({
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  return (last?.invoiceNumber ?? 0) + 1;
}

export async function checkInvoiceNumberExists(num: number): Promise<boolean> {
  const found = await prisma.salesInvoice.findUnique({
    where: { invoiceNumber: num },
    select: { id: true },
  });
  return !!found;
}

export async function getSalesInvoicesByCustomer(customerId: number) {
  return prisma.salesInvoice.findMany({
    where: { customerId },
    orderBy: { invoiceDate: 'desc' },
    select: {
      id: true,
      invoiceNumber: true,
      customerName: true,
      invoiceDate: true,
      total: true,
    }
  });
}

export async function createSalesInvoice(data: {
  invoiceNumber: number;
  customerId: number;
  customerName: string;
  invoiceDate: string;
  subtotal: number;
  totalTax: number;
  discount: number;
  total: number;
  status: "cash" | "credit" | "pending";
  safeId?: number;
  bankId?: number;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount: number;
    total: number;
    productId: number;
  }[];
  topNotes?: string[];
  notes?: string[];
}) {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const canCreate = await hasPermission(session.userId, "sales_create");
  if (!canCreate) throw new Error("ليس لديك صلاحية إنشاء فواتير");

  if (!data.customerId) throw new Error("يجب اختيار العميل أولاً");
  if (data.items.length === 0) throw new Error("لا يمكن حفظ فاتورة فارغة");

  // جلب الإعدادات مرة واحدة خارج المعاملة
  const settings = await getSystemSettings();
  const allowNegativeStock = settings?.inventory?.allowNegativeStock ?? false;

  const stockWarnings: string[] = [];

  const result = await prisma.$transaction(async (tx) => {
    // 1. التحقق من رقم الفاتورة
    const taken = await tx.salesInvoice.findUnique({
      where: { invoiceNumber: data.invoiceNumber },
      select: { id: true },
    });
    if (taken) throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);

    // 2. التحقق من الأصناف وفحص المخزون
    for (const item of data.items) {
      if (!item.productId) {
        throw new Error("يجب اختيار منتج لكل صنف");
      }
      const product = await tx.product.findUnique({
        where: { id: item.productId, isActive: true },
        select: { name: true, id: true },
      });
      if (!product) throw new Error(`الصنف المختار غير متوفر أو تم إيقاف التعامل معه`);

      const currentStock = await getCurrentStock(item.productId, tx);
      if (currentStock < item.quantity) {
        if (!allowNegativeStock) {
          // منع البيع إذا لم يكن السماح بالمخزون السالب مفعلاً
          throw new Error(`لا يوجد رصيد كافي للصنف ${product.name} — المتوفر: ${currentStock}`);
        } else {
          // السماح بالبيع مع تسجيل تحذير
          stockWarnings.push(`${product.name} (المتوفر: ${currentStock})`);
        }
      }
    }

    // 3. إنشاء الفاتورة
    const invoice = await tx.salesInvoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        customerId: data.customerId,
        customerName: data.customerName,
        invoiceDate: new Date(data.invoiceDate),
        subtotal: data.subtotal,
        totalTax: data.totalTax,
        discount: data.discount,
        total: data.total,
        status: data.status,
        safeId: data.status === "cash" ? data.safeId : null,
        bankId: data.status === "cash" ? data.bankId : null,
        topNotes: data.topNotes || [],
        notes: data.notes || [],
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discount: item.discount,
            total: item.total,
            productId: item.productId,
          })),
        },
      },
    });

    // 3.5 تحديث الخزنة أو البنك إذا كانت الفاتورة كاش
    if (data.status === "cash" && (data.safeId || data.bankId)) {
      if (data.safeId) {
        await tx.treasurySafe.update({
          where: { id: data.safeId },
          data: { balance: { increment: data.total } },
        });
      } else if (data.bankId) {
        await tx.treasuryBank.update({
          where: { id: data.bankId },
          data: { balance: { increment: data.total } },
        });
      }
    }

    // 4. إنشاء حركات مخزون وتحديث الرصيد الحالي
    if (data.status !== "pending") {
      for (const item of data.items) {
        // فحص الرصيد الحالي قبل التخصيم
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { currentStock: true }
        });
        const currentVal = product?.currentStock ?? 0;
        const actualDeduct = Math.min(currentVal, item.quantity);
        const shortage = item.quantity - actualDeduct;

        // الحركة الأساسية (المبيعات) - تسجل بالكامل للتقارير
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "SALE",
            quantity: -item.quantity,
            unitPrice: item.unitPrice,
            reference: `فاتورة بيع #${data.invoiceNumber}`,
            salesInvoiceId: invoice.id,
          },
        });

        // حركة تسوية تعويضية إذا كان الرصيد سينخفض عن الصفر
        if (shortage > 0) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: "ADJUSTMENT",
              quantity: shortage,
              unitPrice: 0,
              reference: `تعديل تلقائي رصيد سالب #${data.invoiceNumber}`,
              notes: "تمت التسوية آلياً لأن الرصيد لا يمكن أن يقل عن الصفر",
              salesInvoiceId: invoice.id,
            },
          });
        }

        // تحديث الرصيد الفعلي (لا يقل عن الصفر)
        if (actualDeduct > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: actualDeduct } }
          });
        }
      }
    }

    revalidatePath("/sales-invoices");
    revalidatePath("/inventory/stock");

    return invoice;
  });

  return { invoice: result, stockWarnings };
}

export async function updateSalesInvoice(
  id: number,
  data: {
    invoiceNumber: number;
    customerId: number;
    customerName: string;
    invoiceDate: string;
    subtotal: number;
    totalTax: number;
    discount: number;
    total: number;
    status: "cash" | "credit" | "pending";
    safeId?: number;
    bankId?: number;
    items: {
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      discount: number;
      total: number;
      productId: number;
    }[];
    topNotes?: string[];
    notes?: string[];
  }
) {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const canEdit = await hasPermission(session.userId, "sales_edit");
  if (!canEdit) throw new Error("ليس لديك صلاحية تعديل فواتير");

  if (!data.customerId) throw new Error("يجب اختيار العميل أولاً");

  // جلب الإعدادات مرة واحدة خارج المعاملة
  const settings = await getSystemSettings();
  const allowNegativeStock = settings?.inventory?.allowNegativeStock ?? false;
  const stockWarnings: string[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const existingInvoice = await tx.salesInvoice.findUnique({
      where: { id },
      select: { status: true, total: true, safeId: true, bankId: true, invoiceNumber: true }
    });

    if (!existingInvoice) throw new Error("الفاتورة غير موجودة");
    
    if (existingInvoice.status !== data.status) {
      throw new Error("لا يمكن تغيير نوع الفاتورة بعد الحفظ لحماية حركات الخزنة والبنك");
    }

    if (existingInvoice.status === "cash") {
      if (existingInvoice.safeId !== data.safeId || existingInvoice.bankId !== data.bankId) {
        throw new Error("لا يمكن تغيير جهة الدفع (الخزنة/البنك) بعد الحفظ لضمان سلامة العمليات المالية");
      }
    }

    if (existingInvoice.invoiceNumber !== data.invoiceNumber) {
      const numberTaken = await tx.salesInvoice.findUnique({
        where: { invoiceNumber: data.invoiceNumber },
        select: { id: true },
      });
      if (numberTaken) throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);
    }

    // 0. عكس أثر الخزنة القديم إذا كانت كاش
    if (existingInvoice.status === "cash") {
      if (existingInvoice.safeId) {
        await tx.treasurySafe.update({
          where: { id: existingInvoice.safeId },
          data: { balance: { decrement: existingInvoice.total } }
        });
      } else if (existingInvoice.bankId) {
        await tx.treasuryBank.update({
          where: { id: existingInvoice.bankId },
          data: { balance: { decrement: existingInvoice.total } }
        });
      }
    }

    // 1. عكس أثر الحركات القديمة على المخزون بالاعتماد على مجموع حركات الفاتورة السابقة
    if (existingInvoice.status !== "pending") {
      const oldMovements = await tx.stockMovement.findMany({
        where: { salesInvoiceId: id },
        select: { productId: true, quantity: true }
      });

      // تجميع الأثر حسب المنتج
      const oldImpacts: Record<number, number> = {};
      for (const mv of oldMovements) {
        oldImpacts[mv.productId] = (oldImpacts[mv.productId] || 0) + mv.quantity;
      }

      // عكس الأثر: إذا كان المجموع سالباً (خصم) نزيده، وإذا كان موجباً ننقصه
      for (const [pId, qty] of Object.entries(oldImpacts)) {
        if (qty !== 0) {
          await tx.product.update({
            where: { id: Number(pId) },
            data: { currentStock: { increment: -qty } }
          });
        }
      }
    }

    await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: id } });
    await tx.stockMovement.deleteMany({ where: { salesInvoiceId: id } });

    // 2. التحقق من الأصناف والمخزون الجديد
    for (const item of data.items) {
      if (!item.productId) {
        throw new Error("يجب اختيار منتج لكل صنف");
      }
      const product = await tx.product.findUnique({
        where: { id: item.productId, isActive: true },
        select: { name: true },
      });
      if (!product) throw new Error(`أحد الأصناف المختارة تم إيقاف التعامل معه`);

      const currentStock = await getCurrentStock(item.productId, tx);
      if (currentStock < item.quantity) {
        if (!allowNegativeStock) {
          throw new Error(`رصيد غير كافي للصنف ${product.name} — المتوفر: ${currentStock}`);
        } else {
          stockWarnings.push(`${product.name} (المتوفر: ${currentStock})`);
        }
      }
    }

    // 3. تحديث الفاتورة وإنشاء الأصناف الجديدة
    const invoice = await tx.salesInvoice.update({
      where: { id },
      data: {
        invoiceNumber: data.invoiceNumber,
        customerId: data.customerId,
        customerName: data.customerName,
        invoiceDate: new Date(data.invoiceDate),
        subtotal: data.subtotal,
        totalTax: data.totalTax,
        discount: data.discount,
        total: data.total,
        status: data.status,
        safeId: data.status === "cash" ? data.safeId : null,
        bankId: data.status === "cash" ? data.bankId : null,
        topNotes: data.topNotes || [],
        notes: data.notes || [],
        items: {
          deleteMany: {},
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discount: item.discount,
            total: item.total,
            productId: item.productId,
          })),
        },
      },
    });

    // 3.5 تطبيق أثر الخزنة الجديد إذا كانت كاش
    if (data.status === "cash" && (data.safeId || data.bankId)) {
      if (data.safeId) {
        await tx.treasurySafe.update({
          where: { id: data.safeId },
          data: { balance: { increment: data.total } },
        });
      } else if (data.bankId) {
        await tx.treasuryBank.update({
          where: { id: data.bankId },
          data: { balance: { increment: data.total } },
        });
      }
    }

    // 4. إنشاء حركات مخزون جديدة وتحديث الرصيد الحالي
    if (data.status !== "pending") {
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { currentStock: true }
        });
        const currentVal = product?.currentStock ?? 0;
        const actualDeduct = Math.min(currentVal, item.quantity);
        const shortage = item.quantity - actualDeduct;

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "SALE",
            quantity: -item.quantity,
            unitPrice: item.unitPrice,
            reference: `فاتورة بيع #${data.invoiceNumber}`,
            salesInvoiceId: invoice.id,
          },
        });

        if (shortage > 0) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: "ADJUSTMENT",
              quantity: shortage,
              unitPrice: 0,
              reference: `تعديل تلقائي رصيد سالب #${data.invoiceNumber}`,
              notes: "تمت التسوية آلياً لأن الرصيد لا يمكن أن يقل عن الصفر",
              salesInvoiceId: invoice.id,
            },
          });
        }

        if (actualDeduct > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: actualDeduct } }
          });
        }
      }
    }

    revalidatePath("/sales-invoices");
    revalidatePath("/inventory/stock");

    return invoice;
  });

  return { invoice: result, stockWarnings };
}

export async function deleteSalesInvoice(id: number) {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const canDelete = await hasPermission(session.userId, "sales_delete");
  if (!canDelete) throw new Error("ليس لديك صلاحية حذف فواتير");

  await prisma.$transaction(async (tx) => {
    // 0. جلب بيانات الفاتورة لمعرفة حالتها וחساباتها
    const invoice = await tx.salesInvoice.findUnique({
      where: { id },
      select: { status: true, total: true, safeId: true, bankId: true }
    });

    if (invoice) {
        // 1. عكس أثر المبالغ المالية إذا كانت الفاتورة كاش
        if (invoice.status === "cash") {
          if (invoice.safeId) {
            await tx.treasurySafe.update({
              where: { id: invoice.safeId },
              data: { balance: { decrement: invoice.total } }
            });
          } else if (invoice.bankId) {
            await tx.treasuryBank.update({
              where: { id: invoice.bankId },
              data: { balance: { decrement: invoice.total } }
            });
          }
        }

        // 2. عكس أثر المخزون قبل الحذف
        const movements = await tx.stockMovement.findMany({
          where: { salesInvoiceId: id },
          select: { productId: true, quantity: true }
        });

        const impacts: Record<number, number> = {};
        for (const m of movements) {
          impacts[m.productId] = (impacts[m.productId] || 0) + m.quantity;
        }

        for (const [pId, qty] of Object.entries(impacts)) {
          if (qty !== 0) {
            await tx.product.update({
              where: { id: Number(pId) },
              data: { currentStock: { increment: -qty } }
            });
          }
        }
    }

    await tx.stockMovement.deleteMany({ where: { salesInvoiceId: id } });
    await tx.salesInvoice.delete({ where: { id } });
  });

  revalidatePath("/sales-invoices");
  revalidatePath("/inventory/stock");
}