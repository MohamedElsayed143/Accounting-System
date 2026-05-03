import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const schema = 'tenant_____________1777296689828';
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = '${schema}'
  `) as any[];
  console.log('Tables in', schema, ':', tables.map(t => t.table_name));
  await prisma.$disconnect();
}
check();
