"use client";

import { useRouter } from "next/navigation";
import { ShieldOff, ArrowRight, Lock } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { Loader2 } from "lucide-react";

interface PermissionGuardProps {
  /** The RBAC permission key to check (e.g. "sales_view") */
  permissionKey?: string;
  /** If true, only ADMIN users are allowed — all workers are blocked */
  isAdminOnly?: boolean;
  /** Fallback redirect path if the user should be sent away instead of showing denied screen */
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Wraps a page and renders an "Access Denied" screen
 * if the current user does not hold the required RBAC permission.
 * Admins always pass through.
 * When `isAdminOnly` is true, no worker can access the page regardless of permissions.
 */
export function PermissionGuard({
  permissionKey,
  isAdminOnly = false,
  redirectTo,
  children,
}: PermissionGuardProps) {
  const { hasPermission, isAdmin, loading } = usePermissions();
  const router = useRouter();

  // Wait until permissions are resolved before rendering anything
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // Admins bypass all checks
  if (isAdmin) {
    return <>{children}</>;
  }

  // If page is admin-only, block all non-admins immediately
  if (isAdminOnly) {
    if (redirectTo) {
      router.replace(redirectTo);
      return null;
    }
    return <AccessDenied />;
  }

  // Worker has the permission — show content
  if (permissionKey && hasPermission(permissionKey)) {
    return <>{children}</>;
  }

  // No permission — redirect or show denied screen
  if (redirectTo) {
    router.replace(redirectTo);
    return null;
  }

  return <AccessDenied />;
}

function AccessDenied() {
  return (
    <div
      className="flex-1 flex items-center justify-center min-h-[70vh] bg-slate-50/40 dark:bg-transparent"
      dir="rtl"
    >
      <div className="max-w-md w-full mx-auto px-6">
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-rose-900/30 shadow-xl overflow-hidden">
          {/* Top gradient bar */}
          <div className="h-2 bg-gradient-to-l from-rose-500 via-rose-400 to-orange-400" />

          <div className="p-10 flex flex-col items-center text-center gap-6">
            {/* Icon */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center shadow-inner">
                <ShieldOff className="w-12 h-12 text-rose-500" strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center border-2 border-white dark:border-slate-900">
                <Lock className="w-4 h-4 text-orange-500" />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                غير مصرح لك
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
                ليس لديك صلاحية الوصول إلى هذه الصفحة.
                <br />
                تواصل مع المسؤول لتفعيل هذه الصلاحية.
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />

            {/* Info box */}
            <div className="w-full bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl p-4 text-right space-y-1">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                كيفية الحصول على الصلاحية
              </p>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/70 leading-relaxed">
                اطلب من مدير النظام الذهاب إلى{" "}
                <span className="font-bold">الإعدادات ← الصلاحيات والأمان</span>{" "}
                وتفعيل الصلاحية المطلوبة لدورك.
              </p>
            </div>

            {/* Back button */}
            <a
              href="/sales-invoices"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 transition-all shadow-sm"
            >
              العودة للصفحة الرئيسية
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
