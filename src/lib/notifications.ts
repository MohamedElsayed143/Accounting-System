import { prisma } from "@/lib/prisma";
// import { NotificationType } from "@prisma/client";
type NotificationType = "INFO" | "WARNING" | "SUCCESS" | "ERROR";

export async function getGeneralSettings() {
  let settings = await (prisma as any).generalSettings.findFirst({
    where: { id: 1 },
  });

  if (!settings) {
    settings = await (prisma as any).generalSettings.create({
      data: {
        id: 1,
        staffActivityAlerts: true,
        inventoryAlerts: true,
        vaultBankAlerts: true,
        minVaultBalance: 1000,
        financialAlerts: true,
        showDueDateOnInvoices: false,
      },
    });
  }

  return settings;
}

export async function createNotification(data: {
  title: string;
  message: string;
  type: NotificationType;
  userId?: number;
}) {
  return await (prisma as any).notification.create({
    data: {
      title: data.title,
      message: data.message,
      type: data.type,
      userId: data.userId || null,
    },
  });
}

export async function triggerStaffActivityAlert(
  user: { username: string; role: string },
  action: string,
  details: string
) {
  // Only trigger for STAFF or WORKER
  if (user.role !== "WORKER" && user.role !== "STAFF") return;

  const settings = await getGeneralSettings();
  if (!settings.staffActivityAlerts) return;

  await createNotification({
    title: `نشاط موظف: ${user.username}`,
    message: `${action}: ${details}`,
    type: "INFO",
  });
}

export async function triggerStockAlert(productName: string, currentStock: number, minStock: number) {
  const settings = await getGeneralSettings();
  if (!settings.inventoryAlerts) return;

  let threshold = minStock;
  if (threshold === 0) {
    const sysRecord = await (prisma as any).systemSettings.findFirst({ where: { id: 1 } });
    if (sysRecord?.settings?.inventory?.lowStockThreshold) {
      threshold = sysRecord.settings.inventory.lowStockThreshold;
    }
  }

  if (currentStock <= threshold) {
    const existing = await (prisma as any).notification.findFirst({
      where: {
        title: "تنبيه مخزون منخفض",
        message: { contains: `المنتج "${productName}"` },
        isRead: false
      }
    });

    if (!existing) {
      await createNotification({
        title: "تنبيه مخزون منخفض",
        message: `المنتج "${productName}" وصل إلى ${currentStock} (الحد الأدنى: ${minStock})`,
        type: "WARNING",
      });
    }
  }
}

export async function triggerTreasuryAlert(accountName: string, balance: number) {
  const settings = await getGeneralSettings();
  if (!settings.vaultBankAlerts) return;

  if (balance <= settings.minVaultBalance) {
    const existing = await (prisma as any).notification.findFirst({
      where: {
        title: "تنبيه رصيد منخفض",
        message: { contains: `الحساب "${accountName}"` },
        isRead: false
      }
    });

    if (!existing) {
      await createNotification({
        title: "تنبيه رصيد منخفض",
        message: `الحساب "${accountName}" رصيده حالياً ${balance} (الحد الأدنى: ${settings.minVaultBalance})`,
        type: "WARNING",
      });
    }
  }
}

export async function checkDueDates() {
  const settings = await getGeneralSettings();
  if (!settings.financialAlerts) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  // 1. Check Sales Invoices (due today or within 3 days, status is credit)
  const salesInvoices = await (prisma as any).salesInvoice.findMany({
    where: {
      status: "credit",
      dueDate: {
        gte: today,
        lte: threeDaysFromNow,
      },
    },
  });

  for (const inv of (salesInvoices as any[])) {
    if (!inv.dueDate) continue;
    const isOverdue = new Date(inv.dueDate) < today;
    const type = isOverdue ? "ERROR" : "WARNING";
    const statusText = isOverdue ? "متأخرة" : "قريبة الاستحقاق";
    
    // Check if notification already exists to avoid duplication
    const existing = await (prisma as any).notification.findFirst({
      where: {
        title: { contains: `فاتورة مبيعات #${inv.invoiceNumber}` },
      },
    });

    if (!existing) {
      await createNotification({
        title: `تنبيه مالي: فاتورة مبيعات #${inv.invoiceNumber}`,
        message: `الفاتورة المستحقة على العميل ${inv.customerName} ${statusText} (تاريخ الاستحقاق: ${new Date(inv.dueDate).toLocaleDateString("ar-EG")})`,
        type,
      });
    }
  }

  // 2. Check Purchase Invoices (due today or within 3 days, status is credit)
  const purchaseInvoices = await (prisma as any).purchaseInvoice.findMany({
    where: {
      status: "credit",
      dueDate: {
        gte: today,
        lte: threeDaysFromNow,
      },
    },
  });

  for (const inv of (purchaseInvoices as any[])) {
    if (!inv.dueDate) continue;
    const isOverdue = new Date(inv.dueDate) < today;
    const type = isOverdue ? "ERROR" : "WARNING";
    const statusText = isOverdue ? "متأخرة" : "قريبة الاستحقاق";

    const existing = await (prisma as any).notification.findFirst({
      where: {
        title: { contains: `فاتورة مشتريات #${inv.invoiceNumber}` },
      },
    });

    if (!existing) {
      await createNotification({
        title: `تنبيه مالي: فاتورة مشتريات #${inv.invoiceNumber}`,
        message: `الفاتورة المستحقة للمورد ${inv.supplierName} ${statusText} (تاريخ الاستحقاق: ${new Date(inv.dueDate).toLocaleDateString("ar-EG")})`,
        type,
      });
    }
  }
}
