import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const tenants = await prisma.$queryRawUnsafe("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'") as any[];
  for (const t of tenants) {
    const s = t.schema_name;
    const tables: any[] = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = '${s}'
    `) as any[];
    
    let accountCount = 0;
    if (tables.find(tbl => tbl.table_name === 'Account')) {
       const res = await prisma.$queryRawUnsafe(`SELECT count(*) as c FROM "${s}"."Account"`) as any[];
       accountCount = Number(res[0].c);
    }
    
    console.log(`Schema: ${s} | Tables: ${tables.length} | Accounts: ${accountCount}`);
  }
  await prisma.$disconnect();
}
check();
