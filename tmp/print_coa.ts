import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const roots = await p.account.findMany({ where: { parentId: null } });
  for (const root of roots) {
    console.log(`${root.code} ${root.name}`);
    const children = await p.account.findMany({ where: { parentId: root.id } });
    for (const c of children) {
      console.log(`  ${c.code} ${c.name}`);
      const grandchildren = await p.account.findMany({ where: { parentId: c.id } });
      for (const gc of grandchildren) {
        console.log(`    ${gc.code} ${gc.name}`);
      }
    }
  }
  await p.$disconnect();
}

main();
