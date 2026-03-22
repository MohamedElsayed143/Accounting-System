import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const safes = await prisma.treasurySafe.findMany();
  console.log("Safes:", safes);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
