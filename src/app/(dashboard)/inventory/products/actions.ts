// app/(dashboard)/inventory/products/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Product } from "@prisma/client";

export interface ProductData extends Product {
  category: { id: number; name: string } | null;
  currentStock: number;
  profitMargin: number;
}

// دالة مساعدة لتوليد كود فريد للمنتج
export async function getNextProductCode(): Promise<string> {
  const products = await prisma.product.findMany({
    where: { code: { startsWith: 'PRD-' } },
    select: { code: true },
  });

  let maxNumber = 0;
  for (const p of products) {
    const match = p.code.match(/PRD-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  }

  const nextNumber = maxNumber + 1;
  const paddedNumber = String(nextNumber).padStart(3, '0');
  return `PRD-${paddedNumber}`;
}

// التحقق من وجود كود (للاستخدام قبل الإنشاء أو التحديث)
export async function checkProductCodeExists(code: string, excludeId?: number): Promise<boolean> {
  const existing = await prisma.product.findFirst({
    where: {
      code,
      NOT: excludeId ? { id: excludeId } : undefined,
    },
    select: { id: true },
  });
  return !!existing;
}

export async function getProducts(): Promise<ProductData[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return products as ProductData[];
}

export async function getProductById(id: number): Promise<ProductData | null> {
  const product = await prisma.product.findUnique({
    where: { id, isActive: true },
    include: {
      category: { select: { id: true, name: true } },
    },
  });
  return product as ProductData | null;
}

export async function createProduct(data: {
  code: string;
  name: string;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  profitMargin: number;
  categoryId?: number;
}) {
  if (!data.code.trim()) throw new Error("كود الصنف مطلوب");
  if (!data.name.trim()) throw new Error("اسم الصنف مطلوب");
  if (!data.unit.trim()) throw new Error("وحدة القياس مطلوبة");
  if (data.buyPrice <= 0) throw new Error("سعر الشراء يجب أن يكون أكبر من صفر");
  if (data.sellPrice <= 0) throw new Error("سعر البيع يجب أن يكون أكبر من صفر");

  return prisma.$transaction(async (tx) => {
    const exists = await tx.product.findFirst({
      where: { code: data.code.trim() },
    });
    if (exists) throw new Error(`الكود ${data.code} مستخدم مسبقاً`);

    const product = await tx.product.create({
      data: {
        code: data.code.trim(),
        name: data.name.trim(),
        unit: data.unit.trim(),
        buyPrice: data.buyPrice,
        sellPrice: data.sellPrice,
        profitMargin: data.profitMargin,
        minStock: 0,
        categoryId: data.categoryId || null,
        isActive: true,
      },
    });
    revalidatePath("/inventory/products");
    revalidatePath("/inventory/stock");
    return product;
  });
}

export async function updateProduct(
  id: number,
  data: {
    name: string;
    unit: string;
    buyPrice: number;
    sellPrice: number;
    profitMargin: number;
    categoryId?: number;
  }
) {
  if (!data.name.trim()) throw new Error("اسم الصنف مطلوب");
  if (!data.unit.trim()) throw new Error("وحدة القياس مطلوبة");
  if (data.buyPrice <= 0) throw new Error("سعر الشراء يجب أن يكون أكبر من صفر");
  if (data.sellPrice <= 0) throw new Error("سعر البيع يجب أن يكون أكبر من صفر");

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: data.name.trim(),
      unit: data.unit.trim(),
      buyPrice: data.buyPrice,
      sellPrice: data.sellPrice,
      profitMargin: data.profitMargin,
      categoryId: data.categoryId || null,
    },
  });
  revalidatePath("/inventory/products");
  revalidatePath("/inventory/stock");
  return product;
}

// إيقاف التعامل (Soft Delete)
export async function deleteProduct(id: number) {
  return prisma.$transaction(async (tx) => {
    // 1. فحص الرصيد الحالي
    const stockAgg = await tx.stockMovement.aggregate({
      where: { productId: id },
      _sum: { quantity: true },
    });
    const currentStock = stockAgg._sum.quantity ?? 0;

    if (currentStock > 0) {
      throw new Error("لا يمكن إيقاف الصنف لوجود رصيد بالمخزون");
    }

    // 2. تحديث الحالة
    await tx.product.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/inventory/products");
    revalidatePath("/inventory/stock");
    return { success: true };
  });
}

export async function getProductCurrentStock(productId: number): Promise<number> {
  const result = await prisma.product.findUnique({
    where: { id: productId },
    select: { currentStock: true },
  });
  return result?.currentStock ?? 0;
}

// دالة البحث عن الأصناف (للكمال التلقائي)
export async function searchProducts(query: string, onlyInStock: boolean = false): Promise<ProductData[]> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(onlyInStock ? { currentStock: { gt: 0 } } : {}),
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 10,
    orderBy: { name: "asc" },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return products as ProductData[];
}
