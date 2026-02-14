"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── أنواع البيانات ─────────────────────────────────────────────────────────
// نستخدم الأنواع المولدة من Prisma مباشرة أو نعرف واجهات متوافقة
export interface PurchaseInvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

export interface PurchaseInvoice {
  id: number;
  invoiceNumber: number;
  supplierName: string;
  supplierId: number;
  invoiceDate: Date | string;
  subtotal: number;
  totalTax: number;
  total: number;
  status: "cash" | "credit" | "pending";
  items: PurchaseInvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── جلب كل الفواتير ────────────────────────────────────────────────────────
export async function getPurchaseInvoices() {
  const invoices = await prisma.purchaseInvoice.findMany({
    orderBy: { invoiceNumber: "desc" },
    include: {
      items: true,
    },
  });
  
  // تحويل البيانات لتتوافق مع الواجهة (Prisma Date -> string/Date)
  return invoices.map(inv => ({
    ...inv,
    status: inv.status as "cash" | "credit" | "pending"
  }));
}

// ─── جلب فاتورة واحدة بواسطة المعرف ──────────────────────────────────────────
export async function getPurchaseInvoiceById(id: number) {
  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!invoice) return null;

  return {
    ...invoice,
    status: invoice.status as "cash" | "credit" | "pending"
  };
}

// ─── الحصول على رقم الفاتورة التالي (تلقائي) ───────────────────────────────
export async function getNextPurchaseInvoiceNumber(): Promise<number> {
  const last = await prisma.purchaseInvoice.findFirst({
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  // يبدأ من 1 إذا لم توجد فواتير
  return (last?.invoiceNumber ?? 0) + 1;
}

// ─── التحقق من وجود رقم الفاتورة ───────────────────────────────────────────
export async function checkPurchaseInvoiceNumberExists(invoiceNumber: number): Promise<boolean> {
  const found = await prisma.purchaseInvoice.findUnique({
    where: { invoiceNumber },
    select: { id: true },
  });
  return !!found;
}

// ─── إنشاء فاتورة جديدة ────────────────────────────────────────────────────
export async function createPurchaseInvoice(data: {
  invoiceNumber: number;
  supplierId: number;
  supplierName: string;
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
  // تحقق أخير قبل الحفظ
  const taken = await checkPurchaseInvoiceNumberExists(data.invoiceNumber);
  if (taken) {
    throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);
  }

  const newInvoice = await prisma.purchaseInvoice.create({
    data: {
      invoiceNumber: data.invoiceNumber,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      invoiceDate: new Date(data.invoiceDate),
      subtotal: data.subtotal,
      totalTax: data.totalTax,
      total: data.total,
      status: data.status,
      items: {
        create: data.items,
      },
    },
    include: { items: true },
  });

  revalidatePath("/purchase-invoices");
  return newInvoice;
}

// ─── تحديث فاتورة موجودة ──────────────────────────────────────────────────
export async function updatePurchaseInvoice(
  id: number,
  data: {
    invoiceNumber: number;
    supplierId: number;
    supplierName: string;
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
  const existing = await prisma.purchaseInvoice.findFirst({
    where: {
      invoiceNumber: data.invoiceNumber,
      NOT: { id },
    },
  });

  if (existing) {
    throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);
  }

  // حذف الأصناف القديمة وإضافة الجديدة (استبدال كامل للأصناف لتسهيل التحديث)
  await prisma.purchaseInvoiceItem.deleteMany({
    where: { invoiceId: id },
  });

  const updatedInvoice = await prisma.purchaseInvoice.update({
    where: { id },
    data: {
      invoiceNumber: data.invoiceNumber,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      invoiceDate: new Date(data.invoiceDate),
      subtotal: data.subtotal,
      totalTax: data.totalTax,
      total: data.total,
      status: data.status,
      items: {
        create: data.items, // إنشاء الأصناف الجديدة
      },
    },
    include: { items: true },
  });

  revalidatePath("/purchase-invoices");
  return updatedInvoice;
}

// ─── حذف فاتورة ────────────────────────────────────────────────────────────
export async function deletePurchaseInvoice(id: number) {
  await prisma.purchaseInvoice.delete({
    where: { id },
  });
  revalidatePath("/purchase-invoices");
}
