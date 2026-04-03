import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('⏳ جاري فرمتة وإعادة ضبط قاعدة البيانات...');

  try {
    // استخدام transaction لضمان نجاح جميع العمليات معاً
    await prisma.$transaction(async (tx) => {
      // 1. استخدام $executeRawUnsafe لعمل TRUNCATE لجميع الحركات والكيانات
      // هذه الخطوة ستمسح أيضا جميع الجداول الفرعية مثل (Items و Details) بسبب CASCADE
      console.log('🧹 جاري تفريغ الجداول (الفواتير، القيود، الأصناف، الموردين، العملاء)...');
      await tx.$executeRawUnsafe(`
        TRUNCATE TABLE 
          "Customer", 
          "Supplier", 
          "Product", 
          "JournalEntry", 
          "SalesInvoice", 
          "PurchaseInvoice", 
          "SalesReturn", 
          "PurchaseReturn", 
          "Quotation", 
          "ReceiptVoucher", 
          "PaymentVoucher", 
          "TreasuryTransfer", 
          "TreasuryActionRequest",
          "TreasuryBank",
          "CompanySettings",
          "SystemSettings",
          "GeneralSettings"
        RESTART IDENTITY CASCADE;
      `);

      // 1.2 مسح كل الخزائن باستثناء الخزينة الرئيسية
      console.log('🧹 جاري مسح الخزائن الفرعية والبنوك...');
      await tx.$executeRawUnsafe(`
        DELETE FROM "TreasurySafe" WHERE "isPrimary" = false AND id != 1;
      `);

      // 1.5 حذف الحسابات الطرفية (المستوى الرابع فما فوق) التي أنشأها المستخدم
      // مع استثناء الحسابات الأساسية الافتراضية (الخزينة الرئيسية، المخزون، مشتريات المخزن الرئيسي، العجز والتالف)
      // واستثناء حساب الخزائن المتبقية
      console.log('🧹 جاري مسح الحسابات الطرفية للمستخدم (مع الاحتفاظ بحسابات المخزون والخزينة الرئيسية)...');
      await tx.$executeRawUnsafe(`
        DELETE FROM "Account" 
        WHERE level >= 4
          AND code NOT IN ('120101', '120301', '610401', '620401')
          AND id NOT IN (SELECT "accountId" FROM "TreasurySafe" WHERE "accountId" IS NOT NULL);
      `);

      // 2. تصفير رصيد الخزينة الرئيسية (وعدم لمس البنوك لأنها اتمسحت)
      console.log('🔄 جاري تصفير أرصدة الخزينة الرئيسية...');
      await tx.treasurySafe.updateMany({
        data: { balance: 0 },
      });

      console.log('✅ تم إعادة ضبط قاعدة البيانات بالكامل مع الحفاظ على الهيكل المطلوب للسنوات القادمة.');
    });

    console.log('🎉 اكتملت عملية الإعادة (Reset) بنجاح!');
  } catch (error) {
    console.error('❌ حدث خطأ أثناء تنفيذ الإعدادات:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
