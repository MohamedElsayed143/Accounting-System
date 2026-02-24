"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MovementType } from "@prisma/client";

// حساب المخزون الحالي لمنتج في مستودع معين (اختياري)
export async function getCurrentStock(productId: number, warehouseId?: number): Promise<number> {
  if (!warehouseId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { currentStock: true }
    });
    return product?.currentStock ?? 0;
  }
  const result = await prisma.stockMovement.aggregate({
    where: {
      productId,
      warehouseId,
    },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

// إنشاء حركة تسوية للمخزون
export async function createAdjustment(data: {
  productId: number;
  newQty: number;        // الكمية الجديدة المطلوبة
  notes?: string;
  warehouseId?: number;  // المستودع (إذا كان متعدد المستودعات)
}) {
  // التحقق من وجود المنتج
  const product = await prisma.product.findUnique({
    where: { id: data.productId, isActive: true },
    select: { id: true, name: true, buyPrice: true },
  });
  if (!product) throw new Error("الصنف غير موجود");

  if (data.newQty < 0) throw new Error("الكمية الجديدة يجب أن تكون أكبر من أو تساوي صفر");

  // حساب المخزون الحالي في المستودع المحدد
  const currentStock = await getCurrentStock(data.productId, data.warehouseId);
  const diff = data.newQty - currentStock;

  await prisma.$transaction(async (tx) => {
    // تسجيل الحركة
    await tx.stockMovement.create({
      data: {
        productId: data.productId,
        movementType: MovementType.ADJUSTMENT,
        quantity: diff,
        unitPrice: product.buyPrice,
        notes: data.notes?.trim() || null,
        warehouseId: data.warehouseId || null,
        reference: `تسوية-${Date.now()}`,
      },
    });

    // تحديث الرصيد الحالي
    await tx.product.update({
      where: { id: data.productId },
      data: { currentStock: { increment: diff } }
    });
  });

  revalidatePath("/inventory/stock");
  revalidatePath("/inventory/movements");
  revalidatePath("/inventory/adjustments");

  return { success: true, diff, newStock: data.newQty };
}