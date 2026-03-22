import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const accounts = await p.account.findMany({
    include: { treasurySafe: true, treasuryBank: true }
  });
  const filtered = accounts.filter(a => a.treasurySafe || a.treasuryBank);
  console.log(JSON.stringify(filtered, null, 2));
  await p.$disconnect();
}

main();
