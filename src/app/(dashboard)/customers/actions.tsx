"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { triggerStaffActivityAlert } from "@/lib/notifications";

// جلب كل العملاء مع أرصدتهم
export async function getCustomers() {
  const session = await getSession();
  if (!session) return [];

  const isRestricted = await hasPermission(session.userId, "customers_retail_only");
  
  const customers = await prisma.customer.findMany({
    where: isRestricted ? { category: "قطاعي" } : {},
    include: {
      invoices: { 
        where: { status: { not: "pending" } },
        select: { total: true } 
      },
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
      category: customer.category,
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
  category?: string;
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
        data: {
          name: data.name,
          code: data.code,
          phone: data.phone,
          address: data.address,
          category: data.category,
        },
      });

      // Update linked account name if it exists
      const customer = await prisma.customer.findUnique({
        where: { id: data.id },
        include: { account: true }
      });
      if (customer?.accountId) {
        await prisma.account.update({
          where: { id: customer.accountId },
          data: { name: `${customer.code} - ${customer.name}` }
        });
      }
      
      const session = await getSession();
      if (session) {
        await triggerStaffActivityAlert(
          session.user,
          "تعديل عميل",
          `تم تعديل بيانات العميل: ${data.name} (كود: ${data.code})`
        );
      }
    } else {
      await prisma.$transaction(async (tx) => {
        // 1. Create the account in COA first
        const custParent = await tx.account.findUnique({ where: { code: '1202' } });
        if (!custParent) throw new Error("حساب العملاء الرئيسي (1202) غير موجود");

        const accountCode = `1202${data.code.toString().padStart(4, '0')}`;
        const account = await tx.account.create({
          data: {
            code: accountCode,
            name: `${data.code} - ${data.name}`,
            type: 'ASSET',
            parentId: custParent.id,
            level: 4,
            isTerminal: true,
            isSelectable: true,
          }
        });

        // 2. Create the customer and link to account
        await tx.customer.create({
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
          "إضافة عميل",
          `تم إضافة عميل جديد: ${data.name} (كود: ${data.code})`
        );
      }
    }

    revalidatePath("/customers");

    return { success: true };
  } catch {
    return { error: "حدث خطأ أثناء الحفظ" };
  }
}


// حذف عميل
export async function deleteCustomerAction(id: number) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  
  await prisma.$transaction(async (tx) => {
    await tx.customer.delete({
      where: { id },
    });
    
    // Delete the corresponding COA account if it exists
    if (customer?.accountId) {
      await tx.account.delete({ where: { id: customer.accountId } });
    }
  });

  const session = await getSession();
  if (session && customer) {
    await triggerStaffActivityAlert(
      session.user,
      "حذف عميل",
      `تم حذف العميل: ${customer.name} (كود: ${customer.code})`
    );
  }

  revalidatePath("/customers");
}
