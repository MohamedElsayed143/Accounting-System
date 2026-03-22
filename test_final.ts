
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFinal() {
  try {
    console.log("Fetching accounts...");
    const accounts = await prisma.account.findMany({
      orderBy: { code: 'asc' },
      include: {
        treasurySafe: { select: { id: true } },
        treasuryBank: { select: { id: true } }
      }
    });

    console.log("Grouping summary...");
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

    const summaryMap = new Map(summary.map(s => [s.accountId, {
      debit: Number(s._sum.debit) || 0,
      credit: Number(s._sum.credit) || 0,
      count: s._count.id || 0
    }]));

    const accountsWithBalance = accounts.map(acc => {
      const totals = summaryMap.get(acc.id) || { debit: 0, credit: 0, count: 0 };
      let balance = 0;
      if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
        balance = totals.debit - totals.credit;
      } else {
        balance = totals.credit - totals.debit;
      }
      return { 
        id: acc.id,
        code: acc.code,
        name: acc.name,
        nameEn: acc.nameEn,
        type: acc.type,
        parentId: acc.parentId,
        level: acc.level,
        isSelectable: acc.isSelectable,
        treasurySafe: acc.treasurySafe,
        treasuryBank: acc.treasuryBank,
        balance,
        journalItemsCount: totals.count
      };
    });

    const buildTree = (parentId: number | null = null): any[] => {
      const layer = accountsWithBalance.filter(a => a.parentId === parentId);
      return layer.map(a => {
        const children = buildTree(a.id);
        let aggregatedBalance = a.balance;
        if (children.length > 0) {
          aggregatedBalance += children.reduce((sum, child) => sum + (child.balance || 0), 0);
        }
        return { ...a, balance: aggregatedBalance, children };
      });
    };

    console.log("Building tree...");
    const tree = buildTree(null);
    console.log("Tree built successfully. Root nodes:", tree.length);

  } catch (error) {
    console.error("FINAL TEST ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testFinal();
