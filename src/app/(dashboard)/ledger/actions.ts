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
      orderBy: { code: "asc" },
      include: {
        treasurySafe: { select: { id: true } },
        treasuryBank: { select: { id: true } },
        customer: { select: { id: true } },
        supplier: { select: { id: true } },
      },
    });

    // 1. Get aggregated balances and counts from JournalItems
    const summary = await prisma.journalItem.groupBy({
      by: ["accountId"],
      _sum: {
        debit: true,
        credit: true,
      },
      _count: {
        id: true,
      },
    });

    // Create a map for quick lookup
    const summaryMap = new Map(
      summary.map((s) => [
        s.accountId,
        {
          debit: Number(s._sum.debit) || 0,
          credit: Number(s._sum.credit) || 0,
          count: s._count.id || 0,
        },
      ]),
    );

    // 2. Map accounts with their individual balances and sanitize for JSON
    const accountsWithBalance = accounts.map((acc) => {
      const totals = summaryMap.get(acc.id) || {
        debit: 0,
        credit: 0,
        count: 0,
      };

      let balance = 0;
      if (acc.type === "ASSET" || acc.type === "EXPENSE") {
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
        journalItemsCount: totals.count,
      };
    });

    // 3. Simple recursive tree building with balance aggregation
    const buildTree = (parentId: number | null = null): any[] => {
      const layer = accountsWithBalance.filter((a) => a.parentId === parentId);

      return layer.map((a) => {
        const children = buildTree(a.id);

        // If it's a parent, its balance is the sum of its children's balances
        let aggregatedBalance = a.balance;
        if (children.length > 0) {
          aggregatedBalance += children.reduce(
            (sum, child) => sum + (child.balance || 0),
            0,
          );
        }

        return {
          ...a,
          balance: aggregatedBalance,
          children,
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
    orderBy: { code: "asc" },
    include: {
      customer: { select: { id: true } },
      supplier: { select: { id: true } },
      treasurySafe: { select: { id: true } },
      treasuryBank: { select: { id: true } },
    },
  });
}

/**
 * Fetches the ledger for a specific account within a date range.
 * Includes Opening Balance, Transactions, and Running Balance.
 */
export async function getAccountLedger(
  accountId: number,
  startDate?: Date,
  endDate?: Date,
  newestFirst: boolean = false,
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
    orderBy: [
      { journalEntry: { date: "asc" } },
      { journalEntry: { createdAt: "asc" } },
    ],
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
      journalEntryId: item.journalEntry.id,
      date: item.journalEntry.date,
      createdAt: item.journalEntry.createdAt,
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

  // 4. Reverse if newestFirst is requested
  let finalTransactions = transactions;
  if (newestFirst) {
    finalTransactions = [...transactions].reverse();
  }

  return {
    openingBalance,
    closingBalance,
    totalDebits,
    totalCredits,
    transactions: finalTransactions,
  };
}

/**
 * Suggests the next sequential account code based on a parent account.
 */
export async function suggestNextAccountCode(parentId: number) {
  const parent = await prisma.account.findUnique({
    where: { id: parentId },
    select: { code: true },
  });

  if (!parent) throw new Error("Parent account not found");

  const lastChild = await prisma.account.findFirst({
    where: { parentId },
    orderBy: { code: "desc" },
    select: { code: true },
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

  // Prevent any sub-accounts under inventory assets account 120301, even if data is inconsistent.
  if (parent.code === "120301") {
    throw new Error(
      "لا يمكن إنشاء حسابات فرعية تحت حساب مخزون البضاعة 120301؛ هذا حساب طرفي نهائي.",
    );
  }

  // Enforce 4-level hierarchy
  if (parent.level >= 4 || parent.isTerminal) {
    throw new Error(
      "لا يمكن إضافة حسابات فرعية تحت حساب من المستوى الرابع (حساب طرفي)",
    );
  }

  const newLevel = parent.level + 1;
  const isTerminal = newLevel === 4;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if code already exists
      const existing = await tx.account.findUnique({
        where: { code: data.code },
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
          isSelectable: isTerminal,
          isTerminal: isTerminal,
          lastModifiedById: session.userId,
        },
      });

      // 3. Create linked entities if necessary (Sync with other modules)
      if (isTerminal) {
        const parentCode = parent.code.trim();
        if (parentCode === "1202") {
          // Customers
          const numericCode =
            parseInt(newAccount.code.replace(parentCode, "")) || 0;
          await tx.customer.create({
            data: {
              name: newAccount.name,
              code: numericCode,
              accountId: newAccount.id,
              category: "قطاعي",
            },
          });
        } else if (parentCode === "2101") {
          // Suppliers
          const numericCode =
            parseInt(newAccount.code.replace(parentCode, "")) || 0;
          await tx.supplier.create({
            data: {
              name: newAccount.name,
              code: numericCode,
              accountId: newAccount.id,
            },
          });
        } else if (parentCode === "1201") {
          // Safes
          await tx.treasurySafe.create({
            data: {
              name: newAccount.name,
              accountId: newAccount.id,
              balance: 0,
              isActive: true,
              isPrimary: false,
            },
          });
        } else if (parentCode === "1205") {
          // Banks
          await tx.treasuryBank.create({
            data: {
              name: newAccount.name,
              accountId: newAccount.id,
              balance: 0,
              isActive: true,
            },
          });
        }
      }

      // 3. Ensure parent is no longer selectable if it was (though in 4-level only L4 should be selectable)
      if (parent.isSelectable) {
        await tx.account.update({
          where: { id: data.parentId },
          data: { isSelectable: false, isTerminal: false },
        });
      }

      return newAccount;
    });

    // Revalidate paths
    revalidatePath("/ledger/coa");
    revalidatePath("/journal/new");
    revalidatePath("/ledger");
    revalidatePath("/customers");
    revalidatePath("/suppliers");
    revalidatePath("/treasury");

    return { success: true, account: result };
  } catch (error: any) {
    console.error("Error creating sub-account:", error);
    return {
      success: false,
      error: error.message || "حدث خطأ أثناء إضافة الحساب",
    };
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
          },
        },
        treasurySafe: {
          include: {
            _count: {
              select: {
                paymentVouchers: true,
                purchaseInvoices: true,
                purchaseReturns: true,
                receiptVouchers: true,
                salesInvoices: true,
                salesReturns: true,
                transfersFrom: true,
                transfersTo: true,
              },
            },
          },
        },
        treasuryBank: {
          include: {
            _count: {
              select: {
                paymentVouchers: true,
                purchaseInvoices: true,
                purchaseReturns: true,
                receiptVouchers: true,
                salesInvoices: true,
                salesReturns: true,
                transfersFrom: true,
                transfersTo: true,
              },
            },
          },
        },
        customer: {
          include: {
            _count: {
              select: {
                invoices: true,
                receiptVouchers: true,
                salesReturns: true,
              },
            },
          },
        },
        supplier: {
          include: {
            _count: {
              select: {
                invoices: true,
                paymentVouchers: true,
                purchaseReturns: true,
              },
            },
          },
        },
      },
    });

    if (!account) throw new Error("الحساب غير موجود");

    // Hierarchy Protection: Only Level 4 accounts can be deleted
    // Levels 1, 2, and 3 are system-defined "Main" accounts and are protected
    if (account.level < 4) {
      throw new Error(
        "لا يمكن حذف الحسابات الرئيسية (المستوى 1 و 2 و 3). فقط الحسابات الفرعية من المستوى الرابع هي القابلة للحذف.",
      );
    }

    // Check for children (redundant for L4 but safe)
    if (account._count.children > 0) {
      throw new Error("لا يمكن حذف الحساب لأنه يحتوي على حسابات فرعية");
    }

    // Check for transactions
    if (account._count.journalItems > 0) {
      throw new Error(
        "لا يمكن حذف الحساب لأنه يحتوي على عمليات مالية مسجلة. يجب حذف العمليات المرتبطة به أولاً.",
      );
    }

    await prisma.$transaction(async (tx) => {
      // Cascading checks and deletions for Sub-entities (Customers, Suppliers, Banks, Safes)
      if (account.customer) {
        if (
          account.customer._count.invoices > 0 ||
          account.customer._count.receiptVouchers > 0 ||
          account.customer._count.salesReturns > 0
        ) {
          throw new Error(
            "لا يمكن حذف الحساب لارتباطه بعميل لديه تعاملات مالية مسبقة",
          );
        }
        await tx.customer.delete({ where: { id: account.customer.id } });
      }

      if (account.supplier) {
        if (
          account.supplier._count.invoices > 0 ||
          account.supplier._count.paymentVouchers > 0 ||
          account.supplier._count.purchaseReturns > 0
        ) {
          throw new Error(
            "لا يمكن حذف الحساب لارتباطه بمورد لديه تعاملات مالية مسبقة",
          );
        }
        await tx.supplier.delete({ where: { id: account.supplier.id } });
      }

      if (account.treasurySafe) {
        if (account.treasurySafe.isPrimary) {
          throw new Error("لا يمكن حذف حساب الخزينة الرئيسية المربوطة بالنظام");
        }
        if (
          account.treasurySafe._count.paymentVouchers > 0 ||
          account.treasurySafe._count.purchaseInvoices > 0 ||
          account.treasurySafe._count.purchaseReturns > 0 ||
          account.treasurySafe._count.receiptVouchers > 0 ||
          account.treasurySafe._count.salesInvoices > 0 ||
          account.treasurySafe._count.salesReturns > 0 ||
          account.treasurySafe._count.transfersFrom > 0 ||
          account.treasurySafe._count.transfersTo > 0
        ) {
          throw new Error(
            "لا يمكن حذف الحساب لارتباطه بخزينة لديها تعاملات مسجلة",
          );
        }
        await tx.treasurySafe.delete({
          where: { id: account.treasurySafe.id },
        });
      }

      if (account.treasuryBank) {
        if (
          account.treasuryBank._count.paymentVouchers > 0 ||
          account.treasuryBank._count.purchaseInvoices > 0 ||
          account.treasuryBank._count.purchaseReturns > 0 ||
          account.treasuryBank._count.receiptVouchers > 0 ||
          account.treasuryBank._count.salesInvoices > 0 ||
          account.treasuryBank._count.salesReturns > 0 ||
          account.treasuryBank._count.transfersFrom > 0 ||
          account.treasuryBank._count.transfersTo > 0
        ) {
          throw new Error(
            "لا يمكن حذف الحساب لارتباطه ببنك لديه تعاملات مسجلة",
          );
        }
        await tx.treasuryBank.delete({
          where: { id: account.treasuryBank.id },
        });
      }

      // Finally delete the account itself once all linked entities are safely cleared
      await tx.account.delete({ where: { id: accountId } });
    });

    revalidatePath("/ledger/coa");
    revalidatePath("/journal/new");
    revalidatePath("/ledger");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return {
      success: false,
      error: error.message || "حدث خطأ أثناء حذف الحساب",
    };
  }
}

