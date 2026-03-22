import { PrismaClient, AccountType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 جارٍ إنشاء شجرة الحسابات (COA)...')

  // 1. الأصول (Assets)
  const assets = await prisma.account.upsert({
    where: { code: '1' },
    update: {},
    create: {
      code: '1',
      name: 'الأصول',
      nameEn: 'Assets',
      type: 'ASSET',
      isSelectable: false,
      level: 1,
    }
  })

  // 11. الأصول المتداولة
  const currentAssets = await prisma.account.upsert({
    where: { code: '11' },
    update: {},
    create: {
      code: '11',
      name: 'الأصول المتداولة',
      nameEn: 'Current Assets',
      type: 'ASSET',
      parentId: assets.id,
      isSelectable: false,
      level: 2,
    }
  })

  // 1101. النقدية في الخزينة (Parent)
  const cashInHand = await prisma.account.upsert({
    where: { code: '1101' },
    update: { isSelectable: false },
    create: {
      code: '1101',
      name: 'النقدية في الخزينة',
      nameEn: 'Cash in Hand',
      type: 'ASSET',
      parentId: currentAssets.id,
      isSelectable: false,
      level: 3,
    }
  })

  // 110101. الخزينة الرئيسية (Leaf)
  const mainSafeAccount = await prisma.account.upsert({
    where: { code: '110101' },
    update: {},
    create: {
      code: '110101',
      name: 'الخزينة الرئيسية',
      nameEn: 'Main Safe',
      type: 'ASSET',
      parentId: cashInHand.id,
      isSelectable: true,
      level: 4,
    }
  })

  // ربط الخزنة الرئيسية بحساب الخزينة الرئيسية (110101)
  const primarySafe = await prisma.treasurySafe.findFirst({
    where: { OR: [{ isPrimary: true }, { id: 1 }] }
  })
  
  if (primarySafe) {
    // 1. Unlink ANY other safes that might currently be using this accountId to avoid P2002
    await prisma.treasurySafe.updateMany({
      where: { 
        accountId: mainSafeAccount.id,
        id: { not: primarySafe.id }
      },
      data: { accountId: null }
    });

    // 2. Link the primary safe to the new leaf account
    await prisma.treasurySafe.update({
      where: { id: primarySafe.id },
      data: { accountId: mainSafeAccount.id, isPrimary: true }
    })
    console.log(`✅ تم ربط الخزنة الرئيسية (${primarySafe.name}) بحساب ${mainSafeAccount.name} (${mainSafeAccount.code})`)
  }

  // 1102. البنوك (Parent)
  await prisma.account.upsert({
    where: { code: '1102' },
    update: { isSelectable: false },
    create: {
      code: '1102',
      name: 'البنوك',
      nameEn: 'Banks',
      type: 'ASSET',
      parentId: currentAssets.id,
      isSelectable: false,
      level: 3,
    }
  })

  // 2. الخصوم (Liabilities)
  const liabilities = await prisma.account.upsert({
    where: { code: '2' },
    update: {},
    create: {
      code: '2',
      name: 'الخصوم',
      nameEn: 'Liabilities',
      type: 'LIABILITY',
      isSelectable: false,
      level: 1,
    }
  })

  // 3. حقوق الملكية (Equity)
  const equity = await prisma.account.upsert({
    where: { code: '3' },
    update: {},
    create: {
      code: '3',
      name: 'حقوق الملكية',
      nameEn: 'Equity',
      type: 'EQUITY',
      isSelectable: false,
      level: 1,
    }
  })

  // 4. الإيرادات (Revenue)
  const revenue = await prisma.account.upsert({
    where: { code: '4' },
    update: {},
    create: {
      code: '4',
      name: 'الإيرادات',
      nameEn: 'Revenue',
      type: 'REVENUE',
      isSelectable: false,
      level: 1,
    }
  })

  // 5. المصروفات (Expenses)
  const expenses = await prisma.account.upsert({
    where: { code: '5' },
    update: {},
    create: {
      code: '5',
      name: 'المصروفات',
      nameEn: 'Expenses',
      type: 'EXPENSE',
      isSelectable: false,
      level: 1,
    }
  })

  console.log('✅ تم إنشاء شجرة الحسابات بنجاح')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
