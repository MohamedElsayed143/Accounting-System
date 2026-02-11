"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// جلب كل العملاء
export async function getCustomers() {
  return await prisma.customer.findMany({
    orderBy: { code: "asc" },
  });
}

// إضافة أو تعديل عميل
export async function saveCustomer(data: {
  id?: number;
  name: string;
  code: number;
  phone: string;
  address: string;
}) {
  try {
    let existingCustomer;

    if (data.id) {
      existingCustomer = await prisma.customer.findFirst({
        where: {
          code: data.code,
          NOT: { id: data.id },
        },
      });
    } else {
      existingCustomer = await prisma.customer.findFirst({
        where: {
          code: data.code,
        },
      });
    }

    // ✅ بدل throw
    if (existingCustomer) {
      return { error: "❌ الكود مستخدم مسبقاً، اختر كود آخر" };
    }

    if (data.id) {
      await prisma.customer.update({
        where: { id: data.id },
        data,
      });
    } else {
      await prisma.customer.create({
        data,
      });
    }

    revalidatePath("/customers");

    return { success: true };
  } catch {
    return { error: "حدث خطأ أثناء الحفظ" };
  }
}


// حذف عميل
export async function deleteCustomerAction(id: number) {
  await prisma.customer.delete({
    where: { id },
  });

  revalidatePath("/customers");
}