/**
 * Updates an account's name and English name.
 */
export async function updateAccount(data: {
  accountId: number;
  name: string;
  nameEn?: string;
  isAdminMode: boolean;
}) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح بالدخول");

  if (!data.isAdminMode) {
    throw new Error("يجب تفعيل وضع الإدارة لتعديل الحسابات");
  }

  try {
    const account = await prisma.account.findUnique({
      where: { id: data.accountId },
    });

    if (!account) throw new Error("الحساب غير موجود");

    const result = await prisma.account.update({
      where: { id: data.accountId },
      data: {
        name: data.name,
        nameEn: data.nameEn,
        lastModifiedById: session.userId,
      },
      include: {
        customer: true,
        supplier: true,
        treasurySafe: true,
        treasuryBank: true,
      },
    });

    // Mirror name update to the linked sub-entity to keep pages fully synchronized
    if (result.customer)
      await prisma.customer.update({
        where: { id: result.customer.id },
        data: { name: data.name },
      });
    if (result.supplier)
      await prisma.supplier.update({
        where: { id: result.supplier.id },
        data: { name: data.name },
      });
    if (result.treasurySafe)
      await prisma.treasurySafe.update({
        where: { id: result.treasurySafe.id },
        data: { name: data.name },
      });
    if (result.treasuryBank)
      await prisma.treasuryBank.update({
        where: { id: result.treasuryBank.id },
        data: { name: data.name },
      });

    revalidatePath("/ledger/coa");
    revalidatePath("/journal/new");
    revalidatePath("/ledger");

    return { success: true, account: result };
  } catch (error: any) {
    console.error("Error updating account:", error);
    return {
      success: false,
      error: error.message || "حدث خطأ أثناء تحديث الحساب",
    };
  }
}

/**
 * Fetches the full details of a specific journal entry by its ID,
 * including all associated debit and credit items.
 */
export async function getJournalEntryDetails(journalEntryId: number) {
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: {
        items: {
          include: {
            account: {
              select: { code: true, name: true },
            },
          },
        },
        createdBy: {
          select: { username: true },
        },
      },
    });

    return entry;
  } catch (error) {
    console.error("Error fetching journal entry details:", error);
    return null;
  }
}
