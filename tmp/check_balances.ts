import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Treasury Safes ---");
  const safes = await prisma.treasurySafe.findMany();
  safes.forEach(s => console.log(`Safe: ${s.name}, Balance: ${s.balance}, ID: ${s.id}`));

  console.log("\n--- Treasury Banks ---");
  const banks = await prisma.treasuryBank.findMany();
  banks.forEach(b => console.log(`Bank: ${b.name}, Balance: ${b.balance}, ID: ${b.id}`));

  console.log("\n--- Transaction Counts ---");
  const journalEntries = await prisma.journalEntry.count();
  const journalItems = await prisma.journalItem.count();
  const salesInvoices = await prisma.salesInvoice.count();
  const purchaseInvoices = await prisma.purchaseInvoice.count();
  const receipts = await prisma.receiptVoucher.count();
  const payments = await prisma.paymentVoucher.count();

  console.log(`Journal Entries: ${journalEntries}`);
  console.log(`Journal Items: ${journalItems}`);
  console.log(`Sales Invoices: ${salesInvoices}`);
  console.log(`Purchase Invoices: ${purchaseInvoices}`);
  console.log(`Receipt Vouchers: ${receipts}`);
  console.log(`Payment Vouchers: ${payments}`);

  console.log("\n--- Product Stock levels (Top 5 non-zero) ---");
  const products = await prisma.product.findMany({
    where: { currentStock: { not: 0 } },
    take: 5
  });
  products.forEach(p => console.log(`Product: ${p.name}, Stock: ${p.currentStock}`));

  await prisma.$disconnect();
}

main();
