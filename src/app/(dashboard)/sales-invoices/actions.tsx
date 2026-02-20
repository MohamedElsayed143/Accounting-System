"use server";

import { prisma } from "@/lib/prisma";

// ─── جلب كل الفواتير مع عدد المرتجعات وقيمتها ─────────────────────────────
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
        returnsTotal: returnsTotal,
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

// ─── جلب فاتورة معينة مع المرتجعات (لصفحة العرض) ───────────────────────────
export async function getSalesInvoiceWithReturns(id: number) {
  return prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      items: true,
      salesReturns: {
        include: { items: true }
      }
    }
  });
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
  total: number;
  status: "cash" | "credit" | "pending";
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }[];
}) {
  const taken = await checkInvoiceNumberExists(data.invoiceNumber);
  if (taken) {
    throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);
  }

  return prisma.salesInvoice.create({
    data: {
      invoiceNumber: data.invoiceNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      invoiceDate: new Date(data.invoiceDate),
      subtotal: data.subtotal,
      totalTax: data.totalTax,
      total: data.total,
      status: data.status,
      items: {
        create: data.items,
      },
    },
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
    total: number;
    status: "cash" | "credit" | "pending";
    items: {
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      total: number;
    }[];
  }
) {
  const existing = await prisma.salesInvoice.findFirst({
    where: {
      invoiceNumber: data.invoiceNumber,
      NOT: { id },
    },
  });

  if (existing) {
    throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);
  }

  await prisma.salesInvoiceItem.deleteMany({
    where: { invoiceId: id },
  });

  return prisma.salesInvoice.update({
    where: { id },
    data: {
      invoiceNumber: data.invoiceNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      invoiceDate: new Date(data.invoiceDate),
      subtotal: data.subtotal,
      totalTax: data.totalTax,
      total: data.total,
      status: data.status,
      items: {
        create: data.items,
      },
    },
  });
}

export async function deleteSalesInvoice(id: number) {
  return prisma.salesInvoice.delete({ where: { id } });
}