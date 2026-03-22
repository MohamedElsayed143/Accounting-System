import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log("Fixing Main Treasury Linkage...");
  
  // 1. Find the Main Cash Account (1101)
  const mainCashAccount = await prisma.account.findUnique({
    where: { code: '1101' }
  });

  if (!mainCashAccount) {
    console.error("Main cash account (1101) not found!");
    return;
  }

  // 2. Find the Primary Treasury Safe (by isPrimary or by name)
  let primarySafe = await prisma.treasurySafe.findFirst({
    where: { isPrimary: true }
  });

  if (!primarySafe) {
    primarySafe = await prisma.treasurySafe.findFirst({
      where: { name: "الخزنة الرئيسية" }
    });
  }
  
  if (!primarySafe) {
    primarySafe = await prisma.treasurySafe.findFirst({
      where: { id: 1 }
    });
  }

  if (!primarySafe) {
    console.error("Primary Treasury Safe not found by any means!");
    return;
  }

  // 3. Update the Primary Safe to link to the Main Cash Account & ensure isPrimary is true
  await prisma.treasurySafe.update({
    where: { id: primarySafe.id },
    data: { 
      accountId: mainCashAccount.id,
      isPrimary: true 
    }
  });

  console.log(`Successfully linked Safe '${primarySafe.name}' (ID: ${primarySafe.id}) to Account '${mainCashAccount.name}' (Code: 1101, ID: ${mainCashAccount.id})`);

  // 4. Cleanup: If there was a duplicate "الخزنة الرئيسية" account created by mistake, we might want to flag it or delete it if it has no transactions
  const duplicateAccounts = await prisma.account.findMany({
    where: {
      name: "الخزنة الرئيسية",
      id: { not: mainCashAccount.id }
    },
    include: {
      journalItems: true
    }
  });

  for (const duplicateAccount of duplicateAccounts) {
    if (duplicateAccount.journalItems.length === 0) {
      console.log(`Found duplicate unlinked account '${duplicateAccount.name}' (Code: ${duplicateAccount.code}) with 0 transactions. Deleting...`);
      await prisma.account.delete({ where: { id: duplicateAccount.id } });
      console.log("Deleted duplicate account.");
    } else {
      console.log(`Found duplicate account '${duplicateAccount.name}' (Code: ${duplicateAccount.code}), but it has transactions. Manual review needed. Please reclass the journal items to the main account and delete.`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
