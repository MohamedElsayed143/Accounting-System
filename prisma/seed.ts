import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 بدء إنشاء البيانات الافتراضية...')

  // 1. الخزنة الرئيسية (Treasury Safe)
  const safe = await prisma.treasurySafe.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "الخزنة الرئيسية",
      balance: 0,
      description: "الخزنة الثابتة للنظام - يتم إنشاؤها تلقائياً",
      isPrimary: true,
    },
  })
  console.log('✅ تم إنشاء الخزنة الرئيسية')

  // 2. شجرة الحسابات (Chart of Accounts - 4 Levels)
  console.log('📊 إنشاء شجرة الحسابات (4 مستويات)...')

  // --- المستوى الأول (L1) ---
  const assets = await prisma.account.upsert({
    where: { code: '1' },
    update: { level: 1, isTerminal: false, isSelectable: false },
    create: { code: '1', name: 'الأصول', nameEn: 'Assets', type: 'ASSET', level: 1, isTerminal: false, isSelectable: false }
  })

  const liabilities = await prisma.account.upsert({
    where: { code: '2' },
    update: { level: 1, isTerminal: false, isSelectable: false },
    create: { code: '2', name: 'الخصوم', nameEn: 'Liabilities', type: 'LIABILITY', level: 1, isTerminal: false, isSelectable: false }
  })

  const equity = await prisma.account.upsert({
    where: { code: '3' },
    update: { level: 1, isTerminal: false, isSelectable: false },
    create: { code: '3', name: 'حقوق الملكية', nameEn: 'Equity', type: 'EQUITY', level: 1, isTerminal: false, isSelectable: false }
  })

  const revenue = await prisma.account.upsert({
    where: { code: '4' },
    update: { level: 1, isTerminal: false, isSelectable: false },
    create: { code: '4', name: 'الإيرادات', nameEn: 'Revenue', type: 'REVENUE', level: 1, isTerminal: false, isSelectable: false }
  })

  const expenses = await prisma.account.upsert({
    where: { code: '5' },
    update: { level: 1, isTerminal: false, isSelectable: false },
    create: { code: '5', name: 'المصروفات', nameEn: 'Expenses', type: 'EXPENSE', level: 1, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثاني (L2) - أصول ثابتة (11) ---
  const fixedAssets = await prisma.account.upsert({
    where: { code: '11' },
    update: { name: 'الأصول الثابتة', nameEn: 'Fixed Assets', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '11', name: 'الأصول الثابتة', nameEn: 'Fixed Assets', type: 'ASSET', parentId: assets.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثالث (L3) - الأصول الثابتة ---
  await prisma.account.upsert({
    where: { code: '1101' },
    update: { name: 'العقارات والاراضي', nameEn: 'Real Estate & Land', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1101', name: 'العقارات والاراضي', nameEn: 'Real Estate & Land', type: 'ASSET', parentId: fixedAssets.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '1102' },
    update: { name: 'الآلات والمعدات', nameEn: 'Machinery & Equipment', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1102', name: 'الآلات والمعدات', nameEn: 'Machinery & Equipment', type: 'ASSET', parentId: fixedAssets.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '1103' },
    update: { name: 'السيارات ووسائل النقل', nameEn: 'Cars & Transportation', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1103', name: 'السيارات ووسائل النقل', nameEn: 'Cars & Transportation', type: 'ASSET', parentId: fixedAssets.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '1104' },
    update: { name: 'الأثاث والمفروشات', nameEn: 'Furniture & Fixtures', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1104', name: 'الأثاث والمفروشات', nameEn: 'Furniture & Fixtures', type: 'ASSET', parentId: fixedAssets.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثاني (L2) - أصول متداولة (12) ---
  const currentAssets = await prisma.account.upsert({
    where: { code: '12' },
    update: { name: 'الأصول المتداولة', nameEn: 'Current Assets', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '12', name: 'الأصول المتداولة', nameEn: 'Current Assets', type: 'ASSET', parentId: assets.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثالث (L3) - الأصول المتداولة ---
  const cashGroup = await prisma.account.upsert({
    where: { code: '1201' },
    update: { name: 'النقدية بالخزينة', nameEn: 'Cash on Hand', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1201', name: 'النقدية بالخزينة', nameEn: 'Cash on Hand', type: 'ASSET', parentId: currentAssets.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // تنظيف الحساب القديم في حال وجوده بالخطأ تحت الأصول الثابتة
  await prisma.account.deleteMany({
    where: { code: '110101' }
  })

  // Ensure we have at least one terminal account for the treasury
  const mainCashAccount = await prisma.account.upsert({
    where: { code: '120101' },
    update: {
      name: 'الخزينة الرئيسية',
      parentId: cashGroup.id,
      level: 4,
      isTerminal: true,
      isSelectable: true
    },
    create: {
      code: '120101',
      name: 'الخزينة الرئيسية',
      nameEn: 'Main Safe',
      type: 'ASSET',
      parentId: cashGroup.id,
      level: 4,
      isTerminal: true,
      isSelectable: true
    }
  })

  await prisma.account.upsert({
    where: { code: '1202' },
    update: { name: 'العملاء والمدينون', nameEn: 'Customers & Debtors', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1202', name: 'العملاء والمدينون', nameEn: 'Customers & Debtors', type: 'ASSET', parentId: currentAssets.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '1203' },
    update: { name: 'المخزون السلعي', nameEn: 'Inventory', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1203', name: 'المخزون السلعي', nameEn: 'Inventory', type: 'ASSET', parentId: currentAssets.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '1204' },
    update: { name: 'مصروفات مدفوعة مقدماً', nameEn: 'Prepaid Expenses', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1204', name: 'مصروفات مدفوعة مقدماً', nameEn: 'Prepaid Expenses', type: 'ASSET', parentId: currentAssets.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثاني (L2) - الخصوم المتداولة (21) ---
  const currentLiabilities = await prisma.account.upsert({
    where: { code: '21' },
    update: { name: 'الخصوم المتداولة', nameEn: 'Current Liabilities', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '21', name: 'الخصوم المتداولة', nameEn: 'Current Liabilities', type: 'LIABILITY', parentId: liabilities.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثالث (L3) - الخصوم المتداولة ---
  await prisma.account.upsert({
    where: { code: '2101' },
    update: { name: 'الدائنون', nameEn: 'Creditors', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '2101', name: 'الدائنون', nameEn: 'Creditors', type: 'LIABILITY', parentId: currentLiabilities.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '2102' },
    update: { name: 'قروض قصيرة الأجل', nameEn: 'Short-term Loans', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '2102', name: 'قروض قصيرة الأجل', nameEn: 'Short-term Loans', type: 'LIABILITY', parentId: currentLiabilities.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '2103' },
    update: { name: 'إيرادات مقدمة', nameEn: 'Advanced Revenue', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '2103', name: 'إيرادات مقدمة', nameEn: 'Advanced Revenue', type: 'LIABILITY', parentId: currentLiabilities.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثاني (L2) - الخصوم طويلة الأجل (22) ---
  const longTermLiabilities = await prisma.account.upsert({
    where: { code: '22' },
    update: { name: 'الخصوم طويلة الأجل', nameEn: 'Long-term Liabilities', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '22', name: 'الخصوم طويلة الأجل', nameEn: 'Long-term Liabilities', type: 'LIABILITY', parentId: liabilities.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثالث (L3) - الخصوم طويلة الأجل ---
  await prisma.account.upsert({
    where: { code: '2201' },
    update: { name: 'قروض طويلة الأجل', nameEn: 'Long-term Loans', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '2201', name: 'قروض طويلة الأجل', nameEn: 'Long-term Loans', type: 'LIABILITY', parentId: longTermLiabilities.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '2202' },
    update: { name: 'التزامات المستقبلية', nameEn: 'Future Liabilities', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '2202', name: 'التزامات المستقبلية', nameEn: 'Future Liabilities', type: 'LIABILITY', parentId: longTermLiabilities.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- تنظيف حسابات حقوق الملكية (L1-L3) لضمان الحالة المطلوبة فقط ---
  await prisma.account.deleteMany({
    where: { 
      type: 'EQUITY',
      level: { gt: 1 }
    }
  })

  // --- المستوى الثاني (L2) - حقوق الملكية: 4 حسابات رئيسية مباشرة ---
  const capitalL2 = await prisma.account.upsert({
    where: { code: '31' },
    update: { name: 'رأس المال', nameEn: 'Capital', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '31', name: 'رأس المال', nameEn: 'Capital', type: 'EQUITY', parentId: equity.id, level: 2, isTerminal: false, isSelectable: false }
  })

  const retainedL2 = await prisma.account.upsert({
    where: { code: '32' },
    update: { name: 'الأرباح المحتجزة', nameEn: 'Retained Earnings', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '32', name: 'الأرباح المحتجزة', nameEn: 'Retained Earnings', type: 'EQUITY', parentId: equity.id, level: 2, isTerminal: false, isSelectable: false }
  })

  const reservesL2 = await prisma.account.upsert({
    where: { code: '33' },
    update: { name: 'الاحتياطات', nameEn: 'Reserves', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '33', name: 'الاحتياطات', nameEn: 'Reserves', type: 'EQUITY', parentId: equity.id, level: 2, isTerminal: false, isSelectable: false }
  })

  const dividendsL2 = await prisma.account.upsert({
    where: { code: '34' },
    update: { name: 'توزيعات الأرباح', nameEn: 'Dividends', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '34', name: 'توزيعات الأرباح', nameEn: 'Dividends', type: 'EQUITY', parentId: equity.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثاني (L2) - إيرادات النشاط ---
  const operatingRevenue = await prisma.account.upsert({
    where: { code: '41' },
    update: { level: 2, isTerminal: false, isSelectable: false },
    create: { code: '41', name: 'إيرادات النشاط', nameEn: 'Operating Revenue', type: 'REVENUE', parentId: revenue.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثالث (L3) - مبيعات البضائع ---
  await prisma.account.upsert({
    where: { code: '4101' },
    update: { level: 3, isTerminal: false, isSelectable: false },
    create: { code: '4101', name: 'مبيعات البضائع', nameEn: 'Sales of Goods', type: 'REVENUE', parentId: operatingRevenue.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثاني (L2) - مصروفات تشغيلية ---
  const operatingExpenses = await prisma.account.upsert({
    where: { code: '51' },
    update: { level: 2, isTerminal: false, isSelectable: false },
    create: { code: '51', name: 'مصروفات تشغيلية', nameEn: 'Operating Expenses', type: 'EXPENSE', parentId: expenses.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثالث (L3) - الرواتب والأجور ---
  await prisma.account.upsert({
    where: { code: '5101' },
    update: { level: 3, isTerminal: false, isSelectable: false },
    create: { code: '5101', name: 'الرواتب والأجور', nameEn: 'Salaries & Wages', type: 'EXPENSE', parentId: operatingExpenses.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الرابع (L4) - الخزينة الرئيسية (Terminal User Leaf) ---
  const mainSafeAccount = await prisma.account.upsert({
    where: { code: '110101' },
    update: { level: 4, isTerminal: true, isSelectable: true },
    create: { code: '110101', name: 'الخزينة الرئيسية', nameEn: 'Main Safe', type: 'ASSET', parentId: cashGroup.id, level: 4, isTerminal: true, isSelectable: true }
  })

  // ربط الخزنة الرئيسية بالحساب المحاسبي
  await prisma.treasurySafe.update({
    where: { id: safe.id },
    data: { accountId: mainSafeAccount.id }
  })

  console.log('✅ تم إنشاء شجرة الحسابات وربط الخزن')

  // 3. إعدادات النظام
  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      settings: {
        rbac: { roles: { worker: { label: "موظف", permissions: { sales_view: true, sales_create: true, sales_quotations_view: true, sales_pending_view: true, customers_view: true, treasury_vouchers: true, inventory_view: true } } } }
      }
    }
  })

  // 4. إعدادات الشركة
  await prisma.companySettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: "شركة المحاسبة الحديثة",
      companyNameEn: "Modern Accounting Co.",
      currencyCode: "ج.م",
      taxEnabled: true, taxPercentage: 15, salesPrefix: "INV", purchasePrefix: "PUR"
    }
  })

  console.log('✨ تم الانتهاء من تهيئة النظام بنجاح')
}

main()
  .catch((e) => {
    console.error('❌ خطأ في إنشاء البيانات:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })