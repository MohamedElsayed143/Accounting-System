import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const safes = await prisma.treasurySafe.findMany({
    include: { account: true }
  })
  
  console.log("Safes:");
  console.log(JSON.stringify(safes, null, 2))

  const banks = await prisma.treasuryBank.findMany({
    include: { account: true }
  })
  
  console.log("\nBanks:");
  console.log(JSON.stringify(banks, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
