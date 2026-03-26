"use server";

import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";

/**
 * Fetches the Chart of Accounts in a hierarchical tree structure with balances.
 */
export async function getCOATree() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { code: 'asc' },
      include: {
        treasurySafe: { select: { id: true } },
        treasuryBank: { select: { id: true } },
        customer: { select: { id: true } },
        supplier: { select: { id: true } }
      }
    });

    // 1. Get aggregated balances and counts from JournalItems
    const summary = await prisma.journalItem.groupBy({
      by: ['accountId'],
      _sum: {
        debit: true,
        credit: true
      },
      _count: {
        id: true
      }
    });

    // Create a map for quick lookup
    const summaryMap = new Map(summary.map(s => [s.accountId, {
      debit: Number(s._sum.debit) || 0,
      credit: Number(s._sum.credit) || 0,
      count: s._count.id || 0
    }]));

    // 2. Map accounts with their individual balances and sanitize for JSON
    const accountsWithBalance = accounts.map(acc => {
      const totals = summaryMap.get(acc.id) || { debit: 0, credit: 0, count: 0 };
      
      let balance = 0;
      if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
        balance = totals.debit - totals.credit;
      } else {
        balance = totals.credit - totals.debit;
      }

      // Convert to plain object and handle potential non-serializable fields
      const anyAcc = acc as any;
      return { 
        id: acc.id,
        code: acc.code,
        name: acc.name,
        nameEn: acc.nameEn,
        type: acc.type,
        parentId: acc.parentId,
        level: acc.level,
        isSelectable: acc.isSelectable,
        isTerminal: acc.isTerminal,
        treasurySafe: anyAcc.treasurySafe,
        treasuryBank: anyAcc.treasuryBank,
        customerId: anyAcc.customer?.id || null,
        supplierId: anyAcc.supplier?.id || null,
        balance,
        journalItemsCount: totals.count
      };
    });

    // 3. Simple recursive tree building with balance aggregation
    const buildTree = (parentId: number | null = null): any[] => {
      const layer = accountsWithBalance.filter(a => a.parentId === parentId);
      
      return layer.map(a => {
        const children = buildTree(a.id);
        
        // If it's a parent, its balance is the sum of its children's balances
        let aggregatedBalance = a.balance;
        if (children.length > 0) {
          aggregatedBalance += children.reduce((sum, child) => sum + (child.balance || 0), 0);
        }

        return {
          ...a,
          balance: aggregatedBalance,
          children
        };
      });
    };

    return buildTree(null);
  } catch (error) {
    console.error("CRITICAL ERROR IN getCOATree:", error);
    throw error;
  }
}

/**
 * Fetches selectable (terminal leaf) accounts for dropdowns.
 */
export async function getSelectableAccounts() {
  return await prisma.account.findMany({
    where: {
      isTerminal: true,
    },
    orderBy: { code: 'asc' },
    include: {
      customer: { select: { id: true } },
      supplier: { select: { id: true } }
    } as any
  });
}

/**
 * Fetches the ledger for a specific account within a date range.
 * Includes Opening Balance, Transactions, and Running Balance.
 */
