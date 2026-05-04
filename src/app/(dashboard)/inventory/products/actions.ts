// app/(dashboard)/inventory/products/actions.ts
"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { revalidatePath } from "next/cache";
import type { Product } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { SequenceService } from "@/lib/services/SequenceService";

export interface ProductData extends Product {
  category: { id: number; name: string } | null;
  currentStock: number;
  profitMargin: number;
  taxRate: number;
}

// دالة مساعدة لتوليد كود فريد للمنتج — قراءة سريعة من sequence
export async function getNextProductCode(): Promise<string> {
  const db = await getTenantPrisma();
  // استخدام findFirst مع orderBy لسرعة أكبر من upsert
  const sequence = await db.systemSequence.findUnique({
    where: { id: "Product" },
    select: { lastValue: true },
  });

  const nextNumber = (sequence?.lastValue ?? 0) + 1;
  const paddedNumber = String(nextNumber).padStart(3, '0');
  return `PRD-${paddedNumber}`;
}

// التحقق من وجود كود (للاستخدام قبل الإنشاء أو التحديث)
export async function checkProductCodeExists(code: string, excludeId?: number): Promise<boolean> {
  const existing = await (await getTenantPrisma()).product.findFirst({
    where: {
      code,
      NOT: excludeId ? { id: excludeId } : undefined,
    },
    select: { id: true },
  });
  return !!existing;
}

export async function getProducts(): Promise<ProductData[]> {
  const session = await getSession();
  if (!session) return [];

  const canView = await hasPermission(session.userId, "inventory_view");
  if (!canView) return [];

  const products = await (await getTenantPrisma()).product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return products as ProductData[];
}

