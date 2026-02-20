// app/(dashboard)/purchase-invoices/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── أنواع البيانات ─────────────────────────────────────────────────────────
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
  returnsCount?: number;
  returnsTotal?: number;
  netTotal?: number;
}

// ─── جلب كل الفواتير مع عدد المرتجعات وقيمتها ─────────────────────────────
export async function getPurchaseInvoices() {
  const invoices = await prisma.purchaseInvoice.findMany({
    orderBy: { invoiceNumber: "desc" },
    include: {
      items: true,
      purchaseReturns: {
        select: { total: true }
      }
    },
  });
  
  return invoices.map(inv => {
    const returnsTotal = inv.purchaseReturns.reduce((sum, ret) => sum + ret.total, 0);
    return {
      ...inv,
      status: inv.status as "cash" | "credit" | "pending",
      returnsCount: inv.purchaseReturns.length,
      returnsTotal,
      netTotal: inv.total - returnsTotal
    };
  });
}

// ─── جلب فاتورة واحدة بواسطة المعرف (مع المرتجعات) ──────────────────────────
export async function getPurchaseInvoiceById(id: number) {
  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      items: true,
      purchaseReturns: {
        select: { total: true }
      },
    },
  });

  if (!invoice) return null;

  const returnsTotal = invoice.purchaseReturns.reduce((sum, ret) => sum + ret.total, 0);
  return {
    ...invoice,
    status: invoice.status as "cash" | "credit" | "pending",
    returnsCount: invoice.purchaseReturns.length,
    returnsTotal,
    netTotal: invoice.total - returnsTotal
  };
}

// ─── الحصول على رقم الفاتورة التالي (تلقائي) ───────────────────────────────
export async function getNextPurchaseInvoiceNumber(): Promise<number> {
  const last = await prisma.purchaseInvoice.findFirst({
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
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
  const existing = await prisma.purchaseInvoice.findFirst({
    where: {
      invoiceNumber: data.invoiceNumber,
      NOT: { id },
    },
  });

  if (existing) {
    throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);
  }

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
        create: data.items,
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
  return { success: true };
}

// ========== دوال إضافية مطلوبة لمرتجعات المشتريات ==========

// ─── جلب فاتورة معينة مع أصنافها ومرتجعاتها (لصفحة العرض) ───────────────────
export async function getPurchaseInvoiceWithReturns(id: number) {
  return prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      items: true,
      purchaseReturns: {
        include: { items: true }
      }
    }
  });
}

// ─── جلب فواتير مورد معين (للمرتجعات) ──────────────────────────────────────
export async function getPurchaseInvoicesBySupplier(supplierId: number) {
  return prisma.purchaseInvoice.findMany({
    where: { supplierId },
    orderBy: { invoiceDate: 'desc' },
    select: {
      id: true,
      invoiceNumber: true,
      supplierName: true,
      invoiceDate: true,
      total: true,
    }
  });
}