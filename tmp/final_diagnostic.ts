
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runDiagnostics() {
  try {
    const settingsRecord = await prisma.systemSettings.findFirst({ where: { id: 1 } });
    const settings = settingsRecord?.settings as any;
    console.log('--- System Settings ---');
    console.log(JSON.stringify(settings?.inventory, null, 2));

    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        minStock: true,
      }
    });

    const stockGroups = await prisma.stockMovement.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
    });

    const qtyMap = new Map();
    stockGroups.forEach(g => qtyMap.set(g.productId, g._sum.quantity ?? 0));

    const defaultThreshold = settings?.inventory?.lowStockThreshold ?? 5;
    const alertsEnabled = settings?.inventory?.lowStockAlertEnabled ?? true;

    console.log('\n--- Alerts Logic Check ---');
    console.log(`Alerts Enabled: ${alertsEnabled}`);
    console.log(`Default Threshold: ${defaultThreshold}`);

    console.log('\n--- Low Stock Items ---');
    products.forEach(p => {
      const qty = Math.max(0, qtyMap.get(p.id) ?? 0);
      const threshold = Math.max(p.minStock, defaultThreshold);
      if (qty <= threshold) {
        console.log(`- ALERT: ${p.name} (Qty: ${qty}, Threshold: ${threshold})`);
      } else {
         // console.log(`- OK: ${p.name} (Qty: ${qty}, Threshold: ${threshold})`);
      }
    });

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

runDiagnostics();
