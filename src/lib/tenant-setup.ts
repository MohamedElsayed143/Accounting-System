import { execSync } from "child_process";
import { publicPrisma } from "@/lib/tenant-prisma";
import path from "path";
import fs from "fs";

export async function setupNewTenantSchema(tenantSchema: string): Promise<void> {
  // ── 1. Create PostgreSQL schema ────────────────────────────────────────
  await publicPrisma.$executeRawUnsafe(
    `CREATE SCHEMA IF NOT EXISTS "${tenantSchema}"`
  );

  // ── 2. Get base DATABASE_URL and build tenant URL ─────────────────────
  const baseUrl = process.env.DATABASE_URL ?? "";
  const cleanUrl = baseUrl
    .replace(/([?&])schema=[^&]*/g, "")
    .replace(/\?$/, "");
  const separator = cleanUrl.includes("?") ? "&" : "?";
  const tenantUrl = `${cleanUrl}${separator}schema=${tenantSchema}`;

  const projectRoot = path.resolve(process.cwd());
  const env = { ...process.env, DATABASE_URL: tenantUrl };

  // ── 3. Push Prisma schema to the new tenant schema ────────────────────
  console.log(`[Multi-Tenant] Pushing tables to schema: ${tenantSchema}`);
  execSync("npx prisma db push --accept-data-loss --skip-generate", {
    cwd: projectRoot,
    env,
    stdio: "pipe",
    timeout: 60_000,
  });

  // ── 4. Seed the default Chart of Accounts ─────────────────────────────
  console.log(`[Multi-Tenant] Seeding default COA for: ${tenantSchema}`);
  const seedCoaPath = path.join(projectRoot, "prisma", "seed_coa.ts");
  if (fs.existsSync(seedCoaPath)) {
    execSync(
      `npx ts-node --project tsconfig.json --transpile-only prisma/seed_coa.ts`,
      {
        cwd: projectRoot,
        env,
        stdio: "pipe",
        timeout: 60_000,
      }
    );
  }
  
  // ── 5. Sync the owner user to the tenant schema ─────────────────────────
  console.log(`[Multi-Tenant] Syncing owner user to: ${tenantSchema}`);
  const ownerUsers = await publicPrisma.user.findMany({
    where: { tenantSchema: tenantSchema }
  });
  
  const tenantDb = require("./tenant-prisma").getPrismaForSchema(tenantSchema);
  for (const u of ownerUsers) {
    await tenantDb.user.upsert({
      where: { id: u.id },
      update: { ...u, authorizedDevices: u.authorizedDevices || [] },
      create: { ...u, authorizedDevices: u.authorizedDevices || [] }
    });
  }

  console.log(`[Multi-Tenant] Setup complete for: ${tenantSchema}`);
}
