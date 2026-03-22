import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Creating test journal entry via Prisma directly...");
  
  const lastEntry = await prisma.journalEntry.findFirst({
    orderBy: { entryNumber: 'desc' },
    select: { entryNumber: true }
  });
  const entryNumber = (lastEntry?.entryNumber || 0) + 1;

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: new Date(),
      description: "قيد تجريبي مباشر (DB) لإثبات صرف مصروفات",
      sourceType: 'MANUAL',
      items: {
        create: [
          {
            accountId: 9, // Expense
            description: "مصروف إيجار تجريبي (DB)",
            debit: 500,
            credit: 0
          },
          {
            accountId: 3, // Cash
            description: "صرف نقدي من الخزينة (DB)",
            debit: 0,
            credit: 500
          }
        ]
      }
    }
  });

  console.log("SUCCESS: Journal entry created with ID:", entry.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
