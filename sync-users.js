const { PrismaClient } = require('@prisma/client');
const publicPrisma = new PrismaClient();

async function syncUsers() {
  const users = await publicPrisma.user.findMany({
    where: { tenantSchema: { not: null } }
  });

  for (const u of users) {
    const tenantUrl = process.env.DATABASE_URL.replace(/([?&])schema=[^&]*/g, "").replace(/\?$/, "") + "?schema=" + u.tenantSchema;
    const tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantUrl } } });
    
    // Check if table exists
    try {
        await tenantPrisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1`;
        console.log("Syncing user", u.username, "to", u.tenantSchema);
        await tenantPrisma.user.upsert({
          where: { id: u.id },
          update: { ...u, authorizedDevices: u.authorizedDevices || [] },
          create: { ...u, authorizedDevices: u.authorizedDevices || [] }
        });
    } catch (e) {
        console.log("Skipping", u.tenantSchema, "as it might not be initialized yet.");
    }
    
    await tenantPrisma.$disconnect();
  }
  
  await publicPrisma.$disconnect();
}

syncUsers().catch(console.error);
