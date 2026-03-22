import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const accounts = await prisma.account.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, parentId: true }
  })
  
  console.log(JSON.stringify(accounts, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
