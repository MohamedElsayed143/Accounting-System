"use server";

import { prisma } from "@/lib/prisma";

/**
 * Public action — fetches system branding (name + logo) without auth.
 * Used by the login page and navbar to display the product logo/name.
 */
export async function getPublicSystemConfig() {
  try {
    const config = await (prisma as any).systemConfig.findUnique({
      where: { id: 1 },
      select: { systemName: true, systemLogo: true },
    });
    return {
      systemName: config?.systemName ?? "نظام محاسبة فاست",
      systemLogo: config?.systemLogo ?? null,
    };
  } catch {
    return { systemName: "نظام محاسبة فاست", systemLogo: null };
  }
}
