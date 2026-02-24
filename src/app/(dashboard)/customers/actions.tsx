"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// جلب كل العملاء مع أرصدتهم
export async function getCustomers() {
  const customers = await prisma.customer.findMany({
    include: {
      invoices: { select: { total: true } },
      receiptVouchers: { select: { amount: true } },
      salesReturns: { select: { total: true } },
    },
    orderBy: { code: "asc" },
  });

  return customers.map((customer) => {
    const totalInvoices = customer.invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalReceipts = customer.receiptVouchers.reduce((sum, rec) => sum + rec.amount, 0);
    const totalReturns = customer.salesReturns.reduce((sum, ret) => sum + ret.total, 0);
    
    return {
      id: customer.id,
      name: customer.name,
      code: customer.code,
      phone: customer.phone,
      address: customer.address,
      balance: totalInvoices - totalReceipts - totalReturns,
    };
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