export async function getProductById(id: number): Promise<ProductData | null> {
  const product = await (await getTenantPrisma()).product.findUnique({
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
  taxRate: number;
  categoryId?: number;
  imageUrl?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const canManage = await hasPermission(session.userId, "inventory_view");
  if (!canManage) throw new Error("ليس لديك صلاحية إضافة أصناف");

  if (!data.code.trim()) throw new Error("كود الصنف مطلوب");
  if (!data.name.trim()) throw new Error("اسم الصنف مطلوب");
  if (!data.unit.trim()) throw new Error("وحدة القياس مطلوبة");
  if (data.buyPrice <= 0) throw new Error("سعر الشراء يجب أن يكون أكبر من صفر");
  if (data.sellPrice <= 0) throw new Error("سعر البيع يجب أن يكون أكبر من صفر");

  return (await getTenantPrisma()).$transaction(async (tx) => {
    const exists = await tx.product.findFirst({
      where: { code: data.code.trim() },
    });
    if (exists) throw new Error(`الكود ${data.code} مستخدم مسبقاً`);

    // If it's a standard PRD-xxx code, we should probably ensure the sequence is updated
    // but the safest way is to just use the sequence in the first place.
    // For now, let's just create the product.
    // If the UI generated a code from the sequence, it's already "ahead" in the sequence's lastValue if we increment it here.
    // Wait, getNextProductCode DOES NOT increment. So we MUST increment here if we use it.

    const finalCode = data.code.trim();

    const product = await tx.product.create({
      data: {
        code: finalCode,
        name: data.name.trim(),
        unit: data.unit.trim(),
        buyPrice: data.buyPrice,
        sellPrice: data.sellPrice,
        profitMargin: data.profitMargin,
        taxRate: data.taxRate,
        minStock: 0,
        categoryId: data.categoryId || null,
        imageUrl: data.imageUrl || null,
        isActive: true,
      },
    });
    
    // Increment sequence ONLY if it was an auto-generated code
    if (finalCode.startsWith("PRD-")) {
        await SequenceService.getNextSequenceValue(tx, "Product");
    }

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
    taxRate: number;
    categoryId?: number;
    imageUrl?: string;
  }
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const canManage = await hasPermission(session.userId, "inventory_view");
  if (!canManage) throw new Error("ليس لديك صلاحية تعديل أصناف");

  if (!data.name.trim()) throw new Error("اسم الصنف مطلوب");
  if (!data.unit.trim()) throw new Error("وحدة القياس مطلوبة");
  if (data.buyPrice <= 0) throw new Error("سعر الشراء يجب أن يكون أكبر من صفر");
  if (data.sellPrice <= 0) throw new Error("سعر البيع يجب أن يكون أكبر من صفر");

  const product = await (await getTenantPrisma()).product.update({
    where: { id },
    data: {
      name: data.name.trim(),
      unit: data.unit.trim(),
      buyPrice: data.buyPrice,
      sellPrice: data.sellPrice,
      profitMargin: data.profitMargin,
      taxRate: data.taxRate,
      categoryId: data.categoryId || null,
      imageUrl: data.imageUrl || null,
    },
  });
  revalidatePath("/inventory/products");
  revalidatePath("/inventory/stock");
  return product;
}

// إيقاف التعامل (Soft Delete)
export async function deleteProduct(id: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) throw new Error("صلاحية أرشفة أو حذف الصنف هي للأدمن فقط");

  return (await getTenantPrisma()).$transaction(async (tx) => {
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
  const result = await (await getTenantPrisma()).product.findUnique({
    where: { id: productId },
    select: { currentStock: true },
  });
  return result?.currentStock ?? 0;
}

// دالة البحث عن الأصناف (للإكمال التلقائي) — محسّنة بـ select بدلاً من include كامل
export async function searchProducts(query: string, onlyInStock: boolean = false): Promise<ProductData[]> {
  const db = await getTenantPrisma();
  const products = await db.product.findMany({
    where: {
      isActive: true,
      ...(onlyInStock ? { currentStock: { gt: 0 } } : {}),
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 12,
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      unit: true,
      buyPrice: true,
      sellPrice: true,
      profitMargin: true,
      taxRate: true,
      minStock: true,
      currentStock: true,
      isActive: true,
      categoryId: true,
      createdAt: true,
      updatedAt: true,
      imageUrl: true,
      category: { select: { id: true, name: true } },
    },
  });

  return products as unknown as ProductData[];
}

// جلب أول 15 صنف بدون بحث (للتحميل المسبق عند فتح القائمة)
export async function getTopProducts(onlyInStock: boolean = false): Promise<ProductData[]> {
  const db = await getTenantPrisma();
  const products = await db.product.findMany({
    where: {
      isActive: true,
      ...(onlyInStock ? { currentStock: { gt: 0 } } : {}),
    },
    take: 15,
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      unit: true,
      buyPrice: true,
      sellPrice: true,
      profitMargin: true,
      taxRate: true,
      minStock: true,
      currentStock: true,
      isActive: true,
      categoryId: true,
      createdAt: true,
      updatedAt: true,
      imageUrl: true,
      category: { select: { id: true, name: true } },
    },
  });

  return products as unknown as ProductData[];
}

/**
 * Fetches the last selling price and profit margin for a product
 * to be used when selling items without inventory.
 */
export async function getProductPricingHistory(productId: number) {
  try {
    const product = await (await getTenantPrisma()).product.findUnique({
      where: { id: productId },
      select: { sellPrice: true, profitMargin: true },
    });

    if (!product) {
      return null;
    }

    // Attempt to find the last sales invoice item for the last selling price
    const lastSale = await (await getTenantPrisma()).salesInvoiceItem.findFirst({
      where: { productId },
      orderBy: { invoice: { invoiceDate: "desc" } },
      select: { unitPrice: true },
    });

    // Attempt to find the last purchase invoice item for the last profit margin
    const lastPurchase = await (await getTenantPrisma()).purchaseInvoiceItem.findFirst({
      where: { productId },
      orderBy: { invoice: { invoiceDate: "desc" } },
      select: { profitMargin: true },
    });

    return {
      lastSellingPrice: lastSale ? lastSale.unitPrice : product.sellPrice,
      lastProfitMargin: lastPurchase ? lastPurchase.profitMargin : product.profitMargin,
    };
  } catch (err) {
    console.error("Error fetching product pricing history:", err);
    return null;
  }
}
