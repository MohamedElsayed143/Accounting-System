import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Account Groups ---');
  const groups = await prisma.account.findMany({
    where: {
      code: { in: ['1201', '1202', '2101', '1205'] }
    }
  });
  console.log('Groups found:', groups.map(g => ({ code: g.code, name: g.name, id: g.id })));

  console.log('--- Checking Customers ---');
  const customers = await prisma.customer.findMany();
  console.log('Customers count:', customers.length);
  if (customers.length > 0) {
    console.log('Last Customer:', JSON.stringify(customers[customers.length - 1], null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
