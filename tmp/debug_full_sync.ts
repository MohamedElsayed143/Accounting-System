import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  console.log("--- ALL ACCOUNTS ---");
  const accounts = await p.account.findMany();
  console.log(JSON.stringify(accounts.map(a => ({ id: a.id, code: a.code, name: a.name })), null, 2));

  console.log("\n--- ALL SAFES ---");
  const safes = await p.treasurySafe.findMany();
  console.log(JSON.stringify(safes.map(s => ({ id: s.id, name: s.name, accountId: s.accountId })), null, 2));

  await p.$disconnect();
}

main();
