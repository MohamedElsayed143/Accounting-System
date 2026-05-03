import { cache } from "react";
import { publicPrisma, getPrismaForSchema } from "./tenant-prisma";

export type PermissionKey = 
  | "sales_view" 
  | "sales_create" 
  | "sales_edit" 
  | "sales_delete"
  | "sales_allow_negative_stock"
  | "sales_quotations_view"
  | "sales_pending_view"
  | "purchase_view"
  | "purchase_create"
  | "purchase_edit"
  | "purchase_delete"
  | "customers_view"
  | "customers_retail_only"
  | "customers_manage"
  | "suppliers_view"
  | "suppliers_manage"
  | "treasury_view"
  | "treasury_manage"
  | "treasury_vouchers"
  | "inventory_view"
  | "inventory_manage"
  | "statistics_view"
  | "reports_customers_suppliers"
  | "reports_treasury_banks"
  | "reports_ledger"
  | "returns_sales"
  | "returns_purchase"
  | "accounting_ledger_view"
  | "accounting_journal_view"
  | "accounting_journal_add"
  | "accounting_coa_view";

/**
 * Loads user role + rbac permissions in a SINGLE DB round-trip and caches
 * the result for the entire HTTP request (React Server cache deduplication).
 * This prevents the N×2 DB queries pattern where every server action calls
 * hasPermission() multiple times.
 */
const getUserPermissions = cache(async (userId: number) => {
  const user = await publicPrisma.user.findUnique({
    where: { id: userId },
    select: { role: true, tenantSchema: true },
  });

  if (!user) return null;

  if (user.role === "ADMIN") {
    return { role: "ADMIN" as const, permissions: null };
  }

  const tenantSchema = user.tenantSchema || "public";
  const tenantPrisma = getPrismaForSchema(tenantSchema);

  const settingsRecord = await tenantPrisma.systemSettings.findFirst({
    where: { id: 1 },
    select: { settings: true },
  });

  const settings = settingsRecord?.settings as any;
  const rbac = settings?.rbac;
  const workerRole = rbac?.roles?.["worker"];
  const permissions: Record<string, boolean> = workerRole?.permissions ?? {};

  return { role: user.role, permissions };
});

/**
 * Checks if a user has a specific permission.
 * Admins always have all permissions.
 * Workers are checked against the rbac settings in SystemSettings.
 * Results are cached per-request to avoid repeated DB queries.
 */
export async function hasPermission(userId: number, key: PermissionKey): Promise<boolean> {
  const userPerms = await getUserPermissions(userId);

  if (!userPerms) return false;

  if (userPerms.role === "ADMIN") {
    // Admins are always restricted from retail-only
    return key !== "customers_retail_only";
  }

  if (!userPerms.permissions) return false;

  return !!userPerms.permissions[key];
}

/**
 * Filter customers for retail only if the user has that restriction.
 */
export async function getCustomerFilter(userId: number) {
  const isRestricted = await hasPermission(userId, "customers_retail_only");
  if (isRestricted) {
    return { category: "قطاعي" };
  }
  return {};
}
