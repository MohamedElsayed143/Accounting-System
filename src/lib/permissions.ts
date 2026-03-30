import { prisma } from "./prisma";

export type PermissionKey = 
  | "sales_view" 
  | "sales_create" 
  | "sales_edit" 
  | "sales_delete"
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
  | "returns_purchase";

/**
 * Checks if a user has a specific permission.
 * Admins always have all permissions.
 * Workers are checked against the 'cashier' role in SystemSettings.
 */
export async function hasPermission(userId: number, key: PermissionKey): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) return false;
  if (user.role === "ADMIN") {
    if (key === "customers_retail_only") return false;
    return true;
  }

  // For WORKER, fetch system settings
  const settingsRecord = await prisma.systemSettings.findFirst({
    where: { id: 1 }
  });

  if (!settingsRecord) return false;

  const settings = settingsRecord.settings as any;
  const rbac = settings?.rbac;

  if (!rbac || !rbac.roles) return false;

  // We assume WORKER maps to the 'worker' role in settings (labeled 'Employee')
  const workerRole = rbac.roles["worker"]; 
  if (!workerRole || !workerRole.permissions) return false;

  return !!workerRole.permissions[key];
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
