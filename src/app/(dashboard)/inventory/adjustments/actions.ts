"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MovementType } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

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
  const session = await getSession();
  const canManage = session ? await hasPermission(session.userId, "inventory_view") : false;
  if (!canManage) throw new Error("ليس لديك صلاحية إجراء تسوية للمخزون");

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
    const movement = await tx.stockMovement.create({
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

    // إنشاء قيد محاسبي إذا كانت التسوية بالنقص (تالف أو عجز)
    if (diff < 0) {
      const amount = Math.abs(diff) * product.buyPrice;
      if (amount > 0) {
        const damageAccount = await tx.account.findUnique({ where: { code: '620401' } });
        const inventoryAccount = await tx.account.findUnique({ where: { code: '120301' } });

        if (damageAccount && inventoryAccount) {
          const lastEntry = await tx.journalEntry.findFirst({
            orderBy: { entryNumber: 'desc' },
            select: { entryNumber: true },
          });
          const nextEntryNumber = (lastEntry?.entryNumber || 0) + 1;

          await tx.journalEntry.create({
            data: {
              entryNumber: nextEntryNumber,
              date: new Date(),
              description: `تسوية مخزنية بالنقص للصنف: ${product.name}`,
              reference: movement.reference,
              sourceType: 'MANUAL',
              createdById: session?.userId,
              items: {
                create: [
                  { accountId: damageAccount.id, debit: amount, credit: 0, description: "عجز مخزني/تالف" },
                  { accountId: inventoryAccount.id, debit: 0, credit: amount, description: "نقص في المخزون" }
                ]
              }
            }
          });
        }
      }
    }
  });

  revalidatePath("/inventory/stock");
  revalidatePath("/inventory/movements");
  revalidatePath("/inventory/adjustments");

  return { success: true, diff, newStock: data.newQty };
}