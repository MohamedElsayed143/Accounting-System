import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 بدء عملية مسح الحركات المالية والبيانات التاريخية...");

  try {
    await prisma.$transaction([
      // مسح الإخطارات والجلسات وطلبات الخزينة
      prisma.notification.deleteMany(),
      prisma.session.deleteMany(),
      prisma.treasuryActionRequest.deleteMany(),

      // مسح المخزون والحركات
      prisma.stockMovement.deleteMany(),
      
      // مسح عروض الأسعار
      prisma.quotationItem.deleteMany(),
      prisma.quotation.deleteMany(),

      // مسح التحويلات والقيود
      prisma.treasuryTransfer.deleteMany(),
      prisma.journalItem.deleteMany(),
      prisma.journalEntry.deleteMany(),

      // مسح سندات القبض والصرف
      prisma.receiptVoucher.deleteMany(),
      prisma.paymentVoucher.deleteMany(),

      // مسح المرتجعات (مباع ومشتراه)
      prisma.salesReturnItem.deleteMany(),
      prisma.salesReturn.deleteMany(),
      prisma.purchaseReturnItem.deleteMany(),
      prisma.purchaseReturn.deleteMany(),

      // مسح الفواتير (مباع ومشتراه)
      prisma.salesInvoiceItem.deleteMany(),
      prisma.salesInvoice.deleteMany(),
      prisma.purchaseInvoiceItem.deleteMany(),
      prisma.purchaseInvoice.deleteMany(),

      // تصفير الأرصدة التراكمية في الخزائن والبنوك والمخزون
      prisma.treasurySafe.updateMany({ data: { balance: 0 } }),
      prisma.treasuryBank.updateMany({ data: { balance: 0 } }),
      prisma.product.updateMany({ data: { currentStock: 0 } }),
    ]);

    console.log("✅ تم مسح جميع الحركات المالية بنجاح مع الحفاظ على العملاء والموردين والأصناف.");
  } catch (error) {
    console.error("❌ حدث خطأ أثناء مسح البيانات:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
