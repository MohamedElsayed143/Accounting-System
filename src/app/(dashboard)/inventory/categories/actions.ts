"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Category } from "@prisma/client";

export interface CategoryData extends Category {
  _count?: { products: number };
}

// دالة توليد كود التصنيف (CAT-001, CAT-002, ...)
async function generateCategoryCode(tx: any): Promise<string> {
  const lastCategory = await tx.category.findFirst({
    where: { code: { startsWith: 'CAT-' } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  let nextNumber = 1;
  if (lastCategory && lastCategory.code) {
    const match = lastCategory.code.match(/CAT-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const paddedNumber = String(nextNumber).padStart(3, '0');
  return `CAT-${paddedNumber}`;
}

export async function getCategories(): Promise<CategoryData[]> {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function createCategory(data: { name: string }) {
  if (!data.name.trim()) throw new Error("اسم التصنيف مطلوب");

  return prisma.$transaction(async (tx) => {
    const code = await generateCategoryCode(tx);
    
    const category = await tx.category.create({
      data: { 
        name: data.name.trim(), 
        code 
      },
    });
    
    revalidatePath("/inventory/categories");
    revalidatePath("/inventory/products");
    return category;
  });
}

export async function updateCategory(id: number, data: { name: string }) {
  if (!data.name.trim()) throw new Error("اسم التصنيف مطلوب");

  const category = await prisma.category.update({
    where: { id },
    data: { name: data.name.trim() },
  });
  revalidatePath("/inventory/categories");
  return category;
}

export async function deleteCategory(id: number) {
  const hasProducts = await prisma.product.count({
    where: { categoryId: id, isActive: true },
  });
  if (hasProducts > 0) {
    throw new Error("لا يمكن حذف تصنيف يحتوي على أصناف نشطة");
  }
  await prisma.category.delete({ where: { id } });
  revalidatePath("/inventory/categories");
  return { success: true };
}
