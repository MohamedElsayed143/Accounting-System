
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugInventory() {
  try {
    const settingsRecord = await prisma.systemSettings.findFirst({ where: { id: 1 } });
    const settings = settingsRecord?.settings as any;
    console.log('System Settings:', JSON.stringify(settings, null, 2));

    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        currentStock: true,
        minStock: true,
      }
    });

    console.log('\nProducts Status:');
    products.forEach(p => {
      console.log(`- ${p.name}: Stock=${p.currentStock}, MinStock=${p.minStock}`);
    });

    const defaultThreshold = settings?.inventory?.lowStockThreshold ?? 5;
    const alertsEnabled = settings?.inventory?.lowStockAlertEnabled ?? true;
    console.log(`\nAlerts Enabled: ${alertsEnabled}`);
    console.log(`Default Threshold: ${defaultThreshold}`);

    const alerts = products.filter(p => {
      const clampedStock = Math.max(0, p.currentStock);
      const threshold = Math.max(p.minStock, defaultThreshold);
      const isLow = clampedStock <= threshold;
      return isLow;
    });

    console.log(`\nFiltered Alerts Count: ${alerts.length}`);
    alerts.forEach(a => console.log(`  * ALERT: ${a.name}`));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

debugInventory();