export async function getAccountLedger(
  accountId: number,
  startDate?: Date,
  endDate?: Date
) {
  const sDate = startDate ? startOfDay(startDate) : undefined;
  const eDate = endDate ? endOfDay(endDate) : undefined;

  // 1. Calculate Opening Balance (sum of all items before startDate)
  let openingBalance = 0;
  if (sDate) {
    const prevItems = await prisma.journalItem.aggregate({
      where: {
        accountId,
        journalEntry: {
          date: { lt: sDate },
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });
    openingBalance = (prevItems._sum.debit || 0) - (prevItems._sum.credit || 0);
  }

  // 2. Fetch Transactions within range
  const items = await prisma.journalItem.findMany({
    where: {
      accountId,
      journalEntry: {
        date: sDate && eDate ? { gte: sDate, lte: eDate } : undefined,
      },
    },
    include: {
      journalEntry: true,
    },
    orderBy: {
      journalEntry: {
        date: 'asc',
      },
    },
  });

  // 3. Process Transactions and Calculate Running Balance
  let runningBalance = openingBalance;
  let totalDebits = 0;
  let totalCredits = 0;

  const transactions = items.map((item) => {
    const debit = (item.debit as number) || 0;
    const credit = (item.credit as number) || 0;
    
    runningBalance += debit - credit;
    totalDebits += debit;
    totalCredits += credit;

    return {
      id: item.id,
      date: item.journalEntry.date,
      entryNumber: item.journalEntry.entryNumber,
      description: item.description || item.journalEntry.description,
      debit: debit,
      credit: credit,
      balance: runningBalance,
      sourceType: item.journalEntry.sourceType,
      sourceId: item.journalEntry.sourceId,
    };
  });

  const closingBalance = runningBalance;

  return {
    openingBalance,
    closingBalance,
    totalDebits,
    totalCredits,
    transactions,
  };
}

/**
 * Suggests the next sequential account code based on a parent account.
 */
export async function suggestNextAccountCode(parentId: number) {
  const parent = await prisma.account.findUnique({
    where: { id: parentId },
    select: { code: true }
  });

  if (!parent) throw new Error("Parent account not found");

  const lastChild = await prisma.account.findFirst({
    where: { parentId },
    orderBy: { code: 'desc' },
    select: { code: true }
  });

  if (lastChild) {
    // Try to increment the last child's code
    const numericCode = parseInt(lastChild.code);
    if (!isNaN(numericCode)) {
      return (numericCode + 1).toString();
    }
    return lastChild.code + "1"; // Fallback for non-numeric
  }

  // No children yet, suggest parentCode + "01"
  return parent.code + "01";
}

/**
 * Creates a new sub-account with strict 4-level hierarchical validation.
 */
export async function createSubAccount(data: {
  parentId: number;
  code: string;
  name: string;
  nameEn?: string;
  isAdminMode: boolean;
}) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح بالدخول");

  if (!data.isAdminMode) {
    throw new Error("يجب تفعيل وضع الإدارة لإضافة حسابات جديدة");
  }

  const parent = await prisma.account.findUnique({
    where: { id: data.parentId },
  });

  if (!parent) throw new Error("الحساب الأب غير موجود");

  // Enforce 4-level hierarchy
  if (parent.level >= 4 || parent.isTerminal) {
    throw new Error("لا يمكن إضافة حسابات فرعية تحت حساب من المستوى الرابع (حساب طرفي)");
  }

  const newLevel = parent.level + 1;
  const isTerminal = newLevel === 4;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if code already exists
      const existing = await tx.account.findUnique({
        where: { code: data.code }
      });
      if (existing) throw new Error("كود الحساب موجود بالفعل");

      // 2. Create the new account
      const newAccount = await tx.account.create({
        data: {
          code: data.code,
          name: data.name,
          nameEn: data.nameEn,
          type: parent.type,
          parentId: data.parentId,
          level: newLevel,
          isSelectable: isTerminal, // Only L4 is selectable/active for transactions
          isTerminal: isTerminal,
          lastModifiedById: session.userId,
        }
      });

      // 3. Ensure parent is no longer selectable if it was (though in 4-level only L4 should be selectable)
      if (parent.isSelectable) {
        await tx.account.update({
          where: { id: data.parentId },
          data: { isSelectable: false, isTerminal: false }
        });
      }

      return newAccount;
    });

    // Revalidate paths
    revalidatePath("/ledger/coa");
    revalidatePath("/journal/new");
    revalidatePath("/ledger");

    return { success: true, account: result };
  } catch (error: any) {
    console.error("Error creating sub-account:", error);
    return { success: false, error: error.message || "حدث خطأ أثناء إضافة الحساب" };
  }
}
/**
 * Deletes an account only if it has no children and no transactions.
 */
export async function deleteAccount(accountId: number, isAdminMode: boolean) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح بالدخول");

  if (!isAdminMode) {
    throw new Error("يجب تفعيل وضع الإدارة لحذف حسابات");
  }
  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        _count: {
          select: {
            children: true,
            journalItems: true,
          }
        },
        treasurySafe: true,
        treasuryBank: true,
      }
    });

    if (!account) throw new Error("الحساب غير موجود");

    // Hierarchy Protection: Only Level 4 accounts can be deleted
    // Levels 1, 2, and 3 are system-defined "Main" accounts and are protected
    if (account.level < 4) {
      throw new Error("لا يمكن حذف الحسابات الرئيسية (المستوى 1 و 2 و 3). فقط الحسابات الفرعية من المستوى الرابع هي القابلة للحذف.");
    }

    // Check for children (redundant for L4 but safe)
    if (account._count.children > 0) {
      throw new Error("لا يمكن حذف الحساب لأنه يحتوي على حسابات فرعية");
    }

    // Check for transactions
    if (account._count.journalItems > 0) {
      throw new Error("لا يمكن حذف الحساب لأنه يحتوي على عمليات مالية مسجلة. يجب حذف العمليات المرتبطة به أولاً.");
    }

    // Check for treasury links
    if (account.treasurySafe || account.treasuryBank) {
      throw new Error("لا يمكن حذف الحساب لأنه مرتبط بخزينة أو بنك مفعل");
    }

    await prisma.account.delete({
      where: { id: accountId }
    });

    revalidatePath("/ledger/coa");
    revalidatePath("/journal/new");
    revalidatePath("/ledger");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return { success: false, error: error.message || "حدث خطأ أثناء حذف الحساب" };
  }
}
