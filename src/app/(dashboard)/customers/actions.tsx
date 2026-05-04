"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { triggerStaffActivityAlert } from "@/lib/notifications";

// جلب كل العملاء مع أرصدتهم — استدعاء DB واحد بدلاً من اثنين
export async function getCustomers() {
  const session = await getSession();
  if (!session) return [];

  const db = await getTenantPrisma();
  const isRestricted = await hasPermission(session.userId, "customers_retail_only");

  type CustomerRow = {
    id: number;
    name: string;
    code: number;
    phone: string | null;
    address: string | null;
    category: string | null;
    balance: number;
  };

  const whereClause = isRestricted
    ? Prisma.sql`WHERE c.category = 'قطاعي'`
    : Prisma.sql``;

  const rows = await db.$queryRaw<CustomerRow[]>`
    SELECT
      c.id,
      c.name,
      c.code,
      c.phone,
      c.address,
      c.category,
      COALESCE(SUM(ji.debit) - SUM(ji.credit), 0)::float AS balance
    FROM "Customer" c
    LEFT JOIN "Account" a ON c."accountId" = a.id
    LEFT JOIN "JournalItem" ji ON ji."accountId" = a.id
    ${whereClause}
    GROUP BY c.id, c.name, c.code, c.phone, c.address, c.category
    ORDER BY c.code ASC
  `;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    phone: r.phone,
    address: r.address,
    category: r.category,
    balance: Number(r.balance),
  }));
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
      existingCustomer = await (await getTenantPrisma()).customer.findFirst({
        where: {
          code: data.code,
          NOT: { id: data.id },
        },
      });
    } else {
      existingCustomer = await (await getTenantPrisma()).customer.findFirst({
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
      await (await getTenantPrisma()).customer.update({
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
      const customer = await (await getTenantPrisma()).customer.findUnique({
        where: { id: data.id },
        include: { account: true }
      });
      if (customer?.accountId) {
        await (await getTenantPrisma()).account.update({
          where: { id: customer.accountId },
          data: { name: `${customer.code} - ${customer.name}` }
        });
      }
      
      const session = await getSession();
      if (session) {
        triggerStaffActivityAlert(
          session.user,
          "تعديل عميل",
          `تم تعديل بيانات العميل: ${data.name} (كود: ${data.code})`
        );
      }
    } else {
      await (await getTenantPrisma()).$transaction(async (tx) => {
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
        triggerStaffActivityAlert(
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
  const customer = await (await getTenantPrisma()).customer.findUnique({ where: { id } });
  
  await (await getTenantPrisma()).$transaction(async (tx) => {
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
    triggerStaffActivityAlert(
      session.user,
      "حذف عميل",
      `تم حذف العميل: ${customer.name} (كود: ${customer.code})`
    );
  }

  revalidatePath("/customers");
}
