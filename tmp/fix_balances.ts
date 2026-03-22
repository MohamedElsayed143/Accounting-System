import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🛠️  Zeroing out balances and stock quantities...");

  try {
    const safeUpdate = await prisma.treasurySafe.updateMany({
      data: { balance: 0 }
    });
    console.log(`✅ Reset ${safeUpdate.count} Treasury Safes.`);

    const bankUpdate = await prisma.treasuryBank.updateMany({
      data: { balance: 0 }
    });
    console.log(`✅ Reset ${bankUpdate.count} Treasury Banks.`);

    const productUpdate = await prisma.product.updateMany({
      data: { currentStock: 0 }
    });
    console.log(`✅ Reset ${productUpdate.count} Products stock levels.`);

  } catch (error) {
    console.error("❌ Error during reset:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
