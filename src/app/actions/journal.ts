"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { startOfDay, endOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { SequenceService } from "@/lib/services/SequenceService";
import { AccountType } from "@prisma/client";

/**
 * Fetches leaf accounts (selectable) for journal entries, including their current balance.
 */
export async function getJournalSelectableAccounts() {
  const accounts = await (await getTenantPrisma()).account.findMany({
    where: {
      isTerminal: true,
      level: 4, // Only Level-4 accounts can have journal entries posted to them
    },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      treasurySafe: {
        select: { name: true },
      },
      treasuryBank: {
        select: { name: true },
      },
      journalItems: {
        select: {
          debit: true,
          credit: true,
        },
      },
    },
  });

  return accounts.map((acc) => {
    // Basic balance calculation
    const totalDebit = (acc as any).journalItems.reduce(
      (sum: number, item: any) => sum + (Number(item.debit) || 0),
      0,
    );
    const totalCredit = (acc as any).journalItems.reduce(
      (sum: number, item: any) => sum + (Number(item.credit) || 0),
      0,
    );

    // For Assets and Expenses: Balance = Debit - Credit
    // For Liabilities, Equity, and Revenue: Balance = Credit - Debit (Standard accounting representation)
    // However, for "money determining", a simple Debit - Credit is often what users mean for Cash/Bank.
    // Let's stick to standard nature-based balance for correctness in a professional system.
    let balance = 0;
    if (acc.type === "ASSET" || acc.type === "EXPENSE") {
      balance = totalDebit - totalCredit;
    } else {
      balance = totalCredit - totalDebit;
    }

    // Localize Name if linked to a Treasury Entity
    let displayName = acc.name;
    const a = acc as any;
    if (a.treasurySafe) {
      displayName = `${acc.name} - ${a.treasurySafe.name}`;
    } else if (a.treasuryBank) {
      displayName = `${acc.name} - ${a.treasuryBank.name}`;
    }

    return {
      id: acc.id,
      code: acc.code,
      name: displayName,
      type: acc.type,
      balance,
      isTreasury: !!a.treasurySafe,
      isBank: !!a.treasuryBank,
    };
  });
}

/**
 * Gets the next entry number for a manual journal entry.
 */
export async function getNextEntryNumber() {
  const sequence = await (await getTenantPrisma()).systemSequence.findUnique({
    where: { id: "JournalEntry" },
    select: { lastValue: true },
  });
  
  if (sequence) {
    return sequence.lastValue + 1;
  }

  const lastEntry = await (await getTenantPrisma()).journalEntry.findFirst({
    orderBy: { entryNumber: "desc" },
    select: { entryNumber: true },
  });
  return (lastEntry?.entryNumber || 0) + 1;
}

/**
 * Saves a new journal entry.
 */
export async function saveJournalEntry(data: {
  date: Date;
  description: string;
  reference?: string;
  items: {
    accountId: number;
    description?: string;
    debit: number;
    credit: number;
  }[];
  isAdminMode: boolean;
}) {
  const session = await getSession();
  if (!session) {
    throw new Error("غير مصرح بالدخول. يرجى تسجيل الدخول.");
  }

  // 0. Admin Mode Enforcement
  if (!data.isAdminMode) {
    throw new Error(
      "يجب تفعيل وضع الإدارة (Admin Mode) للقيام بالعمليات الحسابية اليدوية.",
    );
  }
  // 1. Validation: Total Debit must equal Total Credit
  const totalDebit = data.items.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = data.items.reduce((sum, item) => sum + item.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error("القيد غير متزن: إجمالي المدين يجب أن يساوي إجمالي الدائن");
  }

  if (data.items.length < 2) {
    throw new Error("يجب أن يحتوي القيد على سطرين على الأقل");
  }

  const accountIds = data.items.map((item) => item.accountId);

  // 1.5. Prevent manual entries on Customer/Supplier accounts UNLESS in Admin Mode
  if (!data.isAdminMode) {
    const linkedAccounts = await (await getTenantPrisma()).account.findMany({
      where: {
        id: { in: accountIds },
        OR: [{ customer: { isNot: null } }, { supplier: { isNot: null } }],
      } as any,
      select: { name: true },
    });

    if (linkedAccounts.length > 0) {
      throw new Error(
        `لا يمكن إضافة قيد يدوي على حسابات العملاء أو الموردين (${linkedAccounts.map((a) => a.name).join(", ")}). فضلاً استخدم الفواتير أو السندات، أو فعل وضع الإدارة للمحاسبين.`,
      );
    }
  }

  // 1.5.1 Prevent manual journal entries on inventory asset account 120301 unless the user has inventory_manage permission.
  const inventoryAccount = await (await getTenantPrisma()).account.findFirst({
    where: {
      id: { in: accountIds },
      code: "120301",
    },
    select: { id: true, name: true },
  });

  if (inventoryAccount) {
    const canManageInventory = await hasPermission(
      session.userId,
      "inventory_manage",
    );
    if (!canManageInventory) {
      throw new Error(
        "لا يمكن إضافة أو تعديل قيود يدوية على حساب مخزون البضاعة 120301 إلا لمستخدمي مخزون مع صلاحية Inventory Manager.",
      );
    }
  }

  // 1.6. Prohibit direct Revenue vs Expense offset
  const accountDetails = await (await getTenantPrisma()).account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, type: true },
  });

  const hasRevenue = accountDetails.some((a) => a.type === AccountType.REVENUE);
  const hasExpense = accountDetails.some((a) => a.type === AccountType.EXPENSE);

  if (hasRevenue && hasExpense) {
    throw new Error(
      "لا يمكن عمل قيد مباشر بين المبيعات والمشتريات؛ يجب استخدام حساب وسيط مثل الخزينة أو العميل/المورد",
    );
  }

  // 1.7. Enforce terminal only — reject any account not terminal
  const terminalCheck = await (await getTenantPrisma()).account.findMany({
    where: { id: { in: accountIds }, isTerminal: false },
    select: { name: true, level: true },
  });
  if (terminalCheck.length > 0) {
    return {
      success: false,
      error:
        "عذراً، لا يمكن إضافة قيود إلا على الحسابات النهائية (Terminal) فقط",
    };
  }

  // 2. Database Transaction
  try {
    const result = await (await getTenantPrisma()).$transaction(async (tx) => {
      const entryNumber = await SequenceService.getNextSequenceValue(tx, "JournalEntry");

      const entry = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: data.date,
          description: data.description,
          reference: data.reference,
          sourceType: "MANUAL",
          createdById: session.userId,
          items: {
            create: data.items.map((item) => ({
              accountId: item.accountId,
              description: item.description,
              debit: item.debit,
              credit: item.credit,
            })),
          },
        } as any,
        include: {
          items: true,
        },
      });

      return entry;
    });

    revalidatePath("/journal");
    revalidatePath("/ledger");
    revalidatePath("/reports/trial-balance");

    return { success: true, entry: result };
  } catch (error: any) {
    console.error("Error saving journal entry:", error);
    return {
      success: false,
      error: error.message || "حدث خطأ أثناء حفظ القيد",
    };
  }
}

/**
 * Fetches all manual journal entries with their associated items.
 */
export async function getJournalEntries() {
  return await (await getTenantPrisma()).journalEntry.findMany({
    where: { sourceType: "MANUAL" },
    include: {
      items: {
        include: {
          account: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}
