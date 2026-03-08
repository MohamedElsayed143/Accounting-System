"use server";

import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/app/(dashboard)/settings/actions";

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

export async function getStockLevels(): Promise<{ rows: StockRow[]; alertsEnabled: boolean }> {
  // جلب جميع المنتجات النشطة
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  if (products.length === 0) return { rows: [], alertsEnabled: true };

  // تجميع حركات المخزون لكل منتج
  const stockGroups = await prisma.stockMovement.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    where: {
      productId: { in: products.map((p) => p.id) },
    },
  });

  // خريطة productId → الكمية
  const settings = await getSystemSettings();
  const defaultThreshold = settings?.inventory?.lowStockThreshold ?? 5;
  const alertsEnabled = settings?.inventory?.lowStockAlertEnabled ?? true;

  const qtyMap = new Map<number, number>();
  for (const g of stockGroups) {
    qtyMap.set(g.productId, g._sum.quantity ?? 0);
  }

  // حساب القيمة الإجمالية للمخزون
  const rows = products.map((p) => {
    const rawQty = qtyMap.get(p.id) ?? 0;
    const qty = Math.max(0, rawQty); // عدم السماح بظهور رصيد أقل من صفر
    let threshold = p.minStock;
    if (threshold === 0) {
      threshold = defaultThreshold;
    }
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
      isLow: qty <= threshold,
    };
  });

  return { rows, alertsEnabled };
}

export async function getStockOverview() {
  const [products, movementsCount, settings] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, buyPrice: true, minStock: true },
    }),
    prisma.stockMovement.count(),
    getSystemSettings(),
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

  const alertsEnabled = settings?.inventory?.lowStockAlertEnabled ?? true;
  const defaultThreshold = settings?.inventory?.lowStockThreshold ?? 5;

  let lowStockCount = 0;
  let totalValue = 0;
  for (const p of products) {
    const rawQty = qtyMap.get(p.id) ?? 0;
    const qty = Math.max(0, rawQty); // عدم السماح بظهور رصيد أقل من صفر
    
    let threshold = p.minStock;
    if (threshold === 0) {
      threshold = defaultThreshold;
    }

    if (alertsEnabled) {
      if (qty <= threshold) {
        lowStockCount++;
      }
    }

    if (qty > 0) totalValue += qty * p.buyPrice;
  }

  return {
    totalProducts: products.length,
    lowStockCount,
    totalValue,
    totalMovements: movementsCount,
  };
}