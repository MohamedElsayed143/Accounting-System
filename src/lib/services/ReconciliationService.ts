import { getTenantPrisma } from "@/lib/tenant-prisma";

export class ReconciliationService {
  /**
   * Reconciles the cached balance in TreasurySafe and TreasuryBank models
   * by calculating the sum of all journal items for their linked accounts.
   */
  static async reconcileTreasuryBalances() {
    const prisma = await getTenantPrisma();

    return await prisma.$transaction(async (tx) => {
      const safes = await tx.treasurySafe.findMany({
        where: { accountId: { not: null } },
        include: {
          account: {
            include: {
              journalItems: {
                select: { debit: true, credit: true },
              },
            },
          },
        },
      });

      const banks = await tx.treasuryBank.findMany({
        where: { accountId: { not: null } },
        include: {
          account: {
            include: {
              journalItems: {
                select: { debit: true, credit: true },
              },
            },
          },
        },
      });

      const results = {
        safesReconciled: 0,
        banksReconciled: 0,
        errors: [] as string[],
      };

      for (const safe of safes) {
        if (!safe.account) continue;
        
        const totalDebit = safe.account.journalItems.reduce((sum, item) => sum + (item.debit || 0), 0);
        const totalCredit = safe.account.journalItems.reduce((sum, item) => sum + (item.credit || 0), 0);
        const actualBalance = totalDebit - totalCredit;

        if (Math.abs(safe.balance - actualBalance) > 0.001) {
          await tx.treasurySafe.update({
            where: { id: safe.id },
            data: { balance: actualBalance },
          });
          results.safesReconciled++;
        }
      }

      for (const bank of banks) {
        if (!bank.account) continue;

        const totalDebit = bank.account.journalItems.reduce((sum, item) => sum + (item.debit || 0), 0);
        const totalCredit = bank.account.journalItems.reduce((sum, item) => sum + (item.credit || 0), 0);
        const actualBalance = totalDebit - totalCredit;

        if (Math.abs(bank.balance - actualBalance) > 0.001) {
          await tx.treasuryBank.update({
            where: { id: bank.id },
            data: { balance: actualBalance },
          });
          results.banksReconciled++;
        }
      }

      return results;
    });
  }
}
