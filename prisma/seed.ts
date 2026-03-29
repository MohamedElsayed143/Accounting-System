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

  await prisma.account.upsert({
    where: { code: '1205' },
    update: { name: 'النقدية بالبنوك', nameEn: 'Cash at Banks', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '1205', name: 'النقدية بالبنوك', nameEn: 'Cash at Banks', type: 'ASSET', parentId: currentAssets.id, level: 3, isTerminal: false, isSelectable: false }
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

  // --- المستوى الثاني (L2) - الايرادات التشغيلية ---
  const operatingRevenue = await prisma.account.upsert({
    where: { code: '41' },
    update: { name: 'الايرادات التشغيلية', nameEn: 'Operating Revenue', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '41', name: 'الايرادات التشغيلية', nameEn: 'Operating Revenue', type: 'REVENUE', parentId: revenue.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثالث (L3) - المبيعات ---
  await prisma.account.upsert({
    where: { code: '4101' },
    update: { name: 'المبيعات', nameEn: 'Sales', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '4101', name: 'المبيعات', nameEn: 'Sales', type: 'REVENUE', parentId: operatingRevenue.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثاني (L2) - الايرادات غير التشغيلية ---
  const nonOperatingRevenue = await prisma.account.upsert({
    where: { code: '42' },
    update: { name: 'الايرادات غير التشغيلية', nameEn: 'Non-Operating Revenue', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '42', name: 'الايرادات غير التشغيلية', nameEn: 'Non-Operating Revenue', type: 'REVENUE', parentId: revenue.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثالث (L3) - الفوائد المكتسبة ---
  await prisma.account.upsert({
    where: { code: '4201' },
    update: { name: 'الفوائد المكتسبة', nameEn: 'Earned Interests', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '4201', name: 'الفوائد المكتسبة', nameEn: 'Earned Interests', type: 'REVENUE', parentId: nonOperatingRevenue.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثالث (L3) - الدخل من الاستثمارات ---
  await prisma.account.upsert({
    where: { code: '4202' },
    update: { name: 'الدخل من الاستثمارات', nameEn: 'Investment Income', level: 3, isTerminal: false, isSelectable: false },
    create: { code: '4202', name: 'الدخل من الاستثمارات', nameEn: 'Investment Income', type: 'REVENUE', parentId: nonOperatingRevenue.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثاني والثالث (L2 & L3) - المصروفات ---

  // 51: مصروفات تشغيلية
  const operatingExpenses = await prisma.account.upsert({
    where: { code: '51' },
    update: { name: 'مصروفات تشغيلية', nameEn: 'Operating Expenses', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '51', name: 'مصروفات تشغيلية', nameEn: 'Operating Expenses', type: 'EXPENSE', parentId: expenses.id, level: 2, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '5101' },
    update: { name: 'المرافق العامة', nameEn: 'Public Utilities', level: 3, isTerminal: false, isSelectable: false, parentId: operatingExpenses.id },
    create: { code: '5101', name: 'المرافق العامة', nameEn: 'Public Utilities', type: 'EXPENSE', parentId: operatingExpenses.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '5102' },
    update: { name: 'الإيجارات', nameEn: 'Rents', level: 3, isTerminal: false, isSelectable: false, parentId: operatingExpenses.id },
    create: { code: '5102', name: 'الإيجارات', nameEn: 'Rents', type: 'EXPENSE', parentId: operatingExpenses.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '5103' },
    update: { name: 'الصيانة', nameEn: 'Maintenance', level: 3, isTerminal: false, isSelectable: false, parentId: operatingExpenses.id },
    create: { code: '5103', name: 'الصيانة', nameEn: 'Maintenance', type: 'EXPENSE', parentId: operatingExpenses.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 52: مصروفات إدارية وعمومية
  const adminExpenses = await prisma.account.upsert({
    where: { code: '52' },
    update: { name: 'مصروفات إدارية وعمومية', nameEn: 'General & Admin Expenses', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '52', name: 'مصروفات إدارية وعمومية', nameEn: 'General & Admin Expenses', type: 'EXPENSE', parentId: expenses.id, level: 2, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '5201' },
    update: { name: 'الأدوات المكتبية', nameEn: 'Office Supplies', level: 3, isTerminal: false, isSelectable: false, parentId: adminExpenses.id },
    create: { code: '5201', name: 'الأدوات المكتبية', nameEn: 'Office Supplies', type: 'EXPENSE', parentId: adminExpenses.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '5202' },
    update: { name: 'بوفيه وضيافة', nameEn: 'Buffet & Hospitality', level: 3, isTerminal: false, isSelectable: false, parentId: adminExpenses.id },
    create: { code: '5202', name: 'بوفيه وضيافة', nameEn: 'Buffet & Hospitality', type: 'EXPENSE', parentId: adminExpenses.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '5203' },
    update: { name: 'مصاريف بنكية', nameEn: 'Bank Charges', level: 3, isTerminal: false, isSelectable: false, parentId: adminExpenses.id },
    create: { code: '5203', name: 'مصاريف بنكية', nameEn: 'Bank Charges', type: 'EXPENSE', parentId: adminExpenses.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 53: مصروفات بيع وتسويق
  const sellingExpenses = await prisma.account.upsert({
    where: { code: '53' },
    update: { name: 'مصروفات بيع وتسويق', nameEn: 'Selling & Marketing Expenses', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '53', name: 'مصروفات بيع وتسويق', nameEn: 'Selling & Marketing Expenses', type: 'EXPENSE', parentId: expenses.id, level: 2, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '5301' },
    update: { name: 'الدعاية والإعلان', nameEn: 'Advertising', level: 3, isTerminal: false, isSelectable: false, parentId: sellingExpenses.id },
    create: { code: '5301', name: 'الدعاية والإعلان', nameEn: 'Advertising', type: 'EXPENSE', parentId: sellingExpenses.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '5302' },
    update: { name: 'عمولات المبيعات', nameEn: 'Sales Commissions', level: 3, isTerminal: false, isSelectable: false, parentId: sellingExpenses.id },
    create: { code: '5302', name: 'عمولات المبيعات', nameEn: 'Sales Commissions', type: 'EXPENSE', parentId: sellingExpenses.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 54: أجور ورواتب
  const wagesExpenses = await prisma.account.upsert({
    where: { code: '54' },
    update: { name: 'أجور ورواتب', nameEn: 'Wages & Salaries', level: 2, isTerminal: false, isSelectable: false },
    create: { code: '54', name: 'أجور ورواتب', nameEn: 'Wages & Salaries', type: 'EXPENSE', parentId: expenses.id, level: 2, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '5401' },
    update: { name: 'رواتب أساسية', nameEn: 'Basic Salaries', level: 3, isTerminal: false, isSelectable: false, parentId: wagesExpenses.id },
    create: { code: '5401', name: 'رواتب أساسية', nameEn: 'Basic Salaries', type: 'EXPENSE', parentId: wagesExpenses.id, level: 3, isTerminal: false, isSelectable: false }
  })

  await prisma.account.upsert({
    where: { code: '5402' },
    update: { name: 'بدلات وحوافز', nameEn: 'Allowances & Incentives', level: 3, isTerminal: false, isSelectable: false, parentId: wagesExpenses.id },
    create: { code: '5402', name: 'بدلات وحوافز', nameEn: 'Allowances & Incentives', type: 'EXPENSE', parentId: wagesExpenses.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // تنظيف حسابات المشتريات وتكلفة المبيعات التي تم إضافتها مسبقاً بناءً على الافتراض
  await prisma.account.deleteMany({
    where: { code: { in: ['5501', '55'] } }
  })

  // --- المستوى الأول (L1) - التكاليف (6) ---
  const costs = await prisma.account.upsert({
    where: { code: '6' },
    update: { level: 1, isTerminal: false, isSelectable: false },
    create: { code: '6', name: 'التكاليف', nameEn: 'Costs', type: 'EXPENSE', level: 1, isTerminal: false, isSelectable: false }
  })

  // --- المستوى الثاني والثالث والرابع - التكاليف ---
  
  // 61: تكاليف المشتريات المباشرة
  const directPurchaseCosts = await prisma.account.upsert({
    where: { code: '61' },
    update: { name: 'تكاليف المشتريات المباشرة', nameEn: 'Direct Purchase Costs', level: 2, isTerminal: false, isSelectable: false, parentId: costs.id },
    create: { code: '61', name: 'تكاليف المشتريات المباشرة', nameEn: 'Direct Purchase Costs', type: 'EXPENSE', parentId: costs.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // 6101: تكلفة البضاعة المباعة
  await prisma.account.upsert({
    where: { code: '6101' },
    update: { name: 'تكلفة البضاعة المباعة', nameEn: 'Cost of Goods Sold', level: 3, isTerminal: false, isSelectable: false, parentId: directPurchaseCosts.id },
    create: { code: '6101', name: 'تكلفة البضاعة المباعة', nameEn: 'Cost of Goods Sold', type: 'EXPENSE', parentId: directPurchaseCosts.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 6102: خصومات مكتسبة
  await prisma.account.upsert({
    where: { code: '6102' },
    update: { name: 'خصومات مكتسبة', nameEn: 'Earned Discounts', level: 3, isTerminal: false, isSelectable: false, parentId: directPurchaseCosts.id },
    create: { code: '6102', name: 'خصومات مكتسبة', nameEn: 'Earned Discounts', type: 'EXPENSE', parentId: directPurchaseCosts.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 6103: مردودات مشتريات
  await prisma.account.upsert({
    where: { code: '6103' },
    update: { name: 'مردودات مشتريات', nameEn: 'Purchase Returns', level: 3, isTerminal: false, isSelectable: false, parentId: directPurchaseCosts.id },
    create: { code: '6103', name: 'مردودات مشتريات', nameEn: 'Purchase Returns', type: 'EXPENSE', parentId: directPurchaseCosts.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 6104: المشتريات
  const purchasesGroup = await prisma.account.upsert({
    where: { code: '6104' },
    update: { name: 'المشتريات', nameEn: 'Purchases', level: 3, isTerminal: false, isSelectable: false, parentId: directPurchaseCosts.id },
    create: { code: '6104', name: 'المشتريات', nameEn: 'Purchases', type: 'EXPENSE', parentId: directPurchaseCosts.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 610401: مشتريات المخزن الرئيسي (L4 Terminal)
  await prisma.account.upsert({
    where: { code: '610401' },
    update: { name: 'مشتريات المخزن الرئيسي', nameEn: 'Main Store Purchases', level: 4, isTerminal: true, isSelectable: true, parentId: purchasesGroup.id },
    create: { code: '610401', name: 'مشتريات المخزن الرئيسي', nameEn: 'Main Store Purchases', type: 'EXPENSE', parentId: purchasesGroup.id, level: 4, isTerminal: true, isSelectable: true }
  })

  // 62: تكاليف تشغيلية مرتبطة بالمنتج
  const operationalProductCosts = await prisma.account.upsert({
    where: { code: '62' },
    update: { name: 'تكاليف تشغيلية مرتبطة بالمنتج', nameEn: 'Product Operating Costs', level: 2, isTerminal: false, isSelectable: false, parentId: costs.id },
    create: { code: '62', name: 'تكاليف تشغيلية مرتبطة بالمنتج', nameEn: 'Product Operating Costs', type: 'EXPENSE', parentId: costs.id, level: 2, isTerminal: false, isSelectable: false }
  })

  // 6201: تكاليف الشحن والنقل
  await prisma.account.upsert({
    where: { code: '6201' },
    update: { name: 'تكاليف الشحن والنقل', nameEn: 'Shipping & Transit', level: 3, isTerminal: false, isSelectable: false, parentId: operationalProductCosts.id },
    create: { code: '6201', name: 'تكاليف الشحن والنقل', nameEn: 'Shipping & Transit', type: 'EXPENSE', parentId: operationalProductCosts.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 6202: رسوم جمركية
  await prisma.account.upsert({
    where: { code: '6202' },
    update: { name: 'رسوم جمركية', nameEn: 'Customs Duties', level: 3, isTerminal: false, isSelectable: false, parentId: operationalProductCosts.id },
    create: { code: '6202', name: 'رسوم جمركية', nameEn: 'Customs Duties', type: 'EXPENSE', parentId: operationalProductCosts.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 6203: تكاليف تغليف وتعبئة
  await prisma.account.upsert({
    where: { code: '6203' },
    update: { name: 'تكاليف تغليف وتعبئة', nameEn: 'Packaging Costs', level: 3, isTerminal: false, isSelectable: false, parentId: operationalProductCosts.id },
    create: { code: '6203', name: 'تكاليف تغليف وتعبئة', nameEn: 'Packaging Costs', type: 'EXPENSE', parentId: operationalProductCosts.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 6204: تكاليف بضاعة تالفة
  const damagedGoodsGroup = await prisma.account.upsert({
    where: { code: '6204' },
    update: { name: 'تكاليف بضاعة تالفة', nameEn: 'Damaged Goods Costs', level: 3, isTerminal: false, isSelectable: false, parentId: operationalProductCosts.id },
    create: { code: '6204', name: 'تكاليف بضاعة تالفة', nameEn: 'Damaged Goods Costs', type: 'EXPENSE', parentId: operationalProductCosts.id, level: 3, isTerminal: false, isSelectable: false }
  })

  // 620401: عجز مخزني وتالف (L4 Terminal)
  await prisma.account.upsert({
    where: { code: '620401' },
    update: { name: 'عجز مخزني وتالف', nameEn: 'Inventory Deficit & Damage', level: 4, isTerminal: true, isSelectable: true, parentId: damagedGoodsGroup.id },
    create: { code: '620401', name: 'عجز مخزني وتالف', nameEn: 'Inventory Deficit & Damage', type: 'EXPENSE', parentId: damagedGoodsGroup.id, level: 4, isTerminal: true, isSelectable: true }
  })

  // --- حساب المخزون (L4 Terminal) ---
  const inventoryAccount = await prisma.account.findUnique({ where: { code: '1203' } });
  if (inventoryAccount) {
    await prisma.account.upsert({
      where: { code: '120301' },
      update: { name: 'مخزون البضاعة', nameEn: 'Goods Inventory', level: 4, isTerminal: true, isSelectable: true, parentId: inventoryAccount.id },
      create: { code: '120301', name: 'مخزون البضاعة', nameEn: 'Goods Inventory', type: 'ASSET', parentId: inventoryAccount.id, level: 4, isTerminal: true, isSelectable: true }
    })
  }

  // ربط الخزنة الرئيسية بالحساب المحاسبي (120101)
  await prisma.treasurySafe.update({
    where: { id: safe.id },
    data: { accountId: mainCashAccount.id }
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