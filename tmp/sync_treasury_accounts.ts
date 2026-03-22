import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  console.log("🛠️ Starting Treasury/Account Synchronization...");

  try {
    await p.$transaction(async (tx) => {
      // 1. Update Account 11 (Currently "خزنه فرعيه", linked to Safe 1 "الخزنة الرئيسية")
      await tx.account.update({
        where: { id: 11 },
        data: {
          name: "الخزنة الرئيسية",
          code: "110101"
        }
      });
      console.log("✅ Renamed Account 11 to 'الخزنة الرئيسية' (110101)");

      // 2. Create New Account for Safe 2 ("خزنه فرعيه")
      // First check if an account with code 110103 already exists (it shouldn't)
      const existing = await tx.account.findUnique({ where: { code: "110103" } });
      let newAccount;
      if (!existing) {
        newAccount = await tx.account.create({
          data: {
            code: "110103",
            name: "خزنه فرعيه",
            type: "ASSET",
            parentId: 3, // Parent "النقدية في الخزينة"
            isSelectable: true,
            level: 4
          }
        });
        console.log(`✅ Created new Account 'خزنه فرعيه' (110103) with ID ${newAccount.id}`);
      } else {
        newAccount = existing;
        console.log(`ℹ️ Account '110103' already exists (ID ${newAccount.id})`);
      }

      // 3. Link Safe 2 to this new account
      await tx.treasurySafe.update({
        where: { id: 2 },
        data: { accountId: newAccount.id }
      });
      console.log(`✅ Linked TreasurySafe ID 2 ('خزنه فرعيه') to Account ID ${newAccount.id}`);

      // 4. Update Safe 1 accountId (it should already be 11, but let's be sure)
      await tx.treasurySafe.update({
        where: { id: 1 },
        data: { accountId: 11 }
      });
      
    });

    console.log("🎉 Synchronization completed successfully.");
  } catch (error) {
    console.error("❌ Error during synchronization:", error);
  } finally {
    await p.$disconnect();
  }
}

main();
