import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const username = "employee1";
  const password = "password123";
  const role = "WORKER";

  try {
    const hashed = hashPassword(password);
    const user = await prisma.user.upsert({
      where: { username },
      update: {
        password: hashed,
        role: role,
      },
      create: {
        username,
        password: hashed,
        role,
      },
    });
    console.log(`User ${user.username} created/updated with role ${user.role}`);
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
