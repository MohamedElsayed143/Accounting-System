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

      // مسح المخزون والتحويلات
      prisma.stockMovement.deleteMany(),
      prisma.treasuryTransfer.deleteMany(),

      // مسح عروض الأسعار
      prisma.quotationItem.deleteMany(),
      prisma.quotation.deleteMany(),

      // مسح القيود المحاسبية
      prisma.journalItem.deleteMany(),
      prisma.journalEntry.deleteMany(),

      // مسح قيم التسلسل المحفوظة
      prisma.systemSequence.deleteMany(),

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
    console.log("✅ تم مسح جميع الحركات المالية وتصفير عدادات التسلسل.");

    // ── الخطوة 2: حذف الخزائن والبنوك والعملاء والموردين والأصناف والمستودعات ──
    await prisma.$transaction([
      prisma.treasurySafe.deleteMany(),
      prisma.treasuryBank.deleteMany(),
      prisma.customer.deleteMany(),
      prisma.supplier.deleteMany(),
      prisma.product.deleteMany(),
      prisma.category.deleteMany(),
      // ✅ مسح المستودعات
      prisma.warehouse.deleteMany(),
    ]);
    console.log("✅ تم حذف الخزائن، البنوك، العملاء، الموردين، الأصناف، والمستودعات.");

    // ── الخطوة 3: حذف شجرة الحسابات بالكامل بأمان ────────────────────────────
    // الحل: نصفّر parentId أولاً لكسر العلاقة الهرمية Self-Relation، ثم نحذف الكل
    await prisma.account.updateMany({
      where: { parentId: { not: null } },
      data: { parentId: null },
    });
    await prisma.account.deleteMany();
    console.log("✅ تم حذف شجرة الحسابات بالكامل بأمان.");

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

    // ── الخطوة 5: تصفير SystemSettings ──────────────────────────────────────
    await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: { settings: {} },
      create: { id: 1, settings: {} },
    });
    console.log("✅ تم تصفير SystemSettings.");

    // ── الخطوة 6: تصفير GeneralSettings ──────────────────────────────────────
    // ✅ [مضاف] كانت ناقصة وتسبب بقاء إعدادات الموافقة من الاستخدام السابق
    await prisma.generalSettings.upsert({
      where: { id: 1 },
      update: {
        staffActivityAlerts: true,
        inventoryAlerts: true,
        vaultBankAlerts: true,
        minVaultBalance: 1000,
        financialAlerts: true,
        showDueDateOnInvoices: false,
        requireApprovalForTransfers: false,
        requireApprovalForSafeCreation: false,
        requireApprovalForBankCreation: false,
        requireApprovalForVouchers: false,
      },
      create: { id: 1 },
    });
    console.log("✅ تم تصفير GeneralSettings.");

    // ── الخطوة 7: تصفير تسلسل الـ IDs (Sequences) في PostgreSQL ────────────────
    // ✅ [مصلح] كل setval في استدعاء منفصل — Prisma لا يقبل عدة جمل في استدعاء واحد
    console.log("🔄 جارٍ تصفير تسلسلات الـ IDs...");

    const sequences = [
      { table: "JournalEntry", column: "id" },
      { table: "JournalItem", column: "id" },
      { table: "SalesInvoice", column: "id" },
      { table: "SalesInvoiceItem", column: "id" },
      { table: "PurchaseInvoice", column: "id" },
      { table: "PurchaseInvoiceItem", column: "id" },
      { table: "SalesReturn", column: "id" },
      { table: "SalesReturnItem", column: "id" },
      { table: "PurchaseReturn", column: "id" },
      { table: "PurchaseReturnItem", column: "id" },
      { table: "ReceiptVoucher", column: "id" },
      { table: "PaymentVoucher", column: "id" },
      { table: "Account", column: "id" },
      { table: "Customer", column: "id" },
      { table: "Supplier", column: "id" },
      { table: "Product", column: "id" },
      { table: "Category", column: "id" },
      { table: "Warehouse", column: "id" },
      { table: "TreasurySafe", column: "id" },
      { table: "TreasuryBank", column: "id" },
      { table: "StockMovement", column: "id" },
      { table: "Quotation", column: "id" },
      { table: "QuotationItem", column: "id" },
      { table: "Notification", column: "id" },
      { table: "TreasuryActionRequest", column: "id" },
      { table: "TreasuryTransfer", column: "id" },
    ];

    for (const { table, column } of sequences) {
      try {
        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), 1, false)`
        );
      } catch (e: any) {
        // تجاهل إذا كانت السيكوينس غير موجودة (ليست PostgreSQL أو الجدول تغيّر)
        console.warn(`   ⚠️  تعذّر تصفير sequence الجدول "${table}":`, e.message);
      }
    }

    console.log("✅ تم تصفير جميع تسلسلات الـ IDs. ستبدأ البيانات الجديدة من 1.");

    // ── ملخص نهائي ──────────────────────────────────────────────────────────
    console.log("\n🎉 اكتمل المسح الكامل. النظام جاهز الآن لعملية الـ Seed.");
    console.log("   - تم مسح جميع الحركات المالية ✔");
    console.log("   - تم مسح المستودعات والأصناف والعملاء والموردين ✔");
    console.log("   - تم مسح شجرة الحسابات بالكامل (بأمان) ✔");
    console.log("   - تم تصفير إعدادات الشركة والنظام ✔");
    console.log("   - تم تصفير GeneralSettings ✔");
    console.log("   - تم تصفير جميع تسلسلات الـ IDs ✔");
    console.log("   - بيانات اليوزرز محفوظة ✔");
    console.log("\n👉 الخطوة التالية: npx ts-node prisma/seed_coa.ts");

  } catch (error) {
    console.error("❌ حدث خطأ أثناء مسح البيانات:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
