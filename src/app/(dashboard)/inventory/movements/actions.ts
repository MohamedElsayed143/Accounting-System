"use server";

import { prisma } from "@/lib/prisma";
import type { StockMovement } from "@prisma/client";

export interface MovementRow {
  id: number;
  productId: number;
  productName: string;
  productCode: string;
  movementType: string;
  quantity: number;
  unitPrice: number;
  reference: string | null;
  notes: string | null;
  warehouseId: number | null;
  createdAt: Date;
}

export async function getMovements(): Promise<MovementRow[]> {
  const movements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      product: { select: { name: true, code: true } },
    },
  });

  return movements.map((m) => ({
    id: m.id,
    productId: m.productId,
    productName: m.product.name,
    productCode: m.product.code,
    movementType: m.movementType,
    quantity: m.quantity,
    unitPrice: m.unitPrice,
    reference: m.reference,
    notes: m.notes,
    warehouseId: m.warehouseId,
    createdAt: m.createdAt,
  }));
}

export async function getMovementsByProduct(productId: number): Promise<MovementRow[]> {
  const movements = await prisma.stockMovement.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { name: true, code: true } },
    },
  });

  return movements.map((m) => ({
    id: m.id,
    productId: m.productId,
    productName: m.product.name,
    productCode: m.product.code,
    movementType: m.movementType,
    quantity: m.quantity,
    unitPrice: m.unitPrice,
    reference: m.reference,
    notes: m.notes,
    warehouseId: m.warehouseId,
    createdAt: m.createdAt,
  }));
}