"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { revalidatePath } from "next/cache";
import type { Category } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

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
  const session = await getSession();
  const canView = session ? await hasPermission(session.userId, "inventory_view") : false;
  if (!canView) return [];

  return (await getTenantPrisma()).category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function createCategory(data: { name: string; imageUrl?: string }) {
  const session = await getSession();
  const canManage = session ? await hasPermission(session.userId, "inventory_view") : false;
  if (!canManage) throw new Error("ليس لديك صلاحية إضافة تصنيفات");

  if (!data.name.trim()) throw new Error("اسم التصنيف مطلوب");

  return (await getTenantPrisma()).$transaction(async (tx) => {
    const code = await generateCategoryCode(tx);
    
    const category = await tx.category.create({
      data: { 
        name: data.name.trim(), 
        code,
        imageUrl: data.imageUrl || null,
      },
    });
    
    revalidatePath("/inventory/categories");
    revalidatePath("/inventory/products");
    return category;
  });
}

export async function updateCategory(id: number, data: { name: string; imageUrl?: string }) {
  const session = await getSession();
  const canManage = session ? await hasPermission(session.userId, "inventory_view") : false;
  if (!canManage) throw new Error("ليس لديك صلاحية تعديل تصنيفات");

  if (!data.name.trim()) throw new Error("اسم التصنيف مطلوب");

  const category = await (await getTenantPrisma()).category.update({
    where: { id },
    data: { 
      name: data.name.trim(),
      imageUrl: data.imageUrl || null,
    },
  });
  revalidatePath("/inventory/categories");
  return category;
}

export async function deleteCategory(id: number) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") throw new Error("صلاحية الحذف للأدمن فقط");

  const hasProducts = await (await getTenantPrisma()).product.count({
    where: { categoryId: id, isActive: true },
  });
  if (hasProducts > 0) {
    throw new Error("لا يمكن حذف تصنيف يحتوي على أصناف نشطة");
  }
  await (await getTenantPrisma()).category.delete({ where: { id } });
  revalidatePath("/inventory/categories");
  return { success: true };
}
