// app/(dashboard)/sales-invoices/actions.tsx
"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSystemSettings } from "@/app/(dashboard)/settings/actions";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  triggerStaffActivityAlert,
  triggerStockAlert,
  triggerTreasuryAlert,
} from "@/lib/notifications";

// دالة مساعدة لحساب الرصيد الحالي لمنتج
async function getCurrentStock(
  productId: number,
  tx?: Prisma.TransactionClient,
) {
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
      orderBy: { invoiceDate: "desc" },
      include: {
        _count: {
          select: { salesReturns: true },
        },
        salesReturns: {
          select: { total: true },
        },
      },
    });

    return invoices.map((inv) => {
      const returnsTotal = inv.salesReturns.reduce(
        (sum, ret) => sum + ret.total,
        0,
      );
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
    include: { items: true },
  });
}

export async function getSalesInvoiceWithReturns(id: number) {
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: true },
      },
      customer: true,
      salesReturns: {
        include: { items: true },
      },
    },
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
    orderBy: { invoiceDate: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      customerName: true,
      invoiceDate: true,
      total: true,
    },
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
    profitMargin: number;
    taxRate: number;
    discount: number;
    total: number;
    productId: number;
  }[];
  notes?: string[];
  dueDate?: string;
  printableTitle?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const canCreate = await hasPermission(session.userId, "sales_create");
  if (!canCreate) throw new Error("ليس لديك صلاحية إنشاء فواتير");

  if (!data.customerId) throw new Error("يجب اختيار العميل أولاً");
  if (data.items.length === 0) throw new Error("لا يمكن حفظ فاتورة فارغة");
  if (data.status === "cash" && !data.safeId && !data.bankId) {
    throw new Error("يجب تحديد جهة الدفع (الخزنة أو البنك) للفواتير النقدية");
  }

  // جلب الإعدادات مرة واحدة خارج المعاملة
  const settings = await getSystemSettings();
  const allowNegativeStock = settings?.inventory?.allowNegativeStock ?? false;

  const stockWarnings: string[] = [];
  const pendingAlerts: {
    type: "treasury" | "stock";
    name: string;
    value: number;
    limit?: number;
  }[] = [];

  const result = await prisma.$transaction(async (tx) => {
    // 1. التحقق من رقم الفاتورة
    const taken = await tx.salesInvoice.findUnique({
      where: { invoiceNumber: data.invoiceNumber },
      select: { id: true },
    });
    if (taken)
      throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);

    // 2. التحقق من الأصناف وفحص المخزون
    for (const item of data.items) {
      if (!item.productId) {
        throw new Error("يجب اختيار منتج لكل صنف");
      }
      const product = await tx.product.findUnique({
        where: { id: item.productId, isActive: true },
        select: { name: true, id: true },
      });
      if (!product)
        throw new Error(`الصنف المختار غير متوفر أو تم إيقاف التعامل معه`);

      const currentStock = await getCurrentStock(item.productId, tx);
      if (currentStock < item.quantity) {
        if (!allowNegativeStock) {
          // منع البيع إذا لم يكن السماح بالمخزون السالب مفعلاً
          throw new Error(
            `لا يوجد رصيد كافي للصنف ${product.name} — المتوفر: ${currentStock}`,
          );
        } else {
          // السماح بالبيع مع تسجيل تحذير
          stockWarnings.push(`${product.name} (المتوفر: ${currentStock})`);
        }
      }
    }

    // 3. إنشاء الفاتورة
    const safeIdVal =
      data.status === "cash" && data.safeId ? data.safeId : null;
    const bankIdVal =
      data.status === "cash" && data.bankId ? data.bankId : null;

    const invoice = await tx.salesInvoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        customerId: data.customerId,
        customerName: data.customerName,
        status: data.status,
        subtotal: data.subtotal,
        totalTax: data.totalTax,
        discount: data.discount,
        total: data.total,
        notes: data.notes || [],
        safeId: safeIdVal,
        bankId: bankIdVal,
        printableTitle: data.printableTitle,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            profitMargin: item.profitMargin ?? 0,
            taxRate: item.taxRate,
            discount: item.discount,
            total: item.total,
            productId: item.productId,
          })),
        },
      },
      include: {
        customer: { select: { accountId: true, name: true } },
        items: true,
      },
    });

    // 3.1. إنشاء قيد المحاسبة (Auto-Posting)
    const customerAccountId = invoice.customer?.accountId;
    if (!customerAccountId) throw new Error("العميل غير مربوط بحساب محاسبي");

    const salesRevenueAccount = await tx.account.findUnique({
      where: { code: "4101" },
    });
    if (!salesRevenueAccount) throw new Error("حساب المبيعات (4101) غير موجود");

    const lastEntry = await tx.journalEntry.findFirst({
      orderBy: { entryNumber: "desc" },
      select: { entryNumber: true },
    });
    const entryNumber = (lastEntry?.entryNumber || 0) + 1;

    await tx.journalEntry.create({
      data: {
        entryNumber,
        date: invoice.invoiceDate,
        description: `فاتورة مبيعات #${invoice.invoiceNumber} - ${invoice.customerName}`,
        sourceType: "SALES_INVOICE",
        sourceId: invoice.id,
        items: {
          create: [
            {
              accountId: customerAccountId,
              debit: invoice.total,
              credit: 0,
              description: `قيمة فاتورة مبيعات #${invoice.invoiceNumber}`,
            },
            {
              accountId: salesRevenueAccount.id,
              debit: 0,
              credit: invoice.total,
              description: `إيراد مبيعات فاتورة #${invoice.invoiceNumber}`,
            },
          ],
        },
      },
    });

    // 3.3. تسجيل تكلفة البضاعة المباعة وتقليل المخزون إذا كانت الفاتورة نهائية
    const inventoryAccount = await tx.account.findUnique({
      where: { code: "120301" },
    });
    if (!inventoryAccount)
      throw new Error("حساب مخزون البضاعة 120301 غير موجود");

    let salesCogsValue = 0;

    if (data.status !== "pending") {
      const invoiceItems = invoice.items ?? [];
      for (const item of invoiceItems) {
        if (!item.productId) continue;

        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { currentStock: true, buyPrice: true },
        });

        const currentVal = product?.currentStock ?? 0;
        const actualDeduct = Math.min(currentVal, item.quantity);
        const shortage = item.quantity - actualDeduct;
        const unitCost = product?.buyPrice ?? 0;
        salesCogsValue += item.quantity * unitCost;

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "SALE",
            quantity: -item.quantity,
            unitPrice: item.unitPrice,
            reference: `فاتورة بيع مؤكدة #${invoice.invoiceNumber}`,
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
              reference: `تعديل تلقائي رصيد سالب #${invoice.invoiceNumber}`,
              notes: "تمت التسوية آلياً لأن الرصيد لا يمكن أن يقل عن الصفر",
              salesInvoiceId: invoice.id,
            },
          });
        }

        if (actualDeduct > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: actualDeduct } },
          });
        }
      }

      if (salesCogsValue > 0) {
        const cogsAccount = await tx.account.findUnique({
          where: { code: "6101" },
        });
        if (!cogsAccount)
          throw new Error("حساب تكلفة البضاعة المباعة 6101 غير موجود");

        const lastCogsEntry = await tx.journalEntry.findFirst({
          orderBy: { entryNumber: "desc" },
          select: { entryNumber: true },
        });
        const nextCogsEntry = (lastCogsEntry?.entryNumber || 0) + 1;

        await tx.journalEntry.create({
          data: {
            entryNumber: nextCogsEntry,
            date: invoice.invoiceDate,
            description: `قيد تكلفة البضاعة المباعة لفاتورة مبيعات رقم ${invoice.invoiceNumber}`,
            reference: `فاتورة بيع #${invoice.invoiceNumber}`,
            sourceType: "SALES_INVOICE",
            sourceId: invoice.id,
            items: {
              create: [
                {
                  accountId: cogsAccount.id,
                  debit: salesCogsValue,
                  credit: 0,
                  description: "تكلفة البضاعة المباعة",
                },
                {
                  accountId: inventoryAccount.id,
                  debit: 0,
                  credit: salesCogsValue,
                  description: "إخراج من مخزون البضاعة",
                },
              ],
            },
          },
        });
      }
    }

    // 3.2. إذا كانت الفاتورة كاش، نسجل سند القبض آلياً في القيد (أو قيد إضافي)
    // هنا سنقوم بعمل قيد تسوية فورية من حساب العميل إلى الخزنة/البنك لضمان توازن حساب العميل
    if (data.status === "cash") {
      let treasuryAccountId: number | null = null;
      if (data.safeId) {
        const safe = await tx.treasurySafe.findUnique({
          where: { id: data.safeId },
          select: { accountId: true },
        });
        treasuryAccountId = safe?.accountId || null;
      } else if (data.bankId) {
        const bank = await tx.treasuryBank.findUnique({
          where: { id: data.bankId },
          select: { accountId: true },
        });
        treasuryAccountId = bank?.accountId || null;
      }

      if (treasuryAccountId) {
        const lastEntryCash = await tx.journalEntry.findFirst({
          orderBy: { entryNumber: "desc" },
          select: { entryNumber: true },
        });
        const entryNumberCash = (lastEntryCash?.entryNumber || 0) + 1;

        await tx.journalEntry.create({
          data: {
            entryNumber: entryNumberCash,
            date: invoice.invoiceDate,
            description: `سداد نقدي فاتورة #${invoice.invoiceNumber} - ${invoice.customerName}`,
            sourceType: "RECEIPT_VOUCHER", // Treated as a system-generated receipt
            sourceId: invoice.id,
            items: {
              create: [
                {
                  accountId: treasuryAccountId,
                  debit: invoice.total,
                  credit: 0,
                  description: `تحصيل نقدي فاتورة #${invoice.invoiceNumber}`,
                },
                {
                  accountId: customerAccountId,
                  debit: 0,
                  credit: invoice.total,
                  description: `تسوية سداد فاتورة #${invoice.invoiceNumber}`,
                },
              ],
            },
          },
        });
      }
    }

    // 3.5 تحديث الخزنة أو البنك إذا كانت الفاتورة كاش
    if (data.status === "cash" && (data.safeId || data.bankId)) {
      if (data.safeId) {
        const updatedSafe = await tx.treasurySafe.update({
          where: { id: data.safeId },
          data: { balance: { increment: data.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedSafe.name,
          value: updatedSafe.balance,
        });
      } else if (data.bankId) {
        const updatedBank = await tx.treasuryBank.update({
          where: { id: data.bankId },
          data: { balance: { increment: data.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedBank.name,
          value: updatedBank.balance,
        });
      }
    }

    // 4. إنشاء حركات مخزون وتحديث الرصيد الحالي
    if (data.status !== "pending") {
      for (const item of data.items) {
        // فحص الرصيد الحالي قبل التخصيم
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { currentStock: true },
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
          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: actualDeduct } },
            select: { name: true, currentStock: true, minStock: true },
          });

          if (updatedProduct) {
            pendingAlerts.push({
              type: "stock",
              name: updatedProduct.name,
              value: updatedProduct.currentStock,
              limit: updatedProduct.minStock,
            });
          }
        }
      }
    }

    revalidatePath("/sales-invoices");
    revalidatePath("/inventory/stock");
    revalidatePath("/customers");
    revalidatePath("/ledger");
    revalidatePath("/ledger/coa");

    return invoice;
  });

  if (session) {
    await triggerStaffActivityAlert(
      session.user,
      "فاتورة مبيعات جديدة",
      `تم إنشاء فاتورة مبيعات #${result.invoiceNumber} للعميل ${result.customerName} بقيمة ${result.total}`,
    );
  }

  // Fire pending alerts outside transaction
  for (const alert of pendingAlerts) {
    if (alert.type === "treasury") {
      await triggerTreasuryAlert(alert.name, alert.value);
    } else if (alert.type === "stock") {
      await triggerStockAlert(alert.name, alert.value, alert.limit || 0);
    }
  }

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
      profitMargin: number;
      taxRate: number;
      discount: number;
      total: number;
      productId: number;
    }[];
    topNotes?: string[];
    notes?: string[];
    dueDate?: string;
    printableTitle?: string;
  },
) {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const canEdit = await hasPermission(session.userId, "sales_edit");
  if (!canEdit) throw new Error("ليس لديك صلاحية تعديل فواتير");

  if (!data.customerId) throw new Error("يجب اختيار العميل أولاً");
  if (data.items.length === 0) throw new Error("لا يمكن حفظ فاتورة فارغة");
  if (data.status === "cash" && !data.safeId && !data.bankId) {
    throw new Error("يجب تحديد جهة الدفع (الخزنة أو البنك) للفواتير النقدية");
  }

  // جلب الإعدادات مرة واحدة خارج المعاملة
  const settings = await getSystemSettings();
  const allowNegativeStock = settings?.inventory?.allowNegativeStock ?? false;
  const stockWarnings: string[] = [];
  const pendingAlerts: {
    type: "treasury" | "stock";
    name: string;
    value: number;
    limit?: number;
  }[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const existingInvoice = await tx.salesInvoice.findUnique({
      where: { id },
      select: {
        status: true,
        total: true,
        safeId: true,
        bankId: true,
        invoiceNumber: true,
      },
    });

    if (!existingInvoice) throw new Error("الفاتورة غير موجودة");

    if (existingInvoice.status !== data.status) {
      throw new Error(
        "لا يمكن تغيير نوع الفاتورة بعد الحفظ لحماية حركات الخزنة والبنك",
      );
    }

    if (existingInvoice.status === "cash") {
      if (
        existingInvoice.safeId !== data.safeId ||
        existingInvoice.bankId !== data.bankId
      ) {
        throw new Error(
          "لا يمكن تغيير جهة الدفع (الخزنة/البنك) بعد الحفظ لضمان سلامة العمليات المالية",
        );
      }
    }

    if (existingInvoice.invoiceNumber !== data.invoiceNumber) {
      const numberTaken = await tx.salesInvoice.findUnique({
        where: { invoiceNumber: data.invoiceNumber },
        select: { id: true },
      });
      if (numberTaken)
        throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);
    }

    // 0. عكس أثر الخزنة القديم إذا كانت كاش
    if (existingInvoice.status === "cash") {
      if (existingInvoice.safeId) {
        const updatedSafe = await tx.treasurySafe.update({
          where: { id: existingInvoice.safeId },
          data: { balance: { decrement: existingInvoice.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedSafe.name,
          value: updatedSafe.balance,
        });
      } else if (existingInvoice.bankId) {
        const updatedBank = await tx.treasuryBank.update({
          where: { id: existingInvoice.bankId },
          data: { balance: { decrement: existingInvoice.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedBank.name,
          value: updatedBank.balance,
        });
      }
    }

    // 1. عكس أثر الحركات القديمة على المخزون بالاعتماد على مجموع حركات الفاتورة السابقة
    if (existingInvoice.status !== "pending") {
      const oldMovements = await tx.stockMovement.findMany({
        where: { salesInvoiceId: id },
        select: { productId: true, quantity: true },
      });

      // تجميع الأثر حسب المنتج
      const oldImpacts: Record<number, number> = {};
      for (const mv of oldMovements) {
        oldImpacts[mv.productId] =
          (oldImpacts[mv.productId] || 0) + mv.quantity;
      }

      // عكس الأثر: إذا كان المجموع سالباً (خصم) نزيده، وإذا كان موجباً ننقصه
      for (const [pId, qty] of Object.entries(oldImpacts)) {
        if (qty !== 0) {
          await tx.product.update({
            where: { id: Number(pId) },
            data: { currentStock: { increment: -qty } },
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
      if (!product)
        throw new Error(`أحد الأصناف المختارة تم إيقاف التعامل معه`);

      const currentStock = await getCurrentStock(item.productId, tx);
      if (currentStock < item.quantity) {
        if (!allowNegativeStock) {
          throw new Error(
            `رصيد غير كافي للصنف ${product.name} — المتوفر: ${currentStock}`,
          );
        } else {
          stockWarnings.push(`${product.name} (المتوفر: ${currentStock})`);
        }
      }
    }

    // 3. تحديث الفاتورة وإنشاء الأصناف الجديدة
    const safeIdVal =
      data.status === "cash" && data.safeId ? data.safeId : null;
    const bankIdVal =
      data.status === "cash" && data.bankId ? data.bankId : null;

    const invoice = await tx.salesInvoice.update({
      where: { id },
      data: {
        invoiceNumber: data.invoiceNumber,
        customerId: data.customerId,
        customerName: data.customerName,
        status: data.status,
        subtotal: data.subtotal,
        totalTax: data.totalTax,
        discount: data.discount,
        total: data.total,
        notes: data.notes || [],
        safeId: safeIdVal,
        bankId: bankIdVal,
        printableTitle: data.printableTitle,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        items: {
          deleteMany: {},
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            profitMargin: item.profitMargin ?? 0,
            taxRate: item.taxRate,
            discount: item.discount,
            total: item.total,
            productId: item.productId,
          })),
        },
      },
      include: {
        customer: { select: { accountId: true } },
      },
    });

    // 3.6. تحديث قيد المحاسبة (حذف القديم وإنشاء جديد)
    await tx.journalEntry.deleteMany({
      where: { sourceType: "SALES_INVOICE", sourceId: id },
    });
    // أيضاً حذف أي سند قبض نظامي مرتبط بهذه الفاتورة
    await tx.journalEntry.deleteMany({
      where: {
        sourceType: "RECEIPT_VOUCHER",
        sourceId: id,
        description: { contains: `سداد نقدي فاتورة #${invoice.invoiceNumber}` },
      },
    });

    const customerAccountId = invoice.customer?.accountId;
    if (customerAccountId) {
      const salesRevenueAccount = await tx.account.findUnique({
        where: { code: "4101" },
      });
      if (salesRevenueAccount) {
        const lastEntry = await tx.journalEntry.findFirst({
          orderBy: { entryNumber: "desc" },
          select: { entryNumber: true },
        });
        const entryNumber = (lastEntry?.entryNumber || 0) + 1;

        await tx.journalEntry.create({
          data: {
            entryNumber,
            date: invoice.invoiceDate,
            description: `تعديل فاتورة مبيعات #${invoice.invoiceNumber} - ${invoice.customerName}`,
            sourceType: "SALES_INVOICE",
            sourceId: invoice.id,
            items: {
              create: [
                {
                  accountId: customerAccountId,
                  debit: invoice.total,
                  credit: 0,
                  description: `تعديل قيمة فاتورة مبيعات #${invoice.invoiceNumber}`,
                },
                {
                  accountId: salesRevenueAccount.id,
                  debit: 0,
                  credit: invoice.total,
                  description: `تعديل إيراد مبيعات فاتورة #${invoice.invoiceNumber}`,
                },
              ],
            },
          },
        });

        if (data.status === "cash") {
          let treasuryAccountId: number | null = null;
          if (data.safeId) {
            const safe = await tx.treasurySafe.findUnique({
              where: { id: data.safeId },
              select: { accountId: true },
            });
            treasuryAccountId = safe?.accountId || null;
          } else if (data.bankId) {
            const bank = await tx.treasuryBank.findUnique({
              where: { id: data.bankId },
              select: { accountId: true },
            });
            treasuryAccountId = bank?.accountId || null;
          }

          if (treasuryAccountId) {
            const lastEntryCash = await tx.journalEntry.findFirst({
              orderBy: { entryNumber: "desc" },
              select: { entryNumber: true },
            });
            const entryNumberCash = (lastEntryCash?.entryNumber || 0) + 1;

            await tx.journalEntry.create({
              data: {
                entryNumber: entryNumberCash,
                date: invoice.invoiceDate,
                description: `سداد نقدي فاتورة #${invoice.invoiceNumber} - ${invoice.customerName}`,
                sourceType: "RECEIPT_VOUCHER",
                sourceId: invoice.id,
                items: {
                  create: [
                    {
                      accountId: treasuryAccountId,
                      debit: invoice.total,
                      credit: 0,
                      description: `تحصيل نقدي فاتورة #${invoice.invoiceNumber}`,
                    },
                    {
                      accountId: customerAccountId,
                      debit: 0,
                      credit: invoice.total,
                      description: `تسوية سداد فاتورة #${invoice.invoiceNumber}`,
                    },
                  ],
                },
              },
            });
          }
        }
      }
    }

    // 3.5 تطبيق أثر الخزنة الجديد إذا كانت كاش
    if (data.status === "cash" && (data.safeId || data.bankId)) {
      if (data.safeId) {
        const updatedSafe = await tx.treasurySafe.update({
          where: { id: data.safeId },
          data: { balance: { increment: data.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedSafe.name,
          value: updatedSafe.balance,
        });
      } else if (data.bankId) {
        const updatedBank = await tx.treasuryBank.update({
          where: { id: data.bankId },
          data: { balance: { increment: data.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedBank.name,
          value: updatedBank.balance,
        });
      }
    }

    // 4. إنشاء حركات مخزون جديدة وتحديث الرصيد الحالي
    if (data.status !== "pending") {
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { currentStock: true },
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
          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: actualDeduct } },
            select: { name: true, currentStock: true, minStock: true },
          });

          if (updatedProduct) {
            pendingAlerts.push({
              type: "stock",
              name: updatedProduct.name,
              value: updatedProduct.currentStock,
              limit: updatedProduct.minStock,
            });
          }
        }
      }
    }

    revalidatePath("/sales-invoices");
    revalidatePath("/inventory/stock");
    revalidatePath("/customers");
    revalidatePath("/ledger");
    revalidatePath("/ledger/coa");

    return invoice;
  });

  // Fire pending alerts outside transaction
  for (const alert of pendingAlerts) {
    if (alert.type === "treasury") {
      await triggerTreasuryAlert(alert.name, alert.value);
    } else if (alert.type === "stock") {
      await triggerStockAlert(alert.name, alert.value, alert.limit || 0);
    }
  }

  if (session) {
    await triggerStaffActivityAlert(
      session.user,
      "تعديل فاتورة مبيعات",
      `تم تعديل فاتورة مبيعات #${data.invoiceNumber} للعميل ${data.customerName} بقيمة ${data.total}`,
    );
  }

  // Fire pending alerts outside transaction
  for (const alert of pendingAlerts) {
    if (alert.type === "treasury") {
      await triggerTreasuryAlert(alert.name, alert.value);
    } else if (alert.type === "stock") {
      await triggerStockAlert(alert.name, alert.value, alert.limit || 0);
    }
  }

  return { invoice: result, stockWarnings };
}

export async function deleteSalesInvoice(id: number) {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const canDelete = await hasPermission(session.userId, "sales_delete");
  if (!canDelete) throw new Error("ليس لديك صلاحية حذف فواتير");

  const pendingAlerts: {
    type: "treasury" | "stock";
    name: string;
    value: number;
    limit?: number;
  }[] = [];

  const result = await prisma.$transaction(async (tx) => {
    // 0. جلب بيانات الفاتورة لمعرفة حالتها וחساباتها
    const invoice = await tx.salesInvoice.findUnique({
      where: { id },
      select: {
        invoiceNumber: true,
        customerName: true,
        status: true,
        total: true,
        safeId: true,
        bankId: true,
      },
    });

    if (invoice) {
      // 1. عكس أثر المبالغ المالية إذا كانت الفاتورة كاش
      if (invoice.status === "cash") {
        if (invoice.safeId) {
          const updatedSafe = await tx.treasurySafe.update({
            where: { id: invoice.safeId },
            data: { balance: { decrement: invoice.total } },
          });
          pendingAlerts.push({
            type: "treasury",
            name: updatedSafe.name,
            value: updatedSafe.balance,
          });
        } else if (invoice.bankId) {
          const updatedBank = await tx.treasuryBank.update({
            where: { id: invoice.bankId },
            data: { balance: { decrement: invoice.total } },
          });
          pendingAlerts.push({
            type: "treasury",
            name: updatedBank.name,
            value: updatedBank.balance,
          });
        }
      }

      // 2. عكس أثر المخزون قبل الحذف
      const movements = await tx.stockMovement.findMany({
        where: { salesInvoiceId: id },
        select: { productId: true, quantity: true },
      });

      const impacts: Record<number, number> = {};
      for (const m of movements) {
        impacts[m.productId] = (impacts[m.productId] || 0) + m.quantity;
      }

      for (const [pId, qty] of Object.entries(impacts)) {
        if (qty !== 0) {
          await tx.product.update({
            where: { id: Number(pId) },
            data: { currentStock: { increment: -qty } },
          });
        }
      }
    }

    await tx.stockMovement.deleteMany({ where: { salesInvoiceId: id } });

    // 3. حذف القيود المحاسبية المرتبطة
    await tx.journalEntry.deleteMany({
      where: { sourceType: "SALES_INVOICE", sourceId: id },
    });
    // حذف أي سند قبض نظامي مرتبط بهذه الفاتورة
    await tx.journalEntry.deleteMany({
      where: {
        sourceType: "RECEIPT_VOUCHER",
        sourceId: id,
        description: { contains: `سداد نقدي فاتورة` },
      },
    });

    return await tx.salesInvoice.delete({ where: { id } });
  });

  // Fire pending alerts outside transaction
  for (const alert of pendingAlerts) {
    if (alert.type === "treasury") {
      await triggerTreasuryAlert(alert.name, alert.value);
    } else if (alert.limit !== undefined) {
      await triggerStockAlert(alert.name, alert.value, alert.limit);
    }
  }

  if (session && result) {
    await triggerStaffActivityAlert(
      session.user,
      "حذف فاتورة مبيعات",
      `تم حذف فاتورة مبيعات #${result.invoiceNumber} للعميل ${result.customerName} بقيمة ${result.total}`,
    );
  }

  revalidatePath("/sales-invoices");
  revalidatePath("/inventory/stock");
  revalidatePath("/customers");
  revalidatePath("/ledger");
  revalidatePath("/ledger/coa");
}
