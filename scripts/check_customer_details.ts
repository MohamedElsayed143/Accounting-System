import { prisma } from "../src/lib/prisma";

async function main() {
  const customer = await prisma.customer.findFirst({ where: { name: "محمد السيد" } });
  if (!customer) return;

  const invoices = await prisma.salesInvoice.findMany({ where: { customerId: customer.id } });
  const receipts = await prisma.receiptVoucher.findMany({ where: { customerId: customer.id } });
  const journalItems = await prisma.journalItem.findMany({ 
    where: { accountId: customer.accountId! },
    include: { journalEntry: true }
  });

  console.log("== INVOICES ==");
  invoices.forEach(i => console.log(`[Inv ${i.id}] Status: ${i.status}, Total: ${i.total}`));

  console.log("\n== RECEIPTS ==");
  receipts.forEach(r => console.log(`[Rec ${r.id}] Amount: ${r.amount}`));

  console.log("\n== JOURNAL ITEMS (GL) ==");
  journalItems.forEach(j => {
    console.log(`[JE ${j.journalEntryId}] Source: ${j.journalEntry.sourceType} ${j.journalEntry.sourceId}, Dr: ${j.debit}, Cr: ${j.credit}, Desc: ${j.description}`);
  });
}

main().finally(() => prisma.$disconnect());
