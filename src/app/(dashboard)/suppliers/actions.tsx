"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// جلب كل الموردين مع أرصدتهم
export async function getSuppliers() {
  const suppliers = await prisma.supplier.findMany({
    include: {
      invoices: { select: { total: true } },
      paymentVouchers: { select: { amount: true } },
      purchaseReturns: { select: { total: true } },
    },
    orderBy: { code: "asc" },
  });

  return suppliers.map((supplier) => {
    const totalInvoices = supplier.invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPayments = supplier.paymentVouchers.reduce((sum, pay) => sum + pay.amount, 0);
    const totalReturns = supplier.purchaseReturns.reduce((sum, ret) => sum + ret.total, 0);

    return {
      id: supplier.id,
      name: supplier.name,
      code: supplier.code,
      phone: supplier.phone,
      address: supplier.address,
      category: supplier.category,
      balance: totalInvoices - totalPayments - totalReturns,
    };
  });
}

// إضافة أو تعديل مورد
export async function saveSupplier(data: {
  id?: number;
  name: string;
  code: number;
  phone: string;
  address: string;
  category: string;
}) {
  // ✅ فحص إذا كان الكود مستخدماً من قبل مورد آخر
  let existingSupplier;

  if (data.id) {
    // تعديل → تجاهل المورد الحالي
    existingSupplier = await prisma.supplier.findFirst({
      where: {
        code: data.code,
        NOT: { id: data.id },
      },
    });
  } else {
    // إضافة جديد
    existingSupplier = await prisma.supplier.findFirst({
      where: {
        code: data.code,
      },
    });
  }

  if (existingSupplier) {
    throw new Error("❌ كود المورد هذا مستخدم مسبقاً، يرجى اختيار كود آخر.");
  }

  if (data.id) {
    // تعديل
    await prisma.supplier.update({
      where: { id: data.id },
      data: {
        name: data.name,
        code: data.code,
        phone: data.phone,
        address: data.address,
        category: data.category,
      },
    });
  } else {
    // إضافة جديد
    await prisma.supplier.create({
      data: {
        name: data.name,
        code: data.code,
        phone: data.phone,
        address: data.address,
        category: data.category,
      },
    });
  }

  revalidatePath("/suppliers");
}

// حذف مورد
export async function deleteSupplierAction(id: number) {
  await prisma.supplier.delete({
    where: { id },
  });
  revalidatePath("/suppliers");
}