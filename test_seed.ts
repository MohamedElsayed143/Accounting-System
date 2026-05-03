import { getPrismaForSchema } from './src/lib/tenant-prisma';
import { seedTenantData } from './prisma/seed';

async function test() {
  const schema = 'tenant_____________1777811208711';
  console.log(`Seeding ${schema}...`);
  const tenantPrisma = getPrismaForSchema(schema);
  await tenantPrisma.$transaction(async (tx) => {
    await seedTenantData(tx, schema);
  }, { timeout: 60000 });
  console.log('Done!');
}
test().catch(console.error);
