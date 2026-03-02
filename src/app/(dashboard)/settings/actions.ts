"use server";

import { prisma } from "@/lib/prisma";

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
