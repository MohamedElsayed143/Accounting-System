import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔗 Linking Customers to COA...');
  const customers = await prisma.customer.findMany({
    where: { accountId: null }
  });

  const custParent = await prisma.account.findUnique({ where: { code: '1103' } });
  if (!custParent) throw new Error('Customers parent (1103) not found');

  for (const c of customers) {
    const nextCode = custParent.code + c.code.toString().padStart(4, '0');
    console.log(`  Linking ${c.name} (${c.code}) -> ${nextCode}`);
    
    const account = await prisma.account.create({
      data: {
        code: nextCode,
        name: c.name,
        type: 'ASSET',
        parentId: custParent.id,
        level: custParent.level + 1,
        isSelectable: true,
      }
    });

    await prisma.customer.update({
      where: { id: c.id },
      data: { accountId: account.id }
    });
  }

  console.log('🔗 Linking Suppliers to COA...');
  const suppliers = await prisma.supplier.findMany({
    where: { accountId: null }
  });

  const suppParent = await prisma.account.findUnique({ where: { code: '2101' } });
  if (!suppParent) throw new Error('Suppliers parent (2101) not found');

  for (const s of suppliers) {
      const sCode = s.code?.toString() || s.id.toString();
    const nextCode = suppParent.code + sCode.padStart(4, '0');
    console.log(`  Linking ${s.name} (${sCode}) -> ${nextCode}`);
    
    const account = await prisma.account.create({
      data: {
        code: nextCode,
        name: s.name,
        type: 'LIABILITY',
        parentId: suppParent.id,
        level: suppParent.level + 1,
        isSelectable: true,
      }
    });

    await prisma.supplier.update({
      where: { id: s.id },
      data: { accountId: account.id }
    });
  }

  console.log('✨ All entities linked!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
