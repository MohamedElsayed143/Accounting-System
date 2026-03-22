"use server";

import { getSession } from "@/lib/auth";
import { hasPermission, PermissionKey } from "@/lib/permissions";

/**
 * Returns a map of all permissions for the current logged-in user.
 */
export async function getRBACPermissions(): Promise<Record<string, boolean | string>> {
  const session = await getSession();
  if (!session) return {};

  const keys: PermissionKey[] = [
    "sales_view", "sales_create", "sales_edit", "sales_delete", "sales_quotations_view", "sales_pending_view",
    "purchase_view", "purchase_create",
    "customers_view", "customers_retail_only", "customers_manage",
    "suppliers_view", "suppliers_manage",
    "treasury_view", "treasury_manage", "treasury_vouchers",
    "inventory_view", "inventory_manage",
    "statistics_view",
    "reports_customers_suppliers", "reports_treasury_banks", "reports_ledger",
    "returns_sales", "returns_purchase"
  ];

  const permissions: Record<string, boolean | string> = {};
  
  // Add role
  permissions["role"] = session.user.role;
  permissions["isAdmin"] = session.user.role === "ADMIN";
  
  // Resolve all permissions
  for (const key of keys) {
    permissions[key] = await hasPermission(session.userId, key);
  }

  return permissions;
}
