"use server";

import { prisma } from "@/lib/prisma";
import { saveJournalEntry } from "@/app/actions/journal";

async function main() {
  console.log("Creating test journal entry...");
  
  // Create a manual journal entry: 
  // Debit: Expense Account (ID 9) - 500
  // Credit: Cash Account (ID 3) - 500
  const result = await saveJournalEntry({
    date: new Date(),
    description: "قيد تجريبي لإثبات صرف مصروفات من الخزينة",
    reference: "TEST-001",
    items: [
      {
        accountId: 9,
        description: "مصروف إيجار تجريبي",
        debit: 500,
        credit: 0
      },
      {
        accountId: 3,
        description: "صرف نقدي من الخزينة",
        debit: 0,
        credit: 500
      }
    ]
  });

  if (result.success) {
    console.log("SUCCESS: Journal entry created with ID:", result.entry.id);
  } else {
    console.error("FAILURE:", result.error);
    process.exit(1);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
