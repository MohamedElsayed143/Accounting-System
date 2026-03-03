import prisma from "@/lib/prisma";
import crypto from "crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export default async function TempSeedPage() {
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

    return (
      <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
        <h1>✅ User Created Successfully</h1>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Password:</strong> password123</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p style={{ color: "red" }}>Please delete this page file (src/app/temp-seed/page.tsx) after use!</p>
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: "20px", fontFamily: "sans-serif", color: "red" }}>
        <h1>❌ Error Creating User</h1>
        <pre>{error.message}</pre>
      </div>
    );
  }
}
