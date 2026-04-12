const fs = require('fs');
const path = require('path');

const filesToFix = [
  "src/app/(dashboard)/settings/actions.ts",
  "src/app/(dashboard)/treasury/actions.tsx",
  "src/app/(dashboard)/treasury/payment-voucher/actions.tsx"
];

for (const rel of filesToFix) {
  const absolutePath = path.resolve(rel);
  if (!fs.existsSync(absolutePath)) continue;

  let content = fs.readFileSync(absolutePath, "utf-8");

  // Replaces occurrences of (prisma as any) with (db as any)
  // and attempts to ensure const db is instantiated.
  content = content.replace(/\(prisma as any\)/g, "(await getTenantPrisma() as any)");
  
  fs.writeFileSync(absolutePath, content, "utf-8");
  console.log("FIXED:", rel);
}
