
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const list = await prisma.salesInvoice.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          createdAt: true,
          status: true
      }
    });
    console.log(JSON.stringify(list, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
