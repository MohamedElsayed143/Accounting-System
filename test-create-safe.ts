import { PrismaClient } from "@prisma/client";
import { SequenceService } from "./src/lib/services/SequenceService";

const prisma = new PrismaClient();

async function testCreateSafe() {
  try {
    const parent = await prisma.account.findUnique({
      where: { code: "1201" },
    });

    if (!parent) {
      console.log("Parent 1201 not found");
      return;
    }

    const lastChild = await prisma.account.findFirst({
      where: { parentId: parent.id },
      orderBy: { code: "desc" },
      select: { code: true },
    });

    const newCode = lastChild
      ? (parseInt(lastChild.code) + 1).toString()
      : parent.code + "01";

    console.log({ newCode });

    const account = await prisma.account.create({
      data: {
        code: newCode,
        name: "Test Safe",
        type: parent.type,
        parentId: parent.id,
        level: parent.level + 1,
        isSelectable: true,
        isTerminal: true,
      },
    });

    const safe = await prisma.treasurySafe.create({
      data: {
        name: "Test Safe",
        balance: 1000,
        description: "",
        isPrimary: false,
        isActive: true,
        accountId: account.id,
      },
    });

    const openingBalanceAccount = await prisma.account.findFirst({
      where: { code: "31" },
    });
    const cap = await prisma.account.findUnique({ where: { code: "3" } });
    let openingAccId = openingBalanceAccount?.id;
    if (!openingAccId && cap) {
      const newAcc = await prisma.account.create({
        data: {
          code: "31",
          name: "الأرصدة الافتتاحية",
          type: "EQUITY",
          parentId: cap.id,
          level: 3,
          isSelectable: true,
          isTerminal: true,
        },
      });
      openingAccId = newAcc.id;
    }

    if (openingAccId) {
      const entryNumber = await SequenceService.getNextSequenceValue(
        prisma as any,
        "JournalEntry"
      );
      await prisma.journalEntry.create({
        data: {
          entryNumber,
          date: new Date(),
          description: `رصيد افتتاحي - Test Safe`,
          sourceType: "MANUAL",
          items: {
            create: [
              {
                accountId: account.id,
                debit: 1000,
                credit: 0,
                description: "رصيد افتتاحي",
              },
              {
                accountId: openingAccId,
                debit: 0,
                credit: 1000,
                description: `رصيد افتتاحي - Test Safe`,
              },
            ],
          },
        },
      });
    }

    console.log("Success");
  } catch (error) {
    console.error("Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCreateSafe();
