import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const safes = await prisma.treasurySafe.findMany({
    include: { account: true }
  })
  
  console.log("Safes:");
  safes.forEach(s => {
    console.log(`- Safe ID: ${s.id}, Name: ${s.name}, Account ID: ${s.accountId}, Account Name: ${s.account?.name}`)
  })

  console.log("-----------------------------------------");

  const accounts = await prisma.account.findMany({
    where: {
      OR: [
        { name: { contains: "خزينة" } },
        { name: { contains: "نقدية" } },
        { name: { contains: "صندوق" } },
        { name: { contains: "البنك" } },
        { name: { contains: "بنك" } }
      ]
    },
    include: {
      treasurySafe: true,
      treasuryBank: true
    }
  })
  
  console.log("Accounts related to cash/banks:");
  accounts.forEach(a => {
    console.log(`- Account ID: ${a.id}, Code: ${a.code}, Name: ${a.name}, isSelectable: ${a.isSelectable}, parentId: ${a.parentId}`);
    if (a.treasurySafe) console.log(`    -> Linked Safe: ${a.treasurySafe.name}`);
    if (a.treasuryBank) console.log(`    -> Linked Bank: ${a.treasuryBank.name}`);
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
