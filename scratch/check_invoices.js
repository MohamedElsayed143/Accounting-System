
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.salesInvoice.count();
  console.log('Total sales invoices:', count);
  const latest = await prisma.salesInvoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Latest invoices:', JSON.stringify(latest, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
