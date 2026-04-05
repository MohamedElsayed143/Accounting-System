import { prisma } from "../src/lib/prisma";

async function main() {
  const customers = await prisma.customer.findMany({ select: { id: true, name: true, accountId: true } });
  
  for (const customer of customers) {
    if (!customer.accountId) continue;
    
    const sums = await prisma.journalItem.aggregate({
      where: { accountId: customer.accountId },
      _sum: { debit: true, credit: true }
    });
    
    // Compute balance from invoices directly
    const invoices = await prisma.salesInvoice.aggregate({
      where: { customerId: customer.id, status: { not: "pending" } },
      _sum: { total: true }
    });
    
    const receipts = await prisma.receiptVoucher.aggregate({
      where: { customerId: customer.id },
      _sum: { amount: true }
    });
    
    const returns = await prisma.salesReturn.aggregate({
      where: { customerId: customer.id },
      _sum: { total: true }
    });
    
    const manualEntries = await prisma.journalItem.aggregate({
      where: { 
        accountId: customer.accountId,
        journalEntry: { sourceType: "MANUAL" }
      },
      _sum: { debit: true, credit: true }
    });
    
    // In reports context:
    // Debit = Invoice + Manual Debit
    // Credit = Receipt + Return + Manual Credit
    const reportBalance = 
      (invoices._sum.total || 0) + (manualEntries._sum.debit || 0) - 
      (receipts._sum.amount || 0) - (returns._sum.total || 0) - (manualEntries._sum.credit || 0);

    const actualDebit = sums._sum.debit || 0;
    const actualCredit = sums._sum.credit || 0;
    const actualBalance = actualDebit - actualCredit;

    console.log(`Customer ${customer.name}:`);
    console.log(`  - GL Balance (Journal Items): ${actualBalance} (Dr: ${actualDebit}, Cr: ${actualCredit})`);
    console.log(`  - Report Balance: ${reportBalance}`);
    console.log(`  - Mismatch: ${actualBalance !== reportBalance}\n`);
  }
}

main().finally(() => prisma.$disconnect());
