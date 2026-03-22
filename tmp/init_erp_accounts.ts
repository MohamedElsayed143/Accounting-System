import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing ERP Parent Accounts...');

  // 1. Assets -> Current Assets -> Customers (1103)
  const currentAssets = await prisma.account.findUnique({ where: { code: '11' } });
  if (!currentAssets) {
    console.error('❌ Current Assets (11) not found');
    return;
  }

  const customersParent = await prisma.account.upsert({
    where: { code: '1103' },
    update: {},
    create: {
      code: '1103',
      name: 'العملاء',
      type: 'ASSET',
      parentId: currentAssets.id,
      level: currentAssets.level + 1,
      isSelectable: false, // Control account
    },
  });
  console.log('✅ Customers Parent (1103) ready');

  // 2. Liabilities -> Current Liabilities (21) -> Suppliers (2101)
  let currentLiabilities = await prisma.account.findUnique({ where: { code: '21' } });
  if (!currentLiabilities) {
    const totalLiabilities = await prisma.account.findUnique({ where: { code: '2' } });
    if (totalLiabilities) {
      currentLiabilities = await prisma.account.create({
        data: {
          code: '21',
          name: 'الخصوم المتداولة',
          type: 'LIABILITY',
          parentId: totalLiabilities.id,
          level: totalLiabilities.level + 1,
          isSelectable: false,
        },
      });
    }
  }

  if (currentLiabilities) {
    const suppliersParent = await prisma.account.upsert({
      where: { code: '2101' },
      update: {},
      create: {
        code: '2101',
        name: 'الموردون',
        type: 'LIABILITY',
        parentId: currentLiabilities.id,
        level: currentLiabilities.level + 1,
        isSelectable: false, // Control account
      },
    });
    console.log('✅ Suppliers Parent (2101) ready');
  }

  // 3. Revenue -> Activity Revenue (41) -> Sales (4101)
  let activityRevenue = await prisma.account.findUnique({ where: { code: '41' } });
  if (!activityRevenue) {
    const totalRevenue = await prisma.account.findUnique({ where: { code: '4' } });
    if (totalRevenue) {
      activityRevenue = await prisma.account.create({
        data: {
          code: '41',
          name: 'إيرادات النشاط',
          type: 'REVENUE',
          parentId: totalRevenue.id,
          level: totalRevenue.level + 1,
          isSelectable: false,
        },
      });
    }
  }

  if (activityRevenue) {
    const salesAccount = await prisma.account.upsert({
      where: { code: '4101' },
      update: {},
      create: {
        code: '4101',
        name: 'مبيعات',
        type: 'REVENUE',
        parentId: activityRevenue.id,
        level: activityRevenue.level + 1,
        isSelectable: true,
      },
    });
    console.log('✅ Sales Account (4101) ready');
  }

  // 4. Expense -> Activity Expense (51) -> Purchases (5101)
  let activityExpense = await prisma.account.findUnique({ where: { code: '51' } });
  if (!activityExpense) {
    const totalExpense = await prisma.account.findUnique({ where: { code: '5' } });
    if (totalExpense) {
      activityExpense = await prisma.account.create({
        data: {
          code: '51',
          name: 'تكاليف النشاط',
          type: 'EXPENSE',
          parentId: totalExpense.id,
          level: totalExpense.level + 1,
          isSelectable: false,
        },
      });
    }
  }

  if (activityExpense) {
    const purchasesAccount = await prisma.account.upsert({
      where: { code: '5101' },
      update: {},
      create: {
        code: '5101',
        name: 'مشتريات',
        type: 'EXPENSE',
        parentId: activityExpense.id,
        level: activityExpense.level + 1,
        isSelectable: true,
      },
    });
    console.log('✅ Purchases Account (5101) ready');
  }

  console.log('✨ All parent accounts initialized!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
