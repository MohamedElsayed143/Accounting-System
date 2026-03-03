"use server";

import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CompanySettingsSchema = z.object({
  companyName: z.string().optional(),
  companyNameEn: z.string().optional(),
  companyLogo: z.string().optional(),
  companyStamp: z.string().optional(),
  showLogoOnPrint: z.boolean().default(true),
  showStampOnPrint: z.boolean().default(true),
  salesPrefix: z.string().default("INV"),
  purchasePrefix: z.string().default("PUR"),
  quotationPrefix: z.string().default("QUO"),
  startNumber: z.number().int().positive().default(1),
  termsAndConditions: z.string().optional(),
});

async function verifyAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Feches settings from the single row in the SystemSettings table.
 * If no row exists, returns null.
 */
export async function getSystemSettings() {
  try {
    const record = await prisma.systemSettings.findFirst({
      where: { id: 1 },
    });
    
    // We cast to any here and return it
    // The frontend deals with merging it into the defaults
    return record?.settings ? JSON.parse(JSON.stringify(record.settings)) : null;
  } catch (error) {
    console.error("getSystemSettings error:", error);
    return null; // Return null so frontend loads defaults
  }
}

/**
 * Upserts the entire settings JSON object into row id=1
 */
export async function saveSystemSettings(settingsObject: any) {
  try {
    await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {
        settings: settingsObject,
      },
      create: {
        id: 1,
        settings: settingsObject,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("saveSystemSettings error:", error);
    throw new Error("Failed to save settings");
  }
}

/**
 * Fetches the singleton CompanySettings record (id=1).
 */
export async function getCompanySettingsAction() {
  try {
    const settings = await prisma.companySettings.findUnique({
      where: { id: 1 },
    });
    return settings;
  } catch (error) {
    console.error("getCompanySettingsAction error:", error);
    return null;
  }
}

/**
 * Updates the singleton CompanySettings record.
 */
export async function updateCompanySettingsAction(data: any) {
  await verifyAdmin();
  
  try {
    const validatedData = CompanySettingsSchema.parse(data);
    
    const res = await prisma.companySettings.upsert({
      where: { id: 1 },
      update: {
        companyName: validatedData.companyName,
        companyNameEn: validatedData.companyNameEn,
        companyLogo: validatedData.companyLogo,
        companyStamp: validatedData.companyStamp,
        showLogoOnPrint: validatedData.showLogoOnPrint,
        showStampOnPrint: validatedData.showStampOnPrint,
        salesPrefix: validatedData.salesPrefix,
        purchasePrefix: validatedData.purchasePrefix,
        quotationPrefix: validatedData.quotationPrefix,
        startNumber: validatedData.startNumber,
        termsAndConditions: validatedData.termsAndConditions,
      },
      create: {
        id: 1,
        companyName: validatedData.companyName,
        companyNameEn: validatedData.companyNameEn,
        companyLogo: validatedData.companyLogo,
        companyStamp: validatedData.companyStamp,
        showLogoOnPrint: validatedData.showLogoOnPrint,
        showStampOnPrint: validatedData.showStampOnPrint,
        salesPrefix: validatedData.salesPrefix,
        purchasePrefix: validatedData.purchasePrefix,
        quotationPrefix: validatedData.quotationPrefix,
        startNumber: validatedData.startNumber,
        termsAndConditions: validatedData.termsAndConditions,
      },
    });
    
    revalidatePath("/settings");
    return { success: true, data: res };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("updateCompanySettingsAction error:", error);
    return { error: "فشل في حفظ إعدادات الشركة" };
  }
}

/**
 * Fetches all users for admin view.
 */
export async function getUsers() {
  await verifyAdmin();
  try {
    return await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("getUsers error:", error);
    throw new Error("Failed to fetch users");
  }
}

/**
 * Creates a new user (Worker/Admin).
 */
export async function createUser(data: { username: string; password: string; role: string }) {
  await verifyAdmin();
  try {
    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing) {
      return { error: "اسم المستخدم موجود بالفعل" };
    }

    const hashed = hashPassword(data.password);
    await prisma.user.create({
      data: {
        username: data.username,
        password: hashed,
        role: data.role,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("createUser error:", error);
    throw new Error("Failed to create user");
  }
}

/**
 * Deletes a user.
 */
export async function deleteUser(id: number) {
  const session = await verifyAdmin();
  
  // Prevent admin from deleting themselves
  if (session.userId === id) {
    return { error: "لا يمكنك حذف حسابك الخاص" };
  }

  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("deleteUser error:", error);
    throw new Error("Failed to delete user");
  }
}
