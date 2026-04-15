"use server";

import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { setupNewTenantSchema } from "@/lib/tenant-setup";

const DEVELOPER_EMAIL = "mohmadelkhadry@gmail.com";

/** Ensures the caller is the developer. Throws if not. */
async function verifyDeveloper() {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح — يرجى تسجيل الدخول");
  const user = session.user as any;
  if (user.email !== DEVELOPER_EMAIL) {
    throw new Error("غير مصرح — هذه الصفحة للمطور فقط");
  }
  return session;
}

// ─── System Config ────────────────────────────────────────────────────────────

export async function getSystemConfig() {
  try {
    const config = await (prisma as any).systemConfig.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    return { success: true, data: config };
  } catch (error: any) {
    console.error("getSystemConfig error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateSystemConfig(data: {
  systemName?: string;
  systemLogo?: string | null;
}) {
  await verifyDeveloper();
  try {
    const config = await (prisma as any).systemConfig.upsert({
      where: { id: 1 },
      update: {
        ...(data.systemName !== undefined && { systemName: data.systemName }),
        ...(data.systemLogo !== undefined && { systemLogo: data.systemLogo }),
      },
      create: {
        id: 1,
        systemName: data.systemName ?? "نظام محاسبة فاست",
        systemLogo: data.systemLogo ?? null,
      },
    });
    revalidatePath("/developer");
    revalidatePath("/login");
    return { success: true, data: config };
  } catch (error: any) {
    console.error("updateSystemConfig error:", error);
    return { success: false, error: error.message };
  }
}

// ─── User Management ──────────────────────────────────────────────────────────

export async function getDeveloperUsers() {
  await verifyDeveloper();
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        maxDevices: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, data: users };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createDeveloperUser(data: {
  username: string;
  password: string;
  email?: string;
  role: string;
  maxDevices?: number;
}) {
  await verifyDeveloper();
  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: data.username },
          ...(data.email ? [{ email: data.email }] : []),
        ],
      },
    });
    if (existing) {
      return { success: false, error: "اسم المستخدم أو البريد الإلكتروني موجود بالفعل" };
    }

    // Generate tenant schema name for owner users (ADMIN)
    const tenantSchema =
      data.role === "ADMIN"
        ? `tenant_${data.username.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`
        : null;

    const hashed = hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashed,
        email: data.email || null,
        role: data.role,
        maxDevices: data.maxDevices ?? 1,
        tenantSchema: tenantSchema,
      } as any,
    });

    // Initialize the tenant's isolated schema (creates tables + seeds COA)
    if (tenantSchema) {
      try {
        await setupNewTenantSchema(tenantSchema);
      } catch (err: any) {
        // Rollback user creation if tenant init fails
        await prisma.user.delete({ where: { id: user.id } });
        return { success: false, error: `فشل في تهيئة قاعدة البيانات: ${err.message}` };
      }
    }

    revalidatePath("/developer");
    return { success: true, data: { id: user.id, username: user.username, tenantSchema } };
  } catch (error: any) {
    console.error("createDeveloperUser error:", error);
    return { success: false, error: error.message };
  }
}


export async function deleteDeveloperUser(userId: number) {
  const session = await verifyDeveloper();
  if ((session.user as any).id === userId) {
    return { success: false, error: "لا يمكن حذف حساب المطور الخاص بك" };
  }
  try {
    // Delete sessions first to avoid FK constraint
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/developer");
    return { success: true };
  } catch (error: any) {
    console.error("deleteDeveloperUser error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateUserCredentials(userId: number, data: { username: string; email: string | null; password?: string }) {
  await verifyDeveloper();
  try {
    const dataToUpdate: any = { username: data.username, email: data.email };
    if (data.password) {
      dataToUpdate.password = hashPassword(data.password);
    }
    
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: data.username },
          ...(data.email ? [{ email: data.email }] : []),
        ],
        id: { not: userId }
      }
    });

    if (existing) {
      if (existing.username === data.username) {
        return { success: false, error: "اسم المستخدم موجود بالفعل" };
      }
      if (existing.email === data.email) {
        return { success: false, error: "البريد الإلكتروني موجود بالفعل" };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });
    revalidatePath("/developer");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
