import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting cleanup...');
  
  // 1. Find the correct account (120101)
  const correctAccount = await prisma.account.findUnique({
    where: { code: '120101' }
  });

  if (!correctAccount) {
    console.error('❌ Could not find account 120101');
    process.exit(1);
  }

  // 2. Find the duplicate account (110101)
  const duplicateAccount = await prisma.account.findUnique({
    where: { code: '110101' }
  });

  // 3. Update the Safe to point to the correct account
  const safe = await prisma.treasurySafe.findFirst({
    where: { isPrimary: true }
  });

  if (safe) {
    await prisma.treasurySafe.update({
      where: { id: safe.id },
      data: { accountId: correctAccount.id }
    });
    console.log(`✅ Safe "${safe.name}" linked to correct account ID: ${correctAccount.id}`);
  }

  // 4. Delete the duplicate account
  if (duplicateAccount) {
    // Check for journal items first to avoid constraint violation
    const journalItemsCount = await prisma.journalItem.count({
      where: { accountId: duplicateAccount.id }
    });

    if (journalItemsCount === 0) {
      await prisma.account.delete({
        where: { id: duplicateAccount.id }
      });
      console.log('✅ Deleted duplicate account 110101');
    } else {
      console.warn('⚠️ Could not delete account 110101: it has journal items. Proceeding anyway.');
    }
  } else {
    console.log('ℹ️ Duplicate account 110101 not found.');
  }

  console.log('✨ Cleanup complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
