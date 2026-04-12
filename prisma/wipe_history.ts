import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 بدء عملية المسح الكامل للبيانات مع الحفاظ على هيكل النظام...");

  try {
    // ── الخطوة 1: مسح جميع الحركات المالية والبيانات الديناميكية ────────────────
    await prisma.$transaction([
      // مسح الإخطارات والجلسات وطلبات الخزينة
      prisma.notification.deleteMany(),
      prisma.session.deleteMany(),
      prisma.treasuryActionRequest.deleteMany(),

      // مسح المخزون والحركات والتحويلات
      prisma.stockMovement.deleteMany(),
      prisma.treasuryTransfer.deleteMany(),

      // مسح عروض الأسعار
      prisma.quotationItem.deleteMany(),
      prisma.quotation.deleteMany(),

      // مسح القيود المحاسبية
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
    ]);
    console.log("✅ تم مسح جميع الحركات المالية.");

    // ── الخطوة 2: حذف الخزائن والبنوك والعملاء والموردين والأصناف ─────────────
    await prisma.$transaction([
      prisma.treasurySafe.deleteMany(),
      prisma.treasuryBank.deleteMany(),
      prisma.customer.deleteMany(),
      prisma.supplier.deleteMany(),
      prisma.product.deleteMany(),
      prisma.category.deleteMany(),
    ]);
    console.log("✅ تم حذف الخزائن، البنوك، العملاء، الموردين، والأصناف.");

    // ── الخطوة 3: حذف شجرة الحسابات بالكامل ──────────────────────────────────
    // نقوم بحذف جميع الحسابات لأننا سنعيد بناؤها من الصفر في عملية الـ Seed
    await prisma.account.deleteMany();
    console.log("✅ تم حذف شجرة الحسابات بالكامل.");

    // ── الخطوة 4: تصفير بيانات إعدادات الشركة ───────────────────────────────
    await prisma.companySettings.updateMany({
      data: {
        companyName: "شركتي",
        companyNameEn: null,
        companyLogo: null,
        companyStamp: null,
        companyBarcode: null,
        termsAndConditions: null,
        invoiceFooterNotes: null,
      },
    });
    console.log("✅ تم تصفير بيانات إعدادات الشركة.");

    console.log("\n🎉 اكتمل المسح الكامل. النظام جاهز الآن لعملية الـ Seed.");
    console.log("   - تم مسح جميع الحركات المالية ✔");
    console.log("   - تم مسح شجرة الحسابات بالكامل ✔");
    console.log("   - بيانات اليوزرز محفوظة ✔");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء مسح البيانات:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
