"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CompanySettingsSchema = z.object({
  companyName: z.string().optional(),
  companyNameEn: z.string().optional(),
  companyLogo: z.string().optional(),
  companyStamp: z.string().optional(),
  companyBarcode: z.string().optional(),
  showLogoOnPrint: z.boolean().default(true),
  showStampOnPrint: z.boolean().default(true),
  showBarcodeOnPrint: z.boolean().default(true),
  salesPrefix: z.string().default("INV"),
  purchasePrefix: z.string().default("PUR"),
  quotationPrefix: z.string().default("QUO"),
  invoiceName: z.string().default("فاتورة ضريبية"),
  salesInvoiceName: z.string().default("فاتورة مبيعات"),
  purchaseInvoiceName: z.string().default("فاتورة مشتريات"),
  startNumber: z.number().int().positive().default(1),
  termsAndConditions: z.string().optional(),
  invoiceFooterNotes: z.string().optional(),
  // Financial Settings
  taxEnabled: z.boolean().default(true),
  taxName: z.string().default("VAT"),
  taxPercentage: z.number().min(0).max(100).default(15),
  taxType: z.enum(["INCLUSIVE", "EXCLUSIVE"]).default("EXCLUSIVE"),
  currencyCode: z.string().default("ج.م"),
  decimalPlaces: z.number().int().min(0).max(4).default(2),
});

const FinancialSettingsSchema = z.object({
  taxEnabled: z.boolean(),
  taxName: z.string().min(1, "اسم الضريبة مطلوب"),
  taxPercentage: z.number().min(0, "نسبة الضريبة يجب أن تكون 0 أو أكثر").max(100, "نسبة الضريبة لا تتخطى 100"),
  taxType: z.enum(["INCLUSIVE", "EXCLUSIVE"]),
  currencyCode: z.string().min(1, "رمز العملة مطلوب"),
  decimalPlaces: z.number().int().min(0, "0 أو أكثر").max(4, "4 كحد أقصى"),
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
    const record = await (await getTenantPrisma()).systemSettings.findFirst({
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
    await (await getTenantPrisma()).systemSettings.upsert({
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
    const settings = await (await getTenantPrisma()).companySettings.findUnique({
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
    
    const res = await (await getTenantPrisma() as any).companySettings.upsert({
      where: { id: 1 },
      update: {
        companyName: validatedData.companyName,
        companyNameEn: validatedData.companyNameEn,
        companyLogo: validatedData.companyLogo,
        companyStamp: validatedData.companyStamp,
        companyBarcode: validatedData.companyBarcode,
        showLogoOnPrint: validatedData.showLogoOnPrint,
        showStampOnPrint: validatedData.showStampOnPrint,
        showBarcodeOnPrint: validatedData.showBarcodeOnPrint,
        salesPrefix: validatedData.salesPrefix,
        purchasePrefix: validatedData.purchasePrefix,
        quotationPrefix: validatedData.quotationPrefix,
        invoiceName: validatedData.invoiceName,
        salesInvoiceName: validatedData.salesInvoiceName,
        purchaseInvoiceName: validatedData.purchaseInvoiceName,
        startNumber: validatedData.startNumber,
        termsAndConditions: validatedData.termsAndConditions,
        invoiceFooterNotes: validatedData.invoiceFooterNotes,
      },
      create: {
        id: 1,
        companyName: validatedData.companyName,
        companyNameEn: validatedData.companyNameEn,
        companyLogo: validatedData.companyLogo,
        companyStamp: validatedData.companyStamp,
        companyBarcode: validatedData.companyBarcode,
        showLogoOnPrint: validatedData.showLogoOnPrint,
        showStampOnPrint: validatedData.showStampOnPrint,
        showBarcodeOnPrint: validatedData.showBarcodeOnPrint,
        salesPrefix: validatedData.salesPrefix,
        purchasePrefix: validatedData.purchasePrefix,
        quotationPrefix: validatedData.quotationPrefix,
        invoiceName: validatedData.invoiceName,
        salesInvoiceName: validatedData.salesInvoiceName,
        purchaseInvoiceName: validatedData.purchaseInvoiceName,
        startNumber: validatedData.startNumber,
        termsAndConditions: validatedData.termsAndConditions,
        invoiceFooterNotes: validatedData.invoiceFooterNotes,
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
 * Updates financial settings (Tax & Currency).
 */
export async function updateFinancialSettingsAction(data: any) {
  await verifyAdmin();
  
  try {
    const validatedData = FinancialSettingsSchema.parse(data);
    
    const res = await (await getTenantPrisma()).companySettings.upsert({
      where: { id: 1 },
      update: {
        taxEnabled: validatedData.taxEnabled,
        taxName: validatedData.taxName,
        taxPercentage: validatedData.taxPercentage,
        taxType: validatedData.taxType,
        currencyCode: validatedData.currencyCode,
        decimalPlaces: validatedData.decimalPlaces,
      },
      create: {
        id: 1,
        taxEnabled: validatedData.taxEnabled,
        taxName: validatedData.taxName,
        taxPercentage: validatedData.taxPercentage,
        taxType: validatedData.taxType,
        currencyCode: validatedData.currencyCode,
        decimalPlaces: validatedData.decimalPlaces,
      },
    });
    
    revalidatePath("/settings");
    return { success: true, data: res };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("updateFinancialSettingsAction error:", error);
    return { error: "فشل في حفظ الإعدادات المالية" };
  }
}

/**
 * Fetches all users for admin view.
 */
export async function getUsers() {
  await verifyAdmin();
  try {
    return await publicPrisma.user.findMany({
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
    const existing = await publicPrisma.user.findUnique({ where: { username: data.username } });
    if (existing) {
      return { error: "اسم المستخدم موجود بالفعل" };
    }

    const hashed = hashPassword(data.password);
    await publicPrisma.user.create({
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
    await publicPrisma.user.delete({ where: { id } });
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("deleteUser error:", error);
    throw new Error("Failed to delete user");
  }
}

/**
 * Fetches general notification settings.
 */
export async function getGeneralSettingsAction() {
  try {
    let settings = await (await getTenantPrisma() as any).generalSettings.findUnique({
      where: { id: 1 }
    });

    if (!settings) {
      settings = await (await getTenantPrisma() as any).generalSettings.create({
        data: { id: 1 }
      });
    }
    return settings;
  } catch (error) {
    console.error("getGeneralSettingsAction error:", error);
    return null;
  }
}

/**
 * Updates general notification settings.
 */
export async function updateGeneralSettingsAction(data: {
  staffActivityAlerts?: boolean;
  inventoryAlerts?: boolean;
  vaultBankAlerts?: boolean;
  minVaultBalance?: number;
  financialAlerts?: boolean;
  showDueDateOnInvoices?: boolean;
  requireApprovalForTransfers?: boolean;
  requireApprovalForSafeCreation?: boolean;
  requireApprovalForBankCreation?: boolean;
  requireApprovalForVouchers?: boolean;
}) {
  await verifyAdmin();
  try {
    const res = await (await getTenantPrisma() as any).generalSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data }
    });
    revalidatePath("/settings");
    revalidatePath("/notifications");
    return { success: true, data: res };
  } catch (error) {
    console.error("updateGeneralSettingsAction error:", error);
    return { error: "فشل في حفظ إعدادات التنبيهات" };
  }
}
