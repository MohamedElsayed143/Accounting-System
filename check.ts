import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const tenants = await prisma.$queryRawUnsafe("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'") as any[];
  for (const t of tenants) {
    const s = t.schema_name;
    const res = await prisma.$queryRawUnsafe(`SELECT count(*) as c FROM "${s}"."Account"`) as any[];
    console.log(s, 'Accounts:', res[0].c);
  }
  const pub = await prisma.$queryRawUnsafe(`SELECT count(*) as c FROM "public"."Account"`) as any[];
  console.log('public Accounts:', pub[0].c);
  await prisma.$disconnect();
}
check();
