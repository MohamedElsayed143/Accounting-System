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

  // (اختياري) إنشاء بنك افتراضي إذا حبيت
  // const bank = await prisma.treasuryBank.upsert({
  //   where: { id: 1 },
  //   update: {},
  //   create: {
  //     id: 1,
  //     name: "البنك الأهلي",
  //     accountNumber: "123456789",
  //     branch: "الفرع الرئيسي",
  //     balance: 0,
  //   },
  // })
  
  console.log('✨ تم الانتهاء من البذور بنجاح')
}

main()
  .catch((e) => {
    console.error('❌ خطأ في إنشاء البيانات:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })