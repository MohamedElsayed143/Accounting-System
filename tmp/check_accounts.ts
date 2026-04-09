import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany({
    where: {
      OR: [
        { code: { startsWith: '6' } },
        { code: '120301' },
      ],
    },
    select: { id: true, name: true, code: true, level: true },
  });
  console.log(JSON.stringify(accounts, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
