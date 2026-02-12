"use server";

import { prisma } from "@/lib/prisma";

// ─── جلب كل الفواتير ────────────────────────────────────────────────────────
export async function getSalesInvoices() {
  return prisma.salesInvoice.findMany({
    orderBy: { invoiceNumber: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      customerName: true,
      invoiceDate: true,
      total: true,
      status: true,
    },
  });
}

// ─── جلب فاتورة محددة للتعديل ────────────────────────────────────────────────
export async function getSalesInvoiceById(id: number) {
  return prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });
}

// ─── الرقم التالي للفاتورة ───────────────────────────────────────────────────
export async function getNextInvoiceNumber(): Promise<number> {
  const last = await prisma.salesInvoice.findFirst({
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  return (last?.invoiceNumber ?? 0) + 1;
}

// ─── التحقق من رقم مكرر ──────────────────────────────────────────────────────
export async function checkInvoiceNumberExists(num: number): Promise<boolean> {
  const found = await prisma.salesInvoice.findUnique({
    where: { invoiceNumber: num },
    select: { id: true },
  });
  return !!found;
}

// ─── حفظ فاتورة جديدة ────────────────────────────────────────────────────────
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
  // تحقق أخير قبل الحفظ منعاً للـ race condition
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

// ─── تحديث فاتورة موجودة ─────────────────────────────────────────────────────
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
  // تحقق من عدم تكرار الرقم مع فاتورة أخرى
  const existing = await prisma.salesInvoice.findFirst({
    where: {
      invoiceNumber: data.invoiceNumber,
      NOT: { id },
    },
  });

  if (existing) {
    throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);
  }

  // حذف الأصناف القديمة وإضافة الجديدة
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

// ─── حذف فاتورة ──────────────────────────────────────────────────────────────
export async function deleteSalesInvoice(id: number) {
  return prisma.salesInvoice.delete({ where: { id } });
}