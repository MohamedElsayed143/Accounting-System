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
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
  balance: number; // Net balance (Debit - Credit)
  children?: TrialBalanceRow[];
};

/**
 * Fetches the trial balance report data.
 * Aggregates balances hierarchically.
 */
export async function getTrialBalance(endDate?: Date) {
  const eDate = endDate ? endOfDay(endDate) : endOfDay(new Date());

  // 1. Fetch all accounts
  const accounts = await prisma.account.findMany({
    orderBy: { code: 'asc' },
  });

  // 2. Fetch all journal items up to endDate grouped by account
  const journalItems = await prisma.journalItem.groupBy({
    by: ['accountId'],
    where: {
      journalEntry: {
        date: { lte: eDate }
      }
    },
    _sum: {
      debit: true,
      credit: true
    }
  });

  // Map sums to account IDs for quick lookup
  const balanceMap = new Map<number, { debit: number; credit: number }>();
  journalItems.forEach(item => {
    balanceMap.set(item.accountId, {
      debit: item._sum.debit || 0,
      credit: item._sum.credit || 0
    });
  });

  // 3. Initialize rows with direct balances
  const rows: TrialBalanceRow[] = accounts.map(acc => {
    const b = balanceMap.get(acc.id) || { debit: 0, credit: 0 };
    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      parentId: acc.parentId,
      level: acc.level,
      isSelectable: acc.isSelectable,
      openingDebit: 0, // Simplified for now, can add opening balance logic if needed
      openingCredit: 0,
      periodDebit: b.debit,
      periodCredit: b.credit,
      closingDebit: b.debit, // For now period = total
      closingCredit: b.credit,
      balance: b.debit - b.credit,
    };
  });

  // 4. Hierarchical Aggregation (Bottom-up)
  // We sort by level descending to process children before parents
  const sortedLevels = [...new Set(rows.map(r => r.level))].sort((a, b) => b - a);
  
  const rowMap = new Map<number, TrialBalanceRow>();
  rows.forEach(r => rowMap.set(r.id, r));

  for (const level of sortedLevels) {
    for (const row of rows) {
      if (row.level === level && row.parentId) {
        const parent = rowMap.get(row.parentId);
        if (parent) {
          parent.periodDebit += row.periodDebit;
          parent.periodCredit += row.periodCredit;
          parent.closingDebit += row.closingDebit;
          parent.closingCredit += row.closingCredit;
          parent.balance += row.balance;
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

  // Calculate Grand Totals (only root accounts)
  const rootAccounts = rows.filter(r => r.parentId === null);
  const totals = {
    totalDebit: rootAccounts.reduce((sum, r) => sum + r.periodDebit, 0),
    totalCredit: rootAccounts.reduce((sum, r) => sum + r.periodCredit, 0),
  };

  return {
    rows: tree,
    totals,
    isBalanced: Math.abs(totals.totalDebit - totals.totalCredit) < 0.001
  };
}
