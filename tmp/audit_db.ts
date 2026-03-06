import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Database Audit ---')
  
  const users = await prisma.user.findMany()
  console.log('Users:', users.map(u => ({ id: u.id, username: u.username, role: u.role })))
  
  const systemSettings = await prisma.systemSettings.findUnique({ where: { id: 1 } })
  console.log('SystemSettings (id:1) exists:', !!systemSettings)
  
  const companySettings = await prisma.companySettings.findUnique({ where: { id: 1 } })
  console.log('CompanySettings (id:1) exists:', !!companySettings)
  
  const safes = await prisma.treasurySafe.findMany()
  console.log('Safes count:', safes.length)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
