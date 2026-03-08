import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- General Settings ---');
  const settings = await (prisma as any).generalSettings.findFirst({ where: { id: 1 } });
  console.log(JSON.stringify(settings, null, 2));

  console.log('\n--- Products (Top 5) ---');
  const products = await prisma.product.findMany({
    take: 5,
    select: { id: true, name: true, currentStock: true, minStock: true }
  });
  console.log(JSON.stringify(products, null, 2));

  console.log('\n--- Safes ---');
  const safes = await prisma.treasurySafe.findMany({
    select: { id: true, name: true, balance: true }
  });
  console.log(JSON.stringify(safes, null, 2));

  console.log('\n--- Banks ---');
  const banks = await prisma.treasuryBank.findMany({
    select: { id: true, name: true, balance: true }
  });
  console.log(JSON.stringify(banks, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
