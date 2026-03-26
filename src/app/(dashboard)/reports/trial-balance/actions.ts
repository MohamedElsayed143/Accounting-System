"use server";

import { prisma } from "@/lib/prisma";
import { endOfDay } from "date-fns";
import { AccountType } from "@prisma/client";

export type TrialBalanceRow = {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  parentId: number | null;
  level: number;
  isSelectable: boolean;
  openingDebit: number;
  openingCredit: number;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
  closingBalance: number;
  children?: TrialBalanceRow[];
};

/**
 * Fetches the trial balance report data.
 * Aggregates balances hierarchically.
 */
export async function getTrialBalance(startDate: Date, endDate: Date) {
  const eDate = endOfDay(endDate);
  const sDate = startDate; // Already midnight if constructed properly, but let's use as is

  // 1. Fetch all accounts
  const accounts = await prisma.account.findMany({
    orderBy: { code: 'asc' },
  });

  // 2. Fetch Opening Balances (Before startDate)
  const openingItems = await prisma.journalItem.groupBy({
    by: ['accountId'],
    where: {
      journalEntry: {
        date: { lt: sDate }
      }
    },
    _sum: {
      debit: true,
      credit: true
    }
  });

  // 3. Fetch Period Transactions (Between startDate and endDate)
  const periodItems = await prisma.journalItem.groupBy({
    by: ['accountId'],
    where: {
      journalEntry: {
        date: { gte: sDate, lte: eDate }
      }
    },
    _sum: {
      debit: true,
      credit: true
    }
  });

  const openingMap = new Map<number, { debit: number; credit: number }>();
  openingItems.forEach(item => {
    openingMap.set(item.accountId, {
      debit: item._sum.debit || 0,
      credit: item._sum.credit || 0
    });
  });

  const periodMap = new Map<number, { debit: number; credit: number }>();
  periodItems.forEach(item => {
    periodMap.set(item.accountId, {
      debit: item._sum.debit || 0,
      credit: item._sum.credit || 0
    });
  });

  // 4. Initialize rows with direct balances
  const rows: TrialBalanceRow[] = accounts.map(acc => {
    const ob = openingMap.get(acc.id) || { debit: 0, credit: 0 };
    const pb = periodMap.get(acc.id) || { debit: 0, credit: 0 };
    
    // We calculate "Opening Balance" depending on the nature of the account (Assets/Expenses are Debit normal, etc.)
    // But practically: net balance = Debit - Credit. Positive is Debit balance, Negative is Credit balance.
    const openingBal = ob.debit - ob.credit;
    const closingDebit = ob.debit + pb.debit;
    const closingCredit = ob.credit + pb.credit;
    const closingBal = closingDebit - closingCredit;

    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      parentId: acc.parentId,
      level: acc.level,
      isSelectable: acc.isSelectable,
      openingDebit: ob.debit,
      openingCredit: ob.credit,
      openingBalance: openingBal,
      periodDebit: pb.debit,
      periodCredit: pb.credit,
      closingDebit,
      closingCredit,
      closingBalance: closingBal,
    };
  });

  // 5. Hierarchical Aggregation (Bottom-up)
  const sortedLevels = [...new Set(rows.map(r => r.level))].sort((a, b) => b - a);
  
  const rowMap = new Map<number, TrialBalanceRow>();
  rows.forEach(r => rowMap.set(r.id, r));

  for (const level of sortedLevels) {
    for (const row of rows) {
      if (row.level === level && row.parentId) {
        const parent = rowMap.get(row.parentId);
        if (parent) {
          parent.openingDebit += row.openingDebit;
          parent.openingCredit += row.openingCredit;
          parent.openingBalance += row.openingBalance;

          parent.periodDebit += row.periodDebit;
          parent.periodCredit += row.periodCredit;

          parent.closingDebit += row.closingDebit;
          parent.closingCredit += row.closingCredit;
          parent.closingBalance += row.closingBalance;
        }
      }
    }
  }

  // 5. Build Tree for UI display if needed, or return flat list
  const buildTree = (parentId: number | null = null): TrialBalanceRow[] => {
    return rows
      .filter(r => r.parentId === parentId)
      .map(r => ({
        ...r,
        children: buildTree(r.id)
      }));
  };

  const tree = buildTree(null);

  const rootAccounts = rows.filter(r => r.parentId === null);
  const totals = {
    totalOpeningDebit: rootAccounts.reduce((sum, r) => sum + r.openingDebit, 0),
    totalOpeningCredit: rootAccounts.reduce((sum, r) => sum + r.openingCredit, 0),
    totalPeriodDebit: rootAccounts.reduce((sum, r) => sum + r.periodDebit, 0),
    totalPeriodCredit: rootAccounts.reduce((sum, r) => sum + r.periodCredit, 0),
    totalClosingDebit: rootAccounts.reduce((sum, r) => sum + r.closingDebit, 0),
    totalClosingCredit: rootAccounts.reduce((sum, r) => sum + r.closingCredit, 0),
  };

  return {
    rows: tree,
    totals,
    isBalanced: Math.abs(totals.totalClosingDebit - totals.totalClosingCredit) < 0.001
  };
}
