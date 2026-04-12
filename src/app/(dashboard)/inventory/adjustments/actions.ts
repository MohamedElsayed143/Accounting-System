"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { revalidatePath } from "next/cache";
import { MovementType } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// حساب المخزون الحالي لمنتج في مستودع معين (اختياري)
export async function getCurrentStock(
  productId: number,
  warehouseId?: number,
): Promise<number> {
  if (!warehouseId) {
    const product = await (await getTenantPrisma()).product.findUnique({
      where: { id: productId },
      select: { currentStock: true },
    });
    return product?.currentStock ?? 0;
  }
  const result = await (await getTenantPrisma()).stockMovement.aggregate({
    where: {
      productId,
      warehouseId,
    },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

export async function reconcileInventoryLedger() {
  const inventoryAccount = await (await getTenantPrisma()).account.findUnique({
    where: { code: "120301" },
  });
  if (!inventoryAccount) {
    throw new Error("حساب مخزون البضاعة 120301 غير موجود");
  }

  const journalTotals = await (await getTenantPrisma()).journalItem.aggregate({
    where: { accountId: inventoryAccount.id },
    _sum: {
      debit: true,
      credit: true,
    },
  });

  const ledgerBalance =
    (journalTotals._sum.debit ?? 0) - (journalTotals._sum.credit ?? 0);
  const products = await (await getTenantPrisma()).product.findMany({
    select: { currentStock: true, buyPrice: true },
  });
  const physicalStockValue = products.reduce(
    (sum, product) => sum + product.currentStock * product.buyPrice,
    0,
  );
  const discrepancy = ledgerBalance - physicalStockValue;

  return {
    inventoryAccountId: inventoryAccount.id,
    inventoryAccountCode: inventoryAccount.code,
    ledgerBalance,
    physicalStockValue,
    discrepancy,
    balanced: Math.abs(discrepancy) < 0.01,
    productCount: products.length,
  };
}

// إنشاء حركة تسوية للمخزون
export async function createAdjustment(data: {
  productId: number;
  newQty: number; // الكمية الجديدة المطلوبة
  notes?: string;
  warehouseId?: number; // المستودع (إذا كان متعدد المستودعات)
}) {
  const session = await getSession();
  const canManage = session
    ? await hasPermission(session.userId, "inventory_view")
    : false;
  if (!canManage) throw new Error("ليس لديك صلاحية إجراء تسوية للمخزون");

  // التحقق من وجود المنتج
  const product = await (await getTenantPrisma()).product.findUnique({
    where: { id: data.productId, isActive: true },
    select: { id: true, name: true, buyPrice: true },
  });
  if (!product) throw new Error("الصنف غير موجود");

  if (data.newQty < 0)
    throw new Error("الكمية الجديدة يجب أن تكون أكبر من أو تساوي صفر");

  // حساب المخزون الحالي في المستودع المحدد
  const currentStock = await getCurrentStock(data.productId, data.warehouseId);
  const diff = data.newQty - currentStock;

  await (await getTenantPrisma()).$transaction(async (tx) => {
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
      data: { currentStock: { increment: diff } },
    });

    // إنشاء قيد محاسبي إذا كانت التسوية بالنقص (تالف أو عجز)
    if (diff < 0) {
      const amount = Math.abs(diff) * product.buyPrice;
      if (amount > 0) {
        const damageAccount = await tx.account.findUnique({
          where: { code: "620401" },
        });
        const inventoryAccount = await tx.account.findUnique({
          where: { code: "120301" },
        });

        if (damageAccount && inventoryAccount) {
          const lastEntry = await tx.journalEntry.findFirst({
            orderBy: { entryNumber: "desc" },
            select: { entryNumber: true },
          });
          const nextEntryNumber = (lastEntry?.entryNumber || 0) + 1;

          await tx.journalEntry.create({
            data: {
              entryNumber: nextEntryNumber,
              date: new Date(),
              description: `تسوية مخزنية بالنقص للصنف: ${product.name}`,
              reference: movement.reference,
              sourceType: "MANUAL",
              createdById: session?.userId,
              items: {
                create: [
                  {
                    accountId: damageAccount.id,
                    debit: amount,
                    credit: 0,
                    description: "عجز مخزني/تالف",
                  },
                  {
                    accountId: inventoryAccount.id,
                    debit: 0,
                    credit: amount,
                    description: "نقص في المخزون",
                  },
                ],
              },
            },
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
