import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const leafAccounts = await prisma.account.findMany({
    where: { isSelectable: true },
    select: { id: true, name: true, code: true, type: true }
  });
  console.log(JSON.stringify(leafAccounts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
