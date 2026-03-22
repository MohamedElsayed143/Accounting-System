
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCircularity() {
  try {
    const accounts = await prisma.account.findMany({
      select: { id: true, parentId: true, name: true }
    });

    const adj = new Map<number, number | null>();
    for (const acc of accounts) {
      adj.set(acc.id, acc.parentId);
    }

    const visited = new Set<number>();
    const recStack = new Set<number>();

    function isCyclic(id: number): boolean {
      if (recStack.has(id)) return true;
      if (visited.has(id)) return false;

      visited.add(id);
      recStack.add(id);

      const parentId = adj.get(id);
      if (parentId !== null && parentId !== undefined) {
        if (isCyclic(parentId)) return true;
      }

      recStack.delete(id);
      return false;
    }

    let cyclicId: number | null = null;
    for (const acc of accounts) {
      if (isCyclic(acc.id)) {
        cyclicId = acc.id;
        break;
      }
    }

    if (cyclicId !== null) {
      console.log(`CYCLE DETECTED starting with account ID: ${cyclicId}`);
    } else {
      console.log("No circularity detected.");
    }

  } catch (error) {
    console.error("Error checking circularity:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCircularity();
