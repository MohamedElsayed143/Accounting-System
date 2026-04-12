const fs = require('fs');
const path = require('path');

const filesToMigrate = [
  "src/app/(dashboard)/customers/actions.tsx",
  "src/app/(dashboard)/suppliers/actions.tsx",
  "src/app/(dashboard)/ledger/actions.ts",
  "src/app/(dashboard)/statistics/actions.tsx",
  "src/app/(dashboard)/sales-invoices/actions.tsx",
  "src/app/(dashboard)/sales-returns/actions.tsx",
  "src/app/(dashboard)/sales-quotations/actions.ts",
  "src/app/(dashboard)/purchase-invoices/actions.ts",
  "src/app/(dashboard)/purchase-returns/actions.tsx",
  "src/app/(dashboard)/inventory/products/actions.ts",
  "src/app/(dashboard)/inventory/categories/actions.ts",
  "src/app/(dashboard)/inventory/stock/actions.ts",
  "src/app/(dashboard)/inventory/movements/actions.ts",
  "src/app/(dashboard)/inventory/adjustments/actions.ts",
  "src/app/(dashboard)/notifications/actions.ts",
  "src/app/(dashboard)/reports/actions.tsx",
  "src/app/(dashboard)/reports/trial-balance/actions.ts",
  "src/app/(dashboard)/pending-invoices/actions.tsx",
  "src/app/(dashboard)/treasury/actions.tsx",
  "src/app/(dashboard)/treasury/transfers/actions.tsx",
  "src/app/(dashboard)/treasury/payment-voucher/actions.tsx",
  "src/app/actions/journal.ts",
  "src/app/actions/search.ts",
  "src/app/(dashboard)/settings/actions.ts"
];

for (const rel of filesToMigrate) {
  const absolutePath = path.resolve(rel);
  if (!fs.existsSync(absolutePath)) {
    console.log("SKIP (not found):", rel);
    continue;
  }

  let content = fs.readFileSync(absolutePath, "utf-8");

  if (!content.includes('from "@/lib/prisma"')) {
    console.log("SKIP (no match):", rel);
    continue;
  }

  // 1. Replace the import statement
  content = content.replace(
    /import.*(?:\{.*?prisma.*?\}|prisma).*from\s*["']@\/lib\/prisma["'];?/,
    'import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";'
  );

  // 2. Replace user and session accesses with publicPrisma
  content = content.replace(/\bprisma\.(user|session|systemConfig)\b/g, "publicPrisma.$1");

  // 3. Replace remaining prisma. accesses with (await getTenantPrisma()).
  // We use regex to ensure we don't replace things like 'Prisma.' (handled by \b = word boundary, but prisma is lower case here).
  // Wait, if someone has 'const my_prisma = prisma', it's problematic, but we only have 'prisma.X'
  content = content.replace(/\bprisma(?=\.)/g, "(await getTenantPrisma())");

  fs.writeFileSync(absolutePath, content, "utf-8");
  console.log("UPDATED:", rel);
}
console.log("Done.");
