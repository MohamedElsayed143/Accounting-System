import { PrismaClient } from '@prisma/client'

import * as fs from 'fs'

import * as path from 'path'

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const prisma = new PrismaClient()



async function main() {

  console.log('🌱 جارٍ بدء عملية تهيئة النظام من ملف الإعدادات...')



  // 1. قراءة ملف الـ COA الافتراضي

  const coaPath = path.join(__dirname, 'default_coa.json')

  if (!fs.existsSync(coaPath)) {

    throw new Error(`❌ لم يتم العثور على ملف الإعدادات في: ${coaPath}`)

  }



  const defaultCoa = JSON.parse(fs.readFileSync(coaPath, 'utf8'))

  console.log(`📄 تم تحميل ${defaultCoa.length} حساب من ملف الإعدادات.`)



  // 2. ترتيب الحسابات حسب المستوى لضمان إنشاء الأب قبل الابن

  const sortedAccounts = defaultCoa.sort((a: any, b: any) => a.level - b.level)



  const codeToIdMap: Record<string, number> = {}



  console.log('🏗️  جارٍ بناء شجرة الحسابات...')



  for (const acc of sortedAccounts) {

    const parentId = acc.parentIdCode ? codeToIdMap[acc.parentIdCode] : null



    const createdAccount = await prisma.account.upsert({

      where: { code: acc.code },

      update: {

        name: acc.name,

        nameEn: acc.nameEn,

        type: acc.type,

        level: acc.level,

        isTerminal: acc.isTerminal,

        isSelectable: acc.isSelectable,

        parentId: parentId,

      },

      create: {

        code: acc.code,

        name: acc.name,

        nameEn: acc.nameEn,

        type: acc.type,

        level: acc.level,

        isTerminal: acc.isTerminal,

        isSelectable: acc.isSelectable,

        parentId: parentId,

      }

    })



    codeToIdMap[acc.code] = createdAccount.id

    // console.log(`   ✅ [${acc.code}] ${acc.name}`)

  }



  console.log('✅ تم بناء شجرة الحسابات بنجاح.')



  // 3. الربط الذكي للخزينة الرئيسية

  const mainSafeCode = '120101'

  const mainSafeAccId = codeToIdMap[mainSafeCode]



  if (mainSafeAccId) {

    await prisma.treasurySafe.upsert({

      where: { id: 1 },

      update: { accountId: mainSafeAccId, name: 'الخزينة الرئيسية', isPrimary: true },

      create: {

        id: 1,

        name: 'الخزينة الرئيسية',

        isPrimary: true,

        balance: 0,

        accountId: mainSafeAccId

      }

    })

    console.log(`🔗 تم ربط الخزينة الرئيسية بالحساب [${mainSafeCode}].`)

  } else {

    console.warn(`⚠️  تحذير: لم يتم العثور على حساب الخزينة الرئيسية بالكود [${mainSafeCode}] في ملف الإعدادات.`)

  }



  // 4. إعدادات الشركة الافتراضية

  await prisma.companySettings.upsert({

    where: { id: 1 },

    update: { companyName: 'شركتي' },

    create: { id: 1, companyName: 'شركتي' }

  })

  console.log('🏢 تم ضبط إعدادات الشركة الافتراضية.')



  // 5. إعدادات النظام العامة (GeneralSettings)
  // ✅ [مضاف] كانت غائبة من seed_coa.ts وتسبب بقاء إعدادات قديمة بعد الريسيت
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
  })
  console.log('⚙️  تم ضبط الإعدادات العامة للنظام.')



  // 6. إنشاء المستودع الرئيسي الافتراضي
  // ✅ [مضاف] كان غياب المستودع يسبب فشل حركات المخزون المرتبطة بالمستودع
  await prisma.warehouse.upsert({
    where: { id: 1 },
    update: { name: 'المخزن الرئيسي', isDefault: true },
    create: {
      id: 1,
      name: 'المخزن الرئيسي',
      location: null,
      isDefault: true,
    },
  })
  console.log('🏭 تم إنشاء المستودع الرئيسي الافتراضي.')



    // 5. مزامنة المتتاليات (Sequences) لتجنب أخطاء الإضافة في قاعدة بيانات PostgreSQL

    try {
      console.log('🔄 جارٍ تهيئة متتاليات النظام (SystemSequence)...')
      const sequencesToInit = [
        'JournalEntry',
        'SalesInvoice',
        'PurchaseInvoice',
        'SalesReturn',
        'PurchaseReturn',
        'Quotation',
        'ReceiptVoucher',
        'PaymentVoucher',
        'TreasuryTransfer',
        'Category'
      ];

      for (const seqId of sequencesToInit) {
        await prisma.systemSequence.upsert({
          where: { id: seqId },
          update: {}, // Don't reset if already exists during seed (upsert safety)
          create: { id: seqId, lastValue: 0 }
        });
      }

      console.log('🔄 جارٍ مزامنة متتاليات معرفات الجداول...')

      await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"TreasurySafe"', 'id'), COALESCE((SELECT MAX(id) FROM "TreasurySafe"), 1), true)`)

      await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Account"', 'id'), COALESCE((SELECT MAX(id) FROM "Account"), 1), true)`)

      await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"CompanySettings"', 'id'), COALESCE((SELECT MAX(id) FROM "CompanySettings"), 1), true)`)

    } catch (e: any) {

    if (e.message && e.message.includes('pg_get_serial_sequence')) {

      // Ignore if not PostgreSQL

    }

  }



  console.log('\n🎉 اكتملت عملية التمهيد بنجاح!')

}



main()

  .catch((e) => {

    console.error('❌ حدث خطأ أثناء عملية التمهيد:', e)

    process.exit(1)

  })

  .finally(async () => {

    await prisma.$disconnect()

  })