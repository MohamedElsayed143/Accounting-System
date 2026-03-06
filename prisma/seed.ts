import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 بدء إنشاء البيانات الافتراضية...')
  
  // إنشاء الخزنة الرئيسية الثابتة
  const safe = await prisma.treasurySafe.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "الخزنة الرئيسية",
      balance: 0,
      description: "الخزنة الثابتة للنظام - يتم إنشاؤها تلقائياً",
    },
  })
  
  console.log('✅ تم إنشاء الخزنة الرئيسية:', safe.name)

  // إنشاء إعدادات النظام الافتراضية (RBAC)
  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      settings: {
        rbac: {
          roles: {
            worker: {
              label: "موظف",
              permissions: {
                sales_view: true,
                sales_create: true,
                sales_quotations_view: true,
                sales_pending_view: true,
                customers_view: true,
                treasury_vouchers: true,
                inventory_view: true,
              }
            }
          }
        }
      }
    }
  })
  console.log('✅ تم إنشاء إعدادات النظام الافتراضية')

  // إنشاء إعدادات الشركة الافتراضية
  await prisma.companySettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: "شركة المحاسبة الحديثة",
      companyNameEn: "Modern Accounting Co.",
      currencyCode: "ج.م",
      taxEnabled: true,
      taxPercentage: 15,
      salesPrefix: "INV",
      purchasePrefix: "PUR",
    }
  })
  console.log('✅ تم إنشاء إعدادات الشركة الافتراضية')

  console.log('✨ تم الانتهاء من البذور بنجاح casas')
}

main()
  .catch((e) => {
    console.error('❌ خطأ في إنشاء البيانات:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })