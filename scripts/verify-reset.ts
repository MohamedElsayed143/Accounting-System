import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accountCount = await prisma.account.count();
  const entryCount = await prisma.journalEntry.count();
  const safeCount = await prisma.treasurySafe.count();
  const productCount = await prisma.product.count();
  const salesInvoiceCount = await prisma.salesInvoice.count();
  const purchaseInvoiceCount = await prisma.purchaseInvoice.count();
  const companySettings = await prisma.companySettings.findFirst();

  console.log('\n=== ✅ Database Reset Verification ===');
  console.table({
    'Accounts (COA)':        accountCount,
    'Journal Entries':       entryCount,
    'Safes':                 safeCount,
    'Products':              productCount,
    'Sales Invoices':        salesInvoiceCount,
    'Purchase Invoices':     purchaseInvoiceCount,
  });
  console.log('\nCompany Settings:', companySettings?.companyName ?? '(none)');
  console.log('=====================================\n');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
