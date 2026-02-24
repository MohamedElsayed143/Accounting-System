"use server";

import { prisma } from "@/lib/prisma";

export interface StockRow {
  productId: number;
  code: string;
  name: string;
  unit: string | null;
  category: string | null;
  qty: number;
  buyPrice: number;
  sellPrice: number;
  minStock: number;
  totalValue: number;
  isLow: boolean;
}

export async function getStockLevels(): Promise<StockRow[]> {
  // جلب جميع المنتجات النشطة
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  if (products.length === 0) return [];

  // تجميع حركات المخزون لكل منتج
  const stockGroups = await prisma.stockMovement.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    where: {
      productId: { in: products.map((p) => p.id) },
    },
  });

  // إنشاء خريطة productId → الكمية
  const qtyMap = new Map<number, number>();
  for (const g of stockGroups) {
    qtyMap.set(g.productId, g._sum.quantity ?? 0);
  }

  // حساب القيمة الإجمالية للمخزون
  return products.map((p) => {
    const qty = qtyMap.get(p.id) ?? 0;
    return {
      productId: p.id,
      code: p.code,
      name: p.name,
      unit: p.unit,
      category: p.category?.name ?? null,
      qty,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
      minStock: p.minStock,
      totalValue: qty > 0 ? qty * p.buyPrice : 0,
      isLow: qty <= p.minStock,
    };
  });
}

export async function getStockOverview() {
  const [products, movementsCount] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, buyPrice: true, minStock: true },
    }),
    prisma.stockMovement.count(),
  ]);

  if (products.length === 0) {
    return { totalProducts: 0, lowStockCount: 0, totalValue: 0, totalMovements: movementsCount };
  }

  const stockGroups = await prisma.stockMovement.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    where: { productId: { in: products.map((p) => p.id) } },
  });

  const qtyMap = new Map<number, number>();
  for (const g of stockGroups) {
    qtyMap.set(g.productId, g._sum.quantity ?? 0);
  }

  let lowStockCount = 0;
  let totalValue = 0;
  for (const p of products) {
    const qty = qtyMap.get(p.id) ?? 0;
    if (qty <= p.minStock) lowStockCount++;
    if (qty > 0) totalValue += qty * p.buyPrice;
  }

  return {
    totalProducts: products.length,
    lowStockCount,
    totalValue,
    totalMovements: movementsCount,
  };
}