"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── توليد رقم عرض السعر التالي ───
export async function getNextQuotationCode(): Promise<string> {
  const last = await prisma.quotation.findFirst({
    orderBy: { id: "desc" },
    select: { code: true },
  });

  if (!last) return "QT-0001";

  const numPart = parseInt(last.code.replace("QT-", ""), 10);
  const next = numPart + 1;
  return `QT-${String(next).padStart(4, "0")}`;
}

// ─── جلب جميع عروض الأسعار ───
export async function getQuotations() {
  try {
    const quotations = await prisma.quotation.findMany({
      orderBy: { date: "desc" },
      include: {
        customer: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return quotations.map((q) => ({
      id: q.id,
      code: q.code,
      customerName: q.customer?.name || "عميل عام",
      customerId: q.customer?.id || null,
      customerCode: q.customer?.code || null,
      date: q.date,
      subtotal: q.subtotal,
      discount: q.discount,
      total: q.total,
      status: q.status,
      createdAt: q.createdAt,
    }));
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return [];
  }
}

// ─── جلب عرض سعر واحد مع الأصناف ───
export async function getQuotationById(id: number) {
  return prisma.quotation.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, code: true, sellPrice: true, unit: true },
          },
        },
      },
      customer: {
        select: { id: true, name: true, code: true, phone: true, address: true },
      },
    },
  });
}

// ─── إنشاء عرض سعر جديد ───
export async function createQuotation(data: {
  customerId?: number | null;
  customerName?: string | null;
  date: string;
  subtotal: number;
  totalTax: number;
  discount: number;
  total: number;
  topNotes?: string[];
  notes?: string[];
  items: {
    productId?: number | null;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount: number;
    total: number;
  }[];
}) {
  if (data.items.length === 0) throw new Error("لا يمكن حفظ عرض سعر فارغ");

  // التحقق من أن جميع المنتجات نشطة (فقط إذا كان هناك productId)
  for (const item of data.items) {
    if (item.productId) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId, isActive: true } as any,
        select: { name: true },
      });
      if (!product) throw new Error("أحد الأصناف المختارة غير متوفر أو تم إيقاف التعامل معه");
    }
  }

  const code = await getNextQuotationCode();

  const quotation = await prisma.quotation.create({
    data: {
      code,
      customerId: data.customerId || null,
      customerName: data.customerName || null,
      date: new Date(data.date),
      subtotal: data.subtotal,
      totalTax: data.totalTax,
      discount: data.discount,
      total: data.total,
      topNotes: data.topNotes || [],
      notes: data.notes || [],
      items: {
        create: data.items.map((item) => ({
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
          total: item.total,
        })),
      },
    },
  });

  revalidatePath("/sales-quotations");
  return quotation;
}

// ─── تعديل عرض سعر ───
export async function updateQuotation(
  id: number,
  data: {
    customerId?: number | null;
    customerName?: string | null;
    date: string;
    subtotal: number;
    totalTax: number;
    discount: number;
    total: number;
    topNotes?: string[];
    notes?: string[];
    items: {
      productId?: number | null;
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      discount: number;
      total: number;
    }[];
  }
) {
  if (data.items.length === 0) throw new Error("لا يمكن حفظ عرض سعر فارغ");

  // التحقق من أن جميع المنتجات نشطة (فقط إذا كان هناك productId)
  for (const item of data.items) {
    if (item.productId) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId, isActive: true } as any,
        select: { name: true },
      });
      if (!product) throw new Error("أحد الأصناف المختارة غير متوفر أو تم إيقاف التعامل معه");
    }
  }

  const quotation = await prisma.quotation.update({
    where: { id },
    data: {
      customerId: data.customerId || null,
      customerName: data.customerName || null,
      date: new Date(data.date),
      subtotal: data.subtotal,
      totalTax: data.totalTax,
      discount: data.discount,
      total: data.total,
      topNotes: data.topNotes || [],
      notes: data.notes || [],
      items: {
        deleteMany: {},
        create: data.items.map((item) => ({
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
          total: item.total,
        })),
      },
    },
  });

  revalidatePath("/sales-quotations");
  return quotation;
}

// ─── حذف عرض سعر ───
export async function deleteQuotation(id: number) {
  await prisma.quotation.delete({ where: { id } });
  revalidatePath("/sales-quotations");
}

// ─── تحديث حالة عرض السعر ───
export async function updateQuotationStatus(
  id: number,
  status: "Draft" | "Sent" | "Approved" | "Rejected"
) {
  await prisma.quotation.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/sales-quotations");
}
