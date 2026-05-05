"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { triggerStaffActivityAlert } from "@/lib/notifications";

// جلب كل الموردين مع أرصدتهم — استدعاء DB واحد بدلاً من اثنين
export async function getSuppliers() {
  const db = await getTenantPrisma();

  type SupplierRow = {
    id: number;
    name: string;
    code: number;
    phone: string | null;
    address: string | null;
    category: string | null;
    balance: number;
  };

  const rows = await db.$queryRaw<SupplierRow[]>`
    SELECT
      s.id,
      s.name,
      s.code,
      s.phone,
      s.address,
      s.category,
      COALESCE(SUM(ji.credit) - SUM(ji.debit), 0)::float AS balance
    FROM "Supplier" s
    LEFT JOIN "Account" a ON s."accountId" = a.id
    LEFT JOIN "JournalItem" ji ON ji."accountId" = a.id
    GROUP BY s.id, s.name, s.code, s.phone, s.address, s.category
    ORDER BY s.code ASC
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

// إضافة أو تعديل مورد
export async function saveSupplier(data: {
  id?: number;
  name: string;
  code: number;
  phone: string;
  address: string;
  category: string;
}) {
  try {
    // ✅ فحص إذا كان الكود مستخدماً من قبل مورد آخر
    let existingSupplier;

    if (data.id) {
      existingSupplier = await (await getTenantPrisma()).supplier.findFirst({
        where: { code: data.code, NOT: { id: data.id } },
      });
    } else {
      existingSupplier = await (await getTenantPrisma()).supplier.findFirst({
        where: { code: data.code },
      });
    }

    if (existingSupplier) {
      return { error: "❌ الكود مستخدم مسبقاً، اختر كود آخر" };
    }

    if (data.id) {
      await (await getTenantPrisma()).supplier.update({
        where: { id: data.id },
        data: {
          name: data.name,
          code: data.code,
          phone: data.phone,
          address: data.address,
          category: data.category,
        },
      });

      const supplier = await (await getTenantPrisma()).supplier.findUnique({
        where: { id: data.id },
        include: { account: true }
      });
      if (supplier?.accountId) {
        await (await getTenantPrisma()).account.update({
          where: { id: supplier.accountId },
          data: { name: `${supplier.code} - ${supplier.name}` }
        });
      }

      const session = await getSession();
      if (session) {
        triggerStaffActivityAlert(
          session.user,
          "تعديل مورد",
          `تم تعديل بيانات المورد: ${data.name} (كود: ${data.code})`
        );
      }
    } else {
      await (await getTenantPrisma()).$transaction(async (tx) => {
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

        await tx.supplier.create({
          data: { ...data, accountId: account.id },
        });
      });

      const session = await getSession();
      if (session) {
        triggerStaffActivityAlert(
          session.user,
          "إضافة مورد",
          `تم إضافة مورد جديد: ${data.name} (كود: ${data.code})`
        );
      }
    }

    revalidatePath("/suppliers");
    return { success: true };
  } catch {
    return { error: "حدث خطأ أثناء الحفظ" };
  }
}

// حذف مورد
export async function deleteSupplierAction(id: number) {
  const supplier = await (await getTenantPrisma()).supplier.findUnique({ where: { id } });

  await (await getTenantPrisma()).$transaction(async (tx) => {
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
    triggerStaffActivityAlert(
      session.user,
      "حذف مورد",
      `تم حذف المورد: ${supplier.name} (كود: ${supplier.code})`
    );
  }

  revalidatePath("/suppliers");
}
