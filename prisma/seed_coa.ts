import { PrismaClient, AccountType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 جارٍ إنشاء شجرة الحسابات (COA)...')

  // --- 1. الأصول (Assets) ---
  const assets = await prisma.account.upsert({
    where: { code: '1' },
    update: { level: 1, isTerminal: false, isSelectable: false },
    create: { code: '1', name: 'الأصول', nameEn: 'Assets', type: 'ASSET', level: 1, isTerminal: false, isSelectable: false }
  })

  // 11. الأصول المتداولة (L2)
  const currentAssets = await prisma.account.upsert({
    where: { code: '11' },
    update: { level: 2, isTerminal: false, isSelectable: false },
    create: { code: '11', name: 'الأصول المتداولة', nameEn: 'Current Assets', type: 'ASSET', parentId: assets.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // 1101. النقدية (L3)
  const cashGroup = await prisma.account.upsert({
    where: { code: '1101' },
    update: { level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1101', name: 'النقدية بالخزينة', nameEn: 'Cash on Hand', type: 'ASSET', parentId: currentAssets.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 110101. الخزينة الرئيسية (L4 - Terminal)
  const mainSafeAccount = await prisma.account.upsert({
    where: { code: '110101' },
    update: { level: 4, isTerminal: true, isSelectable: true },
    create: { code: '110101', name: 'الخزينة الرئيسية', nameEn: 'Main Safe', type: 'ASSET', parentId: cashGroup.id, level: 4, isTerminal: true, isSelectable: true }
  })

  // 1102. البنوك (L3)
  await prisma.account.upsert({
    where: { code: '1102' },
    update: { level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1102', name: 'البنوك', nameEn: 'Banks', type: 'ASSET', parentId: currentAssets.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 1103. العملاء (L3)
  await prisma.account.upsert({
    where: { code: '1103' },
    update: { level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1103', name: 'العملاء', nameEn: 'Customers', type: 'ASSET', parentId: currentAssets.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 12. الأصول الثابتة (L2)
  const fixedAssets = await prisma.account.upsert({
    where: { code: '12' },
    update: { level: 2, isTerminal: false, isSelectable: false },
    create: { code: '12', name: 'الأصول الثابتة', nameEn: 'Fixed Assets', type: 'ASSET', parentId: assets.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // 1201. الأراضي والعقارات (L3)
  await prisma.account.upsert({
    where: { code: '1201' },
    update: { level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1201', name: 'الأراضي والعقارات', nameEn: 'Land & Buildings', type: 'ASSET', parentId: fixedAssets.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- 2. الخصوم (Liabilities) ---
  const liabilities = await prisma.account.upsert({
    where: { code: '2' },
    update: { level: 1, isTerminal: false, isSelectable: false },
    create: { code: '2', name: 'الخصوم', nameEn: 'Liabilities', type: 'LIABILITY', level: 1, isTerminal: false, isSelectable: false }
  })

  // 21. الخصوم المتداولة (L2)
  const currentLiabilities = await prisma.account.upsert({
    where: { code: '21' },
    update: { level: 2, isTerminal: false, isSelectable: false },
    create: { code: '21', name: 'الخصوم المتداولة', nameEn: 'Current Liabilities', type: 'LIABILITY', parentId: liabilities.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // 2101. الموردون (L3)
  await prisma.account.upsert({
    where: { code: '2101' },
    update: { level: 3, isTerminal: false, isSelectable: false },
    create: { code: '2101', name: 'الموردون', nameEn: 'Suppliers', type: 'LIABILITY', parentId: currentLiabilities.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- 3. حقوق الملكية (Equity) ---
  const equity = await prisma.account.upsert({
    where: { code: '3' },
    update: { level: 1, isTerminal: false, isSelectable: false },
    create: { code: '3', name: 'حقوق الملكية', nameEn: 'Equity', type: 'EQUITY', level: 1, isTerminal: false, isSelectable: false }
  })

  // 31. رأس المال (L2)
  const capital = await prisma.account.upsert({
    where: { code: '31' },
    update: { level: 2, isTerminal: false, isSelectable: false },
    create: { code: '31', name: 'رأس المال', nameEn: 'Capital', type: 'EQUITY', parentId: equity.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // 3101. رأس المال المدفوع (L3)
  await prisma.account.upsert({
    where: { code: '3101' },
    update: { level: 3, isTerminal: false, isSelectable: false },
    create: { code: '3101', name: 'رأس المال المدفوع', nameEn: 'Paid-up Capital', type: 'EQUITY', parentId: capital.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- 4. الإيرادات (Revenue) ---
  const revenue = await prisma.account.upsert({
    where: { code: '4' },
    update: { level: 1, isTerminal: false, isSelectable: false },
    create: { code: '4', name: 'الإيرادات', nameEn: 'Revenue', type: 'REVENUE', level: 1, isTerminal: false, isSelectable: false }
  })

  // 41. إيرادات النشاط (L2)
  const industrialRevenue = await prisma.account.upsert({
    where: { code: '41' },
    update: { level: 2, isTerminal: false, isSelectable: false },
    create: { code: '41', name: 'إيرادات النشاط', nameEn: 'Operating Revenue', type: 'REVENUE', parentId: revenue.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // 4101. مبيعات البضائع (L3)
  await prisma.account.upsert({
    where: { code: '4101' },
    update: { level: 3, isTerminal: false, isSelectable: false },
    create: { code: '4101', name: 'مبيعات البضائع', nameEn: 'Sales of Goods', type: 'REVENUE', parentId: industrialRevenue.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- 5. المصروفات (Expenses) ---
  const expenses = await prisma.account.upsert({
    where: { code: '5' },
    update: { level: 1, isTerminal: false, isSelectable: false },
    create: { code: '5', name: 'المصروفات', nameEn: 'Expenses', type: 'EXPENSE', level: 1, isTerminal: false, isSelectable: false }
  })

  // 51. مصروفات تشغيلية (L2)
  const operatingExpenses = await prisma.account.upsert({
    where: { code: '51' },
    update: { level: 2, isTerminal: false, isSelectable: false },
    create: { code: '51', name: 'مصروفات تشغيلية', nameEn: 'Operating Expenses', type: 'EXPENSE', parentId: expenses.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // 5101. الرواتب والأجور (L3)
  await prisma.account.upsert({
    where: { code: '5101' },
    update: { level: 3, isTerminal: false, isSelectable: false },
    create: { code: '5101', name: 'الرواتب والأجور', nameEn: 'Salaries & Wages', type: 'EXPENSE', parentId: operatingExpenses.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- Treasuries Linkage ---
  const primarySafe = await prisma.treasurySafe.findFirst({
    where: { OR: [{ isPrimary: true }, { id: 1 }] }
  })
  if (primarySafe) {
    await prisma.treasurySafe.update({
      where: { id: primarySafe.id },
      data: { accountId: mainSafeAccount.id, isPrimary: true }
    })
    console.log(`✅ تم ربط الخزنة الرئيسية بحساب ${mainSafeAccount.name}`)
  }

  console.log('🌱 تم إنشاء شجرة الحسابات بنجاح!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
