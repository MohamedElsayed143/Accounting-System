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
  sellingPrice: number;
  profitMargin: number;
  taxRate: number;
  
  discount: number;
  total: number;
  productId?: number | null;
}

export interface PurchaseInvoice {
  id: number;
  invoiceNumber: number;
  supplierName: string;
  supplierId: number;
  invoiceDate: Date | string;
  subtotal: number;
  totalTax: number;
  discount: number;
  total: number;
  status: "cash" | "credit" | "pending";
  items: PurchaseInvoiceItem[];
  topNotes?: string[];
  notes?: string[];
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
      supplier: true,
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

// ─── إنشاء فاتورة جديدة (مع حركات المخزون) ─────────────────────────────────
export async function createPurchaseInvoice(data: {
  invoiceNumber: number;
  supplierId: number;
  supplierName: string;
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
    sellingPrice: number;
    profitMargin: number;
    taxRate: number;
    discount: number;
    total: number;
    productId: number;
  }[];
  topNotes?: string[];
  notes?: string[];
}) {
  if (!data.supplierId) throw new Error("يجب اختيار المورد أولاً");
  if (data.items.length === 0) throw new Error("لا يمكن حفظ فاتورة فارغة");

  return prisma.$transaction(async (tx) => {
    // 1. التحقق من رقم الفاتورة
    const taken = await tx.purchaseInvoice.findUnique({
      where: { invoiceNumber: data.invoiceNumber },
      select: { id: true },
    });
    if (taken) throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);

    // 2. التحقق من الأصناف (يجب أن تكون نشطة)
    for (const item of data.items) {
      const exists = await tx.product.findUnique({
        where: { id: item.productId, isActive: true },
        select: { name: true }
      });
      if (!exists) throw new Error(`أحد الأصناف المختارة غير متوفر أو تم إيقاف التعامل معه`);
    }

    // 3. إنشاء الفاتورة
    const invoice = await tx.purchaseInvoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
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
            sellingPrice: item.sellingPrice,
            profitMargin: item.profitMargin,
            taxRate: item.taxRate,
            discount: item.discount,
            total: item.total,
            productId: item.productId,
          })),
        },
      },
    });

    // 4. إنشاء حركات مخزون وتحديث الرصيد الحالي (شراء = دخول +) وتحديث أسعار المنتج
    for (const item of data.items) {
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: "PURCHASE",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          reference: `فاتورة شراء #${data.invoiceNumber}`,
          purchaseInvoiceId: invoice.id,
        },
      });

      // تحديث الرصيد في بطاقة الصنف وتحديث الأسعار
      await tx.product.update({
        where: { id: item.productId },
        data: { 
          currentStock: { increment: item.quantity },
          buyPrice: item.unitPrice,
          sellPrice: item.sellingPrice,
          profitMargin: item.profitMargin
        }
      });
    }

    return invoice;
  });
}

// ─── تحديث فاتورة موجودة (مع تحديث حركات المخزون) ────────────────────────
export async function updatePurchaseInvoice(
  id: number,
  data: {
    invoiceNumber: number;
    supplierId: number;
    supplierName: string;
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
      sellingPrice: number;
      profitMargin: number;
      taxRate: number;
      discount: number;
      total: number;
      productId: number;
    }[];
    topNotes?: string[];
    notes?: string[];
  }
) {
  if (!data.supplierId) throw new Error("يجب اختيار المورد أولاً");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.purchaseInvoice.findFirst({
      where: { invoiceNumber: data.invoiceNumber, NOT: { id } },
    });
    if (existing) throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);

    // 1. استرجاع الكميات القديمة لتعديل الرصيد
    const oldItems = await tx.purchaseInvoiceItem.findMany({
      where: { invoiceId: id },
      select: { productId: true, quantity: true }
    });

    for (const oldItem of oldItems) {
      if (oldItem.productId) {
        await tx.product.update({
          where: { id: oldItem.productId },
          data: { currentStock: { decrement: oldItem.quantity } }
        });
      }
    }

    // 2. حذف الأصناف القديمة وحركات المخزون
    await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId: id } });
    await tx.stockMovement.deleteMany({ where: { purchaseInvoiceId: id } });

    // 3. التحقق من الأصناف
    for (const item of data.items) {
      const exists = await tx.product.findUnique({
        where: { id: item.productId, isActive: true },
        select: { id: true }
      });
      if (!exists) throw new Error(`أحد الأصناف المختارة تم إيقاف التعامل معه`);
    }

    const invoice = await tx.purchaseInvoice.update({
      where: { id },
      data: {
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
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
            sellingPrice: item.sellingPrice,
            profitMargin: item.profitMargin,
            taxRate: item.taxRate,
            discount: item.discount,
            total: item.total,
            productId: item.productId,
          })),
        },
      },
    });

    for (const item of data.items) {
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: "PURCHASE",
          quantity: item.quantity, 
          unitPrice: item.unitPrice,
          reference: `فاتورة شراء #${data.invoiceNumber}`,
          purchaseInvoiceId: invoice.id,
        },
      });

      // تحديث الرصيد الجديد والأسعار
      await tx.product.update({
        where: { id: item.productId },
        data: { 
          currentStock: { increment: item.quantity },
          buyPrice: item.unitPrice,
          sellPrice: item.sellingPrice,
          profitMargin: item.profitMargin
        }
      });
    }

    return invoice;
  });
}

// ─── حذف فاتورة (مع حذف حركات المخزون المرتبطة) ─────────────────────────
export async function deletePurchaseInvoice(id: number) {
  await prisma.$transaction(async (tx) => {
    // تعديل الرصيد قبل الحذف
    const items = await tx.purchaseInvoiceItem.findMany({
      where: { invoiceId: id },
      select: { productId: true, quantity: true }
    });

    for (const item of items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } }
        });
      }
    }

    await tx.stockMovement.deleteMany({ where: { purchaseInvoiceId: id } });
    await tx.purchaseInvoice.delete({ where: { id } });
  });
}

// ─── جلب فاتورة معينة مع أصنافها ومرتجعاتها (لصفحة العرض) ───────────────────
export async function getPurchaseInvoiceWithReturns(id: number) {
  return prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      items: true,
      supplier: true,
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
