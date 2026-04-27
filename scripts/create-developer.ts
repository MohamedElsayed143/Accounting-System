import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const DEVELOPER_EMAIL = "mohmadelkhadry@gmail.com";
  const DEVELOPER_USERNAME = "developer"; // غيّر لو عايز اسم تاني
  const DEVELOPER_PASSWORD = "Mohamed@143"; // غيّر لكلمة مرورك

  // Check if developer already exists
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: DEVELOPER_EMAIL },
        { username: DEVELOPER_USERNAME },
      ],
    },
  });

  if (existing) {
    // Update existing user with correct hashed password and email
    await (prisma.user as any).update({
      where: { id: existing.id },
      data: {
        password: hashPassword(DEVELOPER_PASSWORD),
        email: DEVELOPER_EMAIL,
      },
    });
    console.log(`✅ تم تحديث اليوزر الموجود (id: ${existing.id})`);
    console.log(`   username: ${existing.username}`);
    console.log(`   email: ${DEVELOPER_EMAIL}`);
    console.log(`   password: ${DEVELOPER_PASSWORD}`);
  } else {
    // Create new developer user
    const user = await (prisma.user as any).create({
      data: {
        username: DEVELOPER_USERNAME,
        password: hashPassword(DEVELOPER_PASSWORD),
        email: DEVELOPER_EMAIL,
        role: "ADMIN",
        maxDevices: 10,
      },
    });
    console.log(`✅ تم إنشاء اليوزر بنجاح (id: ${user.id})`);
    console.log(`   username: ${DEVELOPER_USERNAME}`);
    console.log(`   email: ${DEVELOPER_EMAIL}`);
    console.log(`   password: ${DEVELOPER_PASSWORD}`);
  }

  console.log("\n🔑 استخدم هذه البيانات للـ Login:");
  console.log(`   Username: ${existing?.username ?? DEVELOPER_USERNAME}`);
  console.log(`   Password: ${DEVELOPER_PASSWORD}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
