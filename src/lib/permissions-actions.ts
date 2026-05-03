"use server";

import { getSession } from "@/lib/auth";
import { PermissionKey } from "@/lib/permissions";
import { getPrismaForSchema } from "@/lib/tenant-prisma";
import { cache } from "react";

const PERMISSION_KEYS: PermissionKey[] = [
  "sales_view", "sales_create", "sales_edit", "sales_delete", "sales_allow_negative_stock", "sales_quotations_view", "sales_pending_view",
  "purchase_view", "purchase_create", "purchase_edit", "purchase_delete",
  "customers_view", "customers_retail_only", "customers_manage",
  "suppliers_view", "suppliers_manage",
  "treasury_view", "treasury_manage", "treasury_vouchers",
  "inventory_view", "inventory_manage",
  "statistics_view",
  "reports_customers_suppliers", "reports_treasury_banks", "reports_ledger",
  "returns_sales", "returns_purchase",
  "accounting_ledger_view", "accounting_journal_view", "accounting_journal_add", "accounting_coa_view",
];

/**
 * Returns a flat map of all permissions for the current user.
 *
 * OPTIMIZATION: This now makes only 1-2 DB queries total (getSession + one
 * systemSettings lookup for workers), cached for the entire HTTP request via
 * React.cache. Previously it called hasPermission() 31 times in a loop, each
 * firing 2 DB queries = 62 round-trips just to render the sidebar on every page.
 */
export const getRBACPermissions = cache(
  async (): Promise<Record<string, boolean | string>> => {
    const session = await getSession();
    if (!session) return {};

    const permissions: Record<string, boolean | string> = {
      role: session.user.role,
      isAdmin: session.user.role === "ADMIN",
    };

    if (session.user.role === "ADMIN") {
      // Admins hold every permission except the retail-only restriction
      for (const key of PERMISSION_KEYS) {
        permissions[key] = key !== "customers_retail_only";
      }
      return permissions;
    }

    // WORKER: one DB query to fetch their rbac settings, then resolve in memory
    const tenantSchema = (session.user as any).tenantSchema || "public";
    const tenantPrisma = getPrismaForSchema(tenantSchema);

    const settingsRecord = await tenantPrisma.systemSettings.findFirst({
      where: { id: 1 },
      select: { settings: true },
    });

    const workerPerms: Record<string, boolean> =
      (settingsRecord?.settings as any)?.rbac?.roles?.["worker"]?.permissions ?? {};

    for (const key of PERMISSION_KEYS) {
      permissions[key] = !!workerPerms[key];
    }

    return permissions;
  }
);
