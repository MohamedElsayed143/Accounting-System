"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { triggerStaffActivityAlert } from "@/lib/notifications";

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

    // Update linked account name if it exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: data.id },
      include: { account: true }
    });
    if (supplier?.accountId) {
      await prisma.account.update({
        where: { id: supplier.accountId },
        data: { name: `${supplier.code} - ${supplier.name}` }
      });
    }

    const session = await getSession();
    if (session) {
      await triggerStaffActivityAlert(
        session.user,
        "تعديل مورد",
        `تم تعديل بيانات المورد: ${data.name} (كود: ${data.code})`
      );
    }
  } else {
    // إضافة جديد
    await prisma.$transaction(async (tx) => {
      // 1. Create the account in COA first
      const suppParent = await tx.account.findUnique({ where: { code: '2101' } });
      if (!suppParent) throw new Error("حساب الموردين الرئيسي (2101) غير موجود");

      const accountCode = `2101${data.code.toString().padStart(4, '0')}`;
      const account = await tx.account.create({
        data: {
          code: accountCode,
          name: `${data.code} - ${data.name}`,
          type: 'LIABILITY',
          parentId: suppParent.id,
          level: 4,
          isTerminal: true,
          isSelectable: true,
        }
      });

      // 2. Create the supplier and link to account
      await tx.supplier.create({
        data: {
          ...data,
          accountId: account.id
        },
      });
    });

    const session = await getSession();
    if (session) {
      await triggerStaffActivityAlert(
        session.user,
        "إضافة مورد",
        `تم إضافة مورد جديد: ${data.name} (كود: ${data.code})`
      );
    }
  }

  revalidatePath("/suppliers");
}

// حذف مورد
export async function deleteSupplierAction(id: number) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });

  await prisma.$transaction(async (tx) => {
    await tx.supplier.delete({
      where: { id },
    });

    // Delete the corresponding COA account if it exists
    if (supplier?.accountId) {
      await tx.account.delete({ where: { id: supplier.accountId } });
    }
  });

  const session = await getSession();
  if (session && supplier) {
    await triggerStaffActivityAlert(
      session.user,
      "حذف مورد",
      `تم حذف المورد: ${supplier.name} (كود: ${supplier.code})`
    );
  }

  revalidatePath("/suppliers");
}
