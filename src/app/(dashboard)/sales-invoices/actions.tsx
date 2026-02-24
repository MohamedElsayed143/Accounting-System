// app/(dashboard)/sales-invoices/actions.tsx
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
      items: true,
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
  if (!data.customerId) throw new Error("يجب اختيار العميل أولاً");
  if (data.items.length === 0) throw new Error("لا يمكن حفظ فاتورة فارغة");

  return prisma.$transaction(async (tx) => {
    // 1. التحقق من رقم الفاتورة
    const taken = await tx.salesInvoice.findUnique({
      where: { invoiceNumber: data.invoiceNumber },
      select: { id: true },
    });
    if (taken) throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);

    // 2. التحقق من الأصناف (يجب أن تكون نشطة) وفحص المخزون
    for (const item of data.items) {
      if (!item.productId) {
        throw new Error("يجب اختيار منتج لكل صنف");
      }
      const product = await tx.product.findUnique({
        where: { id: item.productId, isActive: true },
        select: { name: true, id: true },
      });
      if (!product) throw new Error(`الصنف المختار غير متوفر أو تم إيقاف التعامل معه`);

      // حساب الرصيد الحالي
      const currentStock = await getCurrentStock(item.productId, tx);
      if (currentStock < item.quantity) {
        throw new Error(`لا يوجد رصيد كافي للصنف ${product.name} — المتوفر: ${currentStock}`);
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

    // 4. إنشاء حركات مخزون
    for (const item of data.items) {
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
    }

    revalidatePath("/sales-invoices");
    revalidatePath("/inventory/stock");

    return invoice;
  });
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
  if (!data.customerId) throw new Error("يجب اختيار العميل أولاً");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.salesInvoice.findFirst({
      where: { invoiceNumber: data.invoiceNumber, NOT: { id } },
    });
    if (existing) throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);

    // 1. حذف الأصناف القديمة وحركات المخزون
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
        throw new Error(`رصيد غير كافي للصنف ${product.name} — المتوفر: ${currentStock}`);
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

    // 4. إنشاء حركات مخزون جديدة
    for (const item of data.items) {
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
    }

    revalidatePath("/sales-invoices");
    revalidatePath("/inventory/stock");

    return invoice;
  });
}

export async function deleteSalesInvoice(id: number) {
  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.deleteMany({ where: { salesInvoiceId: id } });
    await tx.salesInvoice.delete({ where: { id } });
  });

  revalidatePath("/sales-invoices");
  revalidatePath("/inventory/stock");
}