"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Building2,
  FileText,
  Package,
  Palette,
  ShieldCheck,
  Save,
  CheckCircle2,
  Settings,
  Upload,
  X,
  Hash,
  Percent,
  Landmark,
  Sun,
  Moon,
  Monitor,
  ChevronLeft,
  ImageIcon,
  Stamp,
  ScrollText,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Users,
  Bell,
  Trash,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { 
  getSystemSettings, 
  saveSystemSettings, 
  getUsers, 
  createUser, 
  deleteUser, 
  getCompanySettingsAction, 
  updateCompanySettingsAction,
  updateFinancialSettingsAction,
  getGeneralSettingsAction,
  updateGeneralSettingsAction
} from "./actions";
import { toast } from "sonner";
import { getAuthSession } from "@/app/login/actions";
import { useFormStatus } from "react-dom";
import { 
  UserPlus, 
  Shield, 
  Trash2,
  Lock,
  User as UserIcon
} from "lucide-react";

// ─────────────────────────────────────────────
// Default settings shape
// ─────────────────────────────────────────────
const DEFAULT: Settings = {
  company: {
    name: "شركة المحاسبة الحديثة",
    nameEn: "Modern Accounting Co.",
    email: "info@company.com",
    phone: "01000000000",
    address: "القاهرة، مصر",
    taxId: "",
    commercialRegister: "",
    website: "",
    logoBase64: "", // We still use this temporarily in the UI state
    stampBase64: "",
  },
  invoice: {
    salesPrefix: "INV",
    startingNumber: 1,
    purchasePrefix: "PUR",
    quotationPrefix: "QUO",
    invoiceName: "فاتورة ضريبية",
    termsAndConditions:
      "جميع الأسعار شاملة الضريبة المضافة.\nيُرجى السداد خلال 30 يوماً من تاريخ الفاتورة.",
    showLogoOnPrint: true,
    showStampOnPrint: true,
  },
  tax: {
    enabled: true,
    name: "ضريبة القيمة المضافة",
    rate: 15,
    type: "EXCLUSIVE",
  },
  inventory: {
    allowNegativeStock: false,
    lowStockAlertEnabled: true,
    currency: "ج.م",
    decimalPrecision: 2,
    lowStockThreshold: 5,
  },
  rbac: {
    roles: {
      worker: {
        label: "موظف",
        permissions: {
          sales_view: true,
          sales_create: true,
          sales_edit: false,
          sales_delete: false,
          purchase_view: false,
          purchase_create: false,
          customers_view: true,
          customers_retail_only: false,
          customers_manage: false,
          suppliers_view: false,
          suppliers_manage: false,
          treasury_view: false,
          treasury_manage: false,
          treasury_vouchers: true,
          inventory_view: true,
          statistics_view: false,
          reports_customers_suppliers: false,
          reports_treasury_banks: false,
          returns_sales: false,
          returns_purchase: false,
          sales_quotations_view: true,
          sales_pending_view: true,
          settings_access: false,
        },
      },
    },
  },
  notifications: {
    staffActivityAlerts: true,
    inventoryAlerts: true,
    vaultBankAlerts: true,
    minVaultBalance: 1000,
    financialAlerts: true,
    showDueDateOnInvoices: false,
    requireApprovalForTransfers: false,
    requireApprovalForSafeCreation: false,
    requireApprovalForBankCreation: false,
    requireApprovalForVouchers: false,
  },
};

type Settings = {
  company: {
    name: string; nameEn: string; email: string; phone: string;
    address: string; taxId: string; commercialRegister: string;
    website: string; logoBase64: string; stampBase64: string;
  };
  invoice: {
    salesPrefix: string; startingNumber: number;
    purchasePrefix: string; quotationPrefix: string;
    invoiceName: string;
    termsAndConditions: string; showLogoOnPrint: boolean; showStampOnPrint: boolean;
  };
  tax: {
    enabled: boolean; 
    name: string;
    rate: number; 
    type: "INCLUSIVE" | "EXCLUSIVE";
  };
  inventory: {
    allowNegativeStock: boolean;
    lowStockAlertEnabled: boolean;
    currency: string;
    decimalPrecision: number;
    lowStockThreshold: number;
  };
  rbac: {
    roles: Record<string, { label: string; permissions: Record<string, boolean> }>;
  };
  notifications: {
    staffActivityAlerts: boolean;
    inventoryAlerts: boolean;
    vaultBankAlerts: boolean;
    minVaultBalance: number;
    financialAlerts: boolean;
    showDueDateOnInvoices: boolean;
    requireApprovalForTransfers: boolean;
    requireApprovalForSafeCreation: boolean;
    requireApprovalForBankCreation: boolean;
    requireApprovalForVouchers: boolean;
  };
};

// ─────────────────────────────────────────────
// RBAC permission labels
// ─────────────────────────────────────────────
const PERMISSION_GROUPS = [
  {
    group: "المبيعات",
    perms: [
      { key: "sales_view", label: "عرض الفواتير" },
      { key: "sales_create", label: "إنشاء فاتورة" },
      { key: "sales_quotations_view", label: "عروض الأسعار" },
      { key: "sales_pending_view", label: "الفواتير المعلقة" },
    ],
  },
  {
    group: "المشتريات",
    perms: [
      { key: "purchase_view", label: "عرض فواتير المشتريات" },
      { key: "purchase_create", label: "إنشاء فاتورة مشتريات" },
    ],
  },
  {
    group: "العملاء والموردون",
    perms: [
      { key: "customers_view", label: "العملاء" },
      { key: "suppliers_view", label: "الموردون" },
      // customers_retail_only, customers_manage, and suppliers_manage are hidden as requested
    ],
  },
  {
    group: "الخزينة",
    perms: [
      { key: "treasury_view", label: "عرض الخزينة" },
      { key: "treasury_manage", label: "إدارة الخزينة" },
      { key: "treasury_vouchers", label: "السندات" },
    ],
  },
  {
    group: "المخزون",
    perms: [
      { key: "inventory_view", label: "عرض المخزون" },
    ],
  },
  {
    group: "التقارير والإحصائيات",
    perms: [
      { key: "statistics_view", label: "عرض الإحصائيات" },
      { key: "reports_customers_suppliers", label: "تقارير العملاء والموردين" },
      { key: "reports_treasury_banks", label: "تقارير الخزينة والبنوك" },
    ],
  },
  {
    group: "المرتجعات",
    perms: [
      { key: "returns_sales", label: "مرتجعات المبيعات" },
      { key: "returns_purchase", label: "مرتجعات المشتريات" },
    ],
  },
];

// ─────────────────────────────────────────────
// Reusable UI primitives
// ─────────────────────────────────────────────
function Card({ title, icon: Icon, badge, children }: {
  title: string; icon: React.ElementType; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-white flex-1">{title}</h3>
        {badge}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", dir }: {
  value: string | number; onChange: (v: string) => void;
  placeholder?: string; type?: string; dir?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-slate-900 dark:text-white"
    />
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <input
        type="checkbox"
        className="hidden"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={`relative shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${checked ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${checked ? "right-1" : "left-1"}`} />
      </div>
    </label>
  );
}

function Select({ value, onChange, options }: {
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-slate-900 dark:text-white"
    >
      {options.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─────────────────────────────────────────────
// Logo/Stamp uploader
// ─────────────────────────────────────────────
function ImageUploader({ label, icon: Icon, value, onChange, hint }: {
  label: string; icon: React.ElementType;
  value: string; onChange: (b64: string) => void; hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-5 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 min-h-[120px]"
      >
        {value ? (
          <>
            <img src={value} alt={label} className="max-h-20 max-w-full object-contain rounded-lg" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="absolute top-2 left-2 p-1.5 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">انقر لرفع الصورة</p>
              {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Loading Button using useFormStatus
// ─────────────────────────────────────────────
function SaveChangesButton({ dirty, saved }: { dirty: boolean; saved: boolean }) {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
        saved 
          ? "bg-emerald-600 text-white" 
          : pending 
            ? "bg-primary/70 text-primary-foreground cursor-wait" 
            : "bg-primary text-primary-foreground hover:opacity-90"
      }`}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...
        </>
      ) : saved ? (
        <>
          <CheckCircle2 className="w-4 h-4" /> تم الحفظ
        </>
      ) : (
        <>
          <Save className="w-4 h-4" /> حفظ الإعدادات
        </>
      )}
    </button>
  );
}

const TABS = [
  { id: "company", label: "الشركة والفواتير", icon: Building2 },
  { id: "tax", label: "الضرائب والعملة", icon: Percent },
  { id: "inventory", label: "المخزون والخزينة", icon: Package },
  { id: "notifications", label: "التنبيهات", icon: Bell },
  { id: "rbac", label: "الصلاحيات والأمان", icon: ShieldCheck },
  { id: "users", label: "المستخدمون", icon: Users },
] as const;
type TabId = (typeof TABS)[number]["id"];



// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function SystemSettingsPage() {
  const [tab, setTab] = useState<TabId>("company");
  const [s, setS] = useState<Settings>(DEFAULT);
  const [sessionUser, setSessionUser] = useState<any>(null);
  
  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "WORKER" });
  const [addingUser, setAddingUser] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [initialLoad, setInitialLoad] = useState(true);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Load from database
  useEffect(() => {
    async function load() {
      try {
        const session = await getAuthSession();
        if (!session || session.user.role !== "ADMIN") {
          toast.error("غير مصرح لك بدخول هذه الصفحة");
          window.location.href = "/sales-invoices";
          return;
        }
        setSessionUser(session.user);

        const [dbSettings, companySettings, notifSettings] = await Promise.all([
          getSystemSettings(),
          getCompanySettingsAction(),
          getGeneralSettingsAction()
        ]);

        if (dbSettings) {
          setS((prev) => ({
            company: { ...prev.company, ...dbSettings.company },
            invoice: { ...prev.invoice, ...dbSettings.invoice },
            tax: { ...prev.tax, ...dbSettings.tax },
            inventory: { ...prev.inventory, ...dbSettings.inventory },
            rbac: dbSettings.rbac ? {
              roles: {
                worker: {
                  label: "موظف",
                  permissions: {
                    ...(DEFAULT.rbac.roles.worker.permissions),
                    ...(dbSettings.rbac.roles?.worker?.permissions || dbSettings.rbac.roles?.cashier?.permissions || {})
                  }
                }
              }
            } : prev.rbac,
            notifications: prev.notifications
          }));
        }

        if (companySettings) {
          setS((prev) => ({
            ...prev,
            company: {
              ...prev.company,
              name: companySettings.companyName || prev.company.name,
              nameEn: companySettings.companyNameEn || prev.company.nameEn,
              logoBase64: companySettings.companyLogo || prev.company.logoBase64,
              stampBase64: companySettings.companyStamp || prev.company.stampBase64,
            },
            invoice: {
              ...prev.invoice,
              salesPrefix: companySettings.salesPrefix,
              purchasePrefix: companySettings.purchasePrefix,
              quotationPrefix: companySettings.quotationPrefix,
              invoiceName: companySettings.invoiceName || prev.invoice.invoiceName,
              startingNumber: companySettings.startNumber,
              showLogoOnPrint: companySettings.showLogoOnPrint,
              showStampOnPrint: companySettings.showStampOnPrint,
              termsAndConditions: companySettings.termsAndConditions || prev.invoice.termsAndConditions,
            },
            tax: {
              ...prev.tax,
              enabled: companySettings.taxEnabled,
              name: companySettings.taxName,
              rate: companySettings.taxPercentage,
              type: companySettings.taxType,
            },
            inventory: {
              ...prev.inventory,
              currency: companySettings.currencyCode,
              decimalPrecision: companySettings.decimalPlaces,
            },
            notifications: notifSettings ? {
              staffActivityAlerts: notifSettings.staffActivityAlerts,
              inventoryAlerts: notifSettings.inventoryAlerts,
              vaultBankAlerts: notifSettings.vaultBankAlerts,
              minVaultBalance: notifSettings.minVaultBalance,
              financialAlerts: notifSettings.financialAlerts,
              showDueDateOnInvoices: notifSettings.showDueDateOnInvoices,
              requireApprovalForTransfers: notifSettings.requireApprovalForTransfers,
              requireApprovalForSafeCreation: notifSettings.requireApprovalForSafeCreation,
              requireApprovalForBankCreation: notifSettings.requireApprovalForBankCreation,
              requireApprovalForVouchers: notifSettings.requireApprovalForVouchers,
            } : prev.notifications
          }));
        }
      } catch (err) {
        console.error("Failed to load settings from DB:", err);
      } finally {
        setInitialLoad(false);
      }
    }
    load();
  }, []);

  // Fetch users when tab changes to users
  useEffect(() => {
    if (tab === "users") {
      loadUsers();
    }
  }, [tab]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      toast.error("فشل في تحميل المستخدمين");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    
    setAddingUser(true);
    try {
      const res = await createUser(newUser);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("تم إنشاء المستخدم بنجاح");
        setNewUser({ username: "", password: "", role: "WORKER" });
        loadUsers();
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء الإنشاء");
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = (user: any) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeletingUser(true);
    try {
      const res = await deleteUser(userToDelete.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`تم حذف المستخدم "${userToDelete.username}" بنجاح`);
        loadUsers();
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setIsDeletingUser(false);
      setUserToDelete(null);
    }
  };


  const update = useCallback(<K extends keyof Settings>(
    section: K,
    field: keyof Settings[K],
    value: Settings[K][keyof Settings[K]]
  ) => {
    setS((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    setDirty(true);
    setSaved(false);
  }, []);

  const updatePerm = (roleKey: string, permKey: string, value: boolean) => {
    setS((prev) => ({
      ...prev,
      rbac: {
        ...prev.rbac,
        roles: {
          ...prev.rbac.roles,
          [roleKey]: {
            ...prev.rbac.roles[roleKey],
            permissions: {
              ...prev.rbac.roles[roleKey].permissions,
              [permKey]: value,
            },
          },
        },
      },
    }));
    setDirty(true);
    setSaved(false);
  };

  const grantAll = (roleKey: string) => {
    setS((prev) => ({
      ...prev,
      rbac: {
        ...prev.rbac,
        roles: {
          ...prev.rbac.roles,
          [roleKey]: {
            ...prev.rbac.roles[roleKey],
            permissions: Object.fromEntries(
              Object.keys(prev.rbac.roles[roleKey].permissions).map((k) => [k, true])
            ),
          },
        },
      },
    }));
    setDirty(true);
  };

  const revokeAll = (roleKey: string) => {
    setS((prev) => ({
      ...prev,
      rbac: {
        ...prev.rbac,
        roles: {
          ...prev.rbac.roles,
          [roleKey]: {
            ...prev.rbac.roles[roleKey],
            permissions: Object.fromEntries(
              Object.keys(prev.rbac.roles[roleKey].permissions).map((k) => [k, false])
            ),
          },
        },
      },
    }));
    setDirty(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        // 1. Save general settings to SystemSettings JSON
        await saveSystemSettings(s);

        // 2. Save company/invoice specific settings to dedicated model
        const res = await updateCompanySettingsAction({
          companyName: s.company.name,
          companyNameEn: s.company.nameEn,
          companyLogo: s.company.logoBase64,
          companyStamp: s.company.stampBase64,
          showLogoOnPrint: s.invoice.showLogoOnPrint,
          showStampOnPrint: s.invoice.showStampOnPrint,
          salesPrefix: s.invoice.salesPrefix,
          purchasePrefix: s.invoice.purchasePrefix,
          quotationPrefix: s.invoice.quotationPrefix,
          invoiceName: s.invoice.invoiceName,
          startNumber: s.invoice.startingNumber,
          termsAndConditions: s.invoice.termsAndConditions,
        });

        // 3. Save financial settings (Tax & Currency)
        const resFinancial = await updateFinancialSettingsAction({
          taxEnabled: s.tax.enabled,
          taxName: s.tax.name,
          taxPercentage: s.tax.rate,
          taxType: s.tax.type,
          currencyCode: s.inventory.currency,
          decimalPlaces: s.inventory.decimalPrecision,
        });

        const resNotif = await updateGeneralSettingsAction(s.notifications);

        if (res?.error || resFinancial?.error || resNotif?.error) {
          toast.error(res?.error || resFinancial?.error || resNotif?.error);
          return;
        }

        setSaved(true);
        setDirty(false);
        toast.success("تم حفظ إعدادات النظام بنجاح");
        setTimeout(() => setSaved(false), 3000);
      } catch (error) {
        toast.error("حدث خطأ أثناء حفظ الإعدادات");
      }
    });
  };

  const roleKeys = Object.keys(s.rbac.roles);

  if (initialLoad) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50/40 dark:bg-transparent">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">جاري تحميل إعدادات النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar title="إعدادات النظام" />
      <div className="flex-1 p-4 md:p-6 bg-slate-50/40 dark:bg-transparent min-h-screen" dir="rtl">
        {/* Header with Form for useFormStatus support */}
        <form action={handleSave}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 shadow-sm mb-6">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent flex items-center gap-2">
                <Settings className="w-7 h-7 text-primary" />
                إعدادات النظام
              </h1>
              <p className="text-sm text-muted-foreground mt-1">تحكم كامل في سلوك النظام والعلامة التجارية</p>
            </div>
            <div className="flex items-center gap-2">
              {dirty && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  تغييرات غير محفوظة
                </span>
              )}
              <SaveChangesButton dirty={dirty} saved={saved} />
            </div>
          </div>
        </form>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Tab Sidebar ── */}
          <div className="lg:w-60 shrink-0 space-y-3">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                    tab === t.id
                      ? "bg-primary/10 text-primary border-r-[3px] border-r-primary font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <t.icon className="w-4 h-4 shrink-0" />
                  {t.label}
                  {tab === t.id && <ChevronLeft className="w-3 h-3 mr-auto opacity-50" />}
                </button>
              ))}
            </div>

          </div>

          {/* ── Content ── */}
          <div className="flex-1 space-y-5 min-w-0">

            {/* ══ Tab: Company & Invoices ══ */}
            {tab === "company" && (
              <>
                <Card title="بيانات الشركة" icon={Building2}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="اسم الشركة (بالعربية)" hint="يظهر في التقارير والفواتير">
                      <Input value={s.company.name} onChange={(v) => update("company", "name", v)} placeholder="أدخل اسم الشركة..." />
                    </Field>
                    <Field label="اسم الشركة (English)" hint="Company name in English">
                      <Input value={s.company.nameEn} onChange={(v) => update("company", "nameEn", v)} placeholder="Enter company name..." dir="ltr" />
                    </Field>
                  </div>
                </Card>

                <Card title="صورة الشركة والختم" icon={ImageIcon}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <ImageUploader
                      label="شعار الشركة (Logo)"
                      icon={ImageIcon}
                      value={s.company.logoBase64}
                      onChange={(v) => update("company", "logoBase64", v)}
                      hint="PNG أو SVG · يظهر على الفاتورة المطبوعة"
                    />
                    <ImageUploader
                      label="ختم الشركة (Stamp)"
                      icon={Stamp}
                      value={s.company.stampBase64}
                      onChange={(v) => update("company", "stampBase64", v)}
                      hint="PNG شفاف مفضل · يظهر أسفل الفاتورة"
                    />
                  </div>
                  <div className="flex gap-4 pt-2">
                    <Toggle
                      checked={s.invoice.showLogoOnPrint}
                      onChange={(v) => update("invoice", "showLogoOnPrint", v)}
                      label="إظهار الشعار عند الطباعة"
                    />
                    <Toggle
                      checked={s.invoice.showStampOnPrint}
                      onChange={(v) => update("invoice", "showStampOnPrint", v)}
                      label="إظهار الختم عند الطباعة"
                    />
                  </div>
                </Card>

                <Card title="ترقيم الفواتير" icon={Hash}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Field label="بادئة فواتير المبيعات" hint="بادئة رقم الفاتورة">
                      <Input value={s.invoice.salesPrefix} onChange={(v) => update("invoice", "salesPrefix", v)} placeholder="INV" dir="ltr" />
                    </Field>
                    <Field label="بادئة فواتير المشتريات">
                      <Input value={s.invoice.purchasePrefix} onChange={(v) => update("invoice", "purchasePrefix", v)} placeholder="PUR" dir="ltr" />
                    </Field>
                    <Field label="بادئة عروض الأسعار">
                      <Input value={s.invoice.quotationPrefix} onChange={(v) => update("invoice", "quotationPrefix", v)} placeholder="QUO" dir="ltr" />
                    </Field>
                    <Field label="مسمى الفاتورة (للطباعة)" hint="يظهر كعنوان للفاتورة">
                      <Input value={s.invoice.invoiceName} onChange={(v) => update("invoice", "invoiceName", v)} placeholder="فاتورة ضريبية" />
                    </Field>
                    <Field label="رقم البداية" hint="أول رقم تسلسلي">
                      <Input value={s.invoice.startingNumber} onChange={(v) => update("invoice", "startingNumber", Number(v))} type="number" placeholder="1" />
                    </Field>
                  </div>
                  {/* Reactive Preview */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5" /> معاينة أرقام الفواتير القادمة
                    </p>
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">قسيمة مبيعات</span>
                        <strong className="font-mono text-primary bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-sm">
                          {s.invoice.salesPrefix}-{String(s.invoice.startingNumber).padStart(4, "0")}
                        </strong>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">قسيمة مشتريات</span>
                        <strong className="font-mono text-primary bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-sm">
                          {s.invoice.purchasePrefix}-{String(s.invoice.startingNumber).padStart(4, "0")}
                        </strong>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">عرض سعر</span>
                        <strong className="font-mono text-primary bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-sm">
                          {s.invoice.quotationPrefix}-{String(s.invoice.startingNumber).padStart(4, "0")}
                        </strong>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="الشروط والأحكام" icon={ScrollText}>
                  <Field label="تظهر أسفل الفاتورة المطبوعة" hint="كل سطر يظهر كنقطة منفصلة">
                    <textarea
                      value={s.invoice.termsAndConditions}
                      onChange={(e) => update("invoice", "termsAndConditions", e.target.value)}
                      rows={5}
                      placeholder="أدخل الشروط والأحكام..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-y text-slate-900 dark:text-white"
                    />
                  </Field>
                </Card>
              </>
            )}

            {/* ══ Tab: Tax & Currency ══ */}
            {tab === "tax" && (
              <>
                <Card title="إعدادات الضريبة" icon={Percent}
                  badge={
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${s.tax.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                      {s.tax.enabled ? "مُفعّلة" : "معطّلة"}
                    </span>
                  }
                >
                  <Toggle
                    checked={s.tax.enabled}
                    onChange={(v) => update("tax", "enabled", v)}
                    label="تفعيل نظام الضريبة"
                    description="إيقاف هذا الخيار يُخفي كل حقول الضريبة في الفواتير"
                  />

                  {s.tax.enabled && (
                    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="اسم الضريبة" hint="مثال: ضريبة القيمة المضافة">
                          <Input value={s.tax.name} onChange={(v) => update("tax", "name", v)} placeholder="ضريبة القيمة المضافة" />
                        </Field>
                        <Field label="نسبة الضريبة (%)">
                          <div className="relative">
                            <Input value={s.tax.rate} onChange={(v) => update("tax", "rate", Number(v))} type="number" placeholder="15" />
                            <Percent className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                        </Field>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">نوع احتساب الضريبة</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => update("tax", "type", "EXCLUSIVE")}
                            className={`p-4 rounded-xl border-2 text-right transition-all ${s.tax.type === "EXCLUSIVE" ? "border-primary bg-primary/10" : "border-slate-200 dark:border-slate-700 hover:border-primary/40"}`}
                          >
                            <p className="font-bold text-sm text-slate-900 dark:text-white">حصرية (Exclusive)</p>
                            <p className="text-xs text-slate-500 mt-1">الضريبة تُضاف فوق السعر</p>
                            <p className="text-xs font-mono text-primary mt-1">سعر {s.tax.rate > 0 ? `+ ${s.tax.rate}%` : ""}</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => update("tax", "type", "INCLUSIVE")}
                            className={`p-4 rounded-xl border-2 text-right transition-all ${s.tax.type === "INCLUSIVE" ? "border-primary bg-primary/10" : "border-slate-200 dark:border-slate-700 hover:border-primary/40"}`}
                          >
                            <p className="font-bold text-sm text-slate-900 dark:text-white">شاملة (Inclusive)</p>
                            <p className="text-xs text-slate-500 mt-1">الضريبة مدمجة في السعر</p>
                            <p className="text-xs font-mono text-primary mt-1">السعر يشمل {s.tax.rate > 0 ? `${s.tax.rate}%` : "الضريبة"}</p>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                <Card title="إعدادات العملة والأرقام" icon={Landmark}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="العملة الافتراضية">
                      <Select
                        value={s.inventory.currency}
                        onChange={(v) => update("inventory", "currency", v)}
                        options={[
                          { value: "ج.م", label: "🇪🇬 جنيه مصري (ج.م)" },
                          { value: "ر.س", label: "🇸🇦 ريال سعودي (ر.س)" },
                          { value: "د.إ", label: "🇦🇪 درهم إماراتي (د.إ)" },
                          { value: "د.ك", label: "🇰🇼 دينار كويتي (د.ك)" },
                          { value: "د.أ", label: "🇺🇸 دولار أمريكي (د.أ)" },
                          { value: "يورو", label: "🇪🇺 يورو (يورو)" },
                        ]}
                      />
                    </Field>
                    <Field label="الدقة العشرية" hint="عدد الخانات بعد الفاصلة">
                      <Select
                        value={s.inventory.decimalPrecision}
                        onChange={(v) => update("inventory", "decimalPrecision", Number(v))}
                        options={[
                          { value: 0, label: "0 — بدون كسور (1,235)" },
                          { value: 1, label: "1 — خانة واحدة (1,234.6)" },
                          { value: 2, label: "2 — مبدئي (1,234.57)" },
                          { value: 3, label: "3 — دقيق (1,234.568)" },
                        ]}
                      />
                    </Field>
                  </div>
                  {/* Reactive Live Preview */}
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">معاينة تنسيق العملة</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-primary">
                        {(1234.5678).toLocaleString("en-US", { 
                          minimumFractionDigits: s.inventory.decimalPrecision, 
                          maximumFractionDigits: s.inventory.decimalPrecision 
                        })}
                      </span>
                      <span className="text-sm font-bold text-slate-500">{s.inventory.currency}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 italic">مثال لمبلغ تجريبي متأثر بالدقة العشرية</p>
                  </div>
                </Card>
              </>
            )}

            {/* ══ Tab: Inventory & Treasury ══ */}
            {tab === "inventory" && (
              <Card title="إعدادات المخزون والخزينة" icon={Package}>
                <div className="space-y-1">
                  <Toggle
                    checked={s.inventory.allowNegativeStock}
                    onChange={(v) => update("inventory", "allowNegativeStock", v)}
                    label="السماح بالبيع بدون رصيد"
                    description="يُتيح إتمام الفاتورة حتى إذا كان رصيد الصنف صفراً — مع ظهور تنبيه للمستخدم بعدم توفر المخزون"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <Toggle
                    checked={s.inventory.lowStockAlertEnabled ?? true}
                    onChange={(v) => update("inventory", "lowStockAlertEnabled", v)}
                    label="تفعيل تنبيهات المخزون المنخفض"
                    description="عند تفعيله، يظهر تنبيه للأصناف التي وصلت للحد الأدنى في قسم الإحصائيات وقسم المخزون الحالي"
                  />

                  {(s.inventory.lowStockAlertEnabled ?? true) && (
                    <Field label="الحد الأدنى الافتراضي للمخزون المنخفض" hint="يُطبَّق على الأصناف التي لم يُحدَّد لها حد أدنى خاص">
                      <div className="flex items-center gap-3">
                        <Input
                          value={s.inventory.lowStockThreshold}
                          onChange={(v) => update("inventory", "lowStockThreshold", Number(v))}
                          type="number"
                          placeholder="5"
                        />
                        <span className="text-sm text-slate-500 shrink-0">وحدة</span>
                      </div>
                    </Field>
                  )}
                </div>

                {s.inventory.allowNegativeStock && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      ملاحظة: عند البيع بدون رصيد، سيتم إتمام الفاتورة وسيظهر للمستخدم تنبيه بأن الصنف لا يوجد له مخزون كافٍ.
                    </p>
                  </div>
                )}
              </Card>
            )}

            {/* ══ Tab: Notifications ══ */}
            {tab === "notifications" && (
              <Card title="إعدادات التنبيهات" icon={Bell}>
                <div className="space-y-1">
                  <Toggle
                    checked={s.notifications.staffActivityAlerts}
                    onChange={(v) => update("notifications", "staffActivityAlerts", v)}
                    label="تنبيهات نشاط الموظفين"
                    description="تنبيه عند قيام الموظفين بعمليات الإضافة أو الحذف أو التعديل (للأدوار STAFF و WORKER فقط)"
                  />
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800" />
                  <Toggle
                    checked={s.notifications.inventoryAlerts}
                    onChange={(v) => update("notifications", "inventoryAlerts", v)}
                    label="تنبيهات الأصناف والمخزون"
                    description="تنبيه عند وصول صنف للحد الأدنى للمخزون"
                  />
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800" />
                  <Toggle
                    checked={s.notifications.vaultBankAlerts}
                    onChange={(v) => update("notifications", "vaultBankAlerts", v)}
                    label="تنبيهات أرصدة الخزينة والبنوك"
                    description="تنبيه عند انخفاض رصيد الخزنة أو البنك عن الحد الأدنى المحدد"
                  />
                  {s.notifications.vaultBankAlerts && (
                    <div className="px-3 pb-3">
                      <Field label="الحد الأدنى للرصيد" hint="سيتم التنبيه عند وصول الرصيد لهذا المبلغ أو أقل">
                        <div className="flex items-center gap-3">
                          <Input
                            value={s.notifications.minVaultBalance}
                            onChange={(v) => update("notifications", "minVaultBalance", Number(v))}
                            type="number"
                            placeholder="1000"
                          />
                          <span className="text-sm text-slate-500 shrink-0">{s.inventory.currency}</span>
                        </div>
                      </Field>
                    </div>
                  )}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800" />
                  <Toggle
                    checked={s.notifications.financialAlerts}
                    onChange={(v) => update("notifications", "financialAlerts", v)}
                    label="تنبيهات المواعيد المالية"
                    description="إرسال تنبيه عند حلول تاريخ استحقاق سداد فاتورة آجلة أو اقترابه"
                  />
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800" />
                  <Toggle
                    checked={s.notifications.showDueDateOnInvoices}
                    onChange={(v) => update("notifications", "showDueDateOnInvoices", v)}
                    label="إظهار تاريخ الاستحقاق في الفواتير"
                    description="عند تفعيله، سيظهر حقل تاريخ التحصيل/السداد في جميع الفواتير وليس فقط الآجلة"
                  />
                </div>
              </Card>
            )}



            {/* ══ Tab: RBAC ══ */}
            {tab === "rbac" && (
              <div className="space-y-6">
                <Card title="إعدادات الموافقة (Approval Workflows)" icon={ShieldCheck}>
                   <div className="space-y-1">
                    <Toggle
                      checked={s.notifications.requireApprovalForTransfers}
                      onChange={(v) => update("notifications", "requireApprovalForTransfers", v)}
                      label="طلب موافقة للتحويلات المالية"
                      description="عند تفعيله، تتطلب عمليات التحويل بين الحسابات موافقة المدير إذا قام بها موظف"
                    />
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800" />
                    <Toggle
                      checked={s.notifications.requireApprovalForSafeCreation}
                      onChange={(v) => update("notifications", "requireApprovalForSafeCreation", v)}
                      label="طلب موافقة لإنشاء خزنة"
                      description="تتطلب إضافة خزنة جديدة موافقة المدير للموظفين"
                    />
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800" />
                    <Toggle
                      checked={s.notifications.requireApprovalForBankCreation}
                      onChange={(v) => update("notifications", "requireApprovalForBankCreation", v)}
                      label="طلب موافقة لإنشاء بنك"
                      description="تتطلب إضافة حساب بنكي جديد موافقة المدير للموظفين"
                    />
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800" />
                    <Toggle
                      checked={s.notifications.requireApprovalForVouchers}
                      onChange={(v) => update("notifications", "requireApprovalForVouchers", v)}
                      label="طلب موافقة للسندات (قبض/صرف)"
                      description="تتطلب سندات القبض والصرف موافقة المدير للموظفين"
                    />
                  </div>
                </Card>

                <Card title="التحكم بالصلاحيات (RBAC)" icon={Lock}>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    حدد ما يمكن لكل دور الوصول إليه أو تنفيذه داخل النظام.
                  </p>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase w-48">الصلاحية</th>
                        {roleKeys.map((rk) => (
                          <th key={rk} className="px-4 py-3 text-center">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                {s.rbac.roles[rk].label}
                              </span>
                              <div className="flex gap-1 justify-center">
                                <button onClick={() => grantAll(rk)} className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors" title="منح الكل">
                                  <Eye className="w-2.5 h-2.5 inline" /> كل
                                </button>
                                <button onClick={() => revokeAll(rk)} className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded hover:bg-rose-200 transition-colors" title="سحب الكل">
                                  <EyeOff className="w-2.5 h-2.5 inline" /> لا
                                </button>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {PERMISSION_GROUPS.map((group) => (
                        <React.Fragment key={group.group}>
                          {/* Group header */}
                          <tr className="bg-primary/5 dark:bg-primary/5">
                            <td
                              colSpan={roleKeys.length + 1}
                              className="px-4 py-2 text-xs font-bold text-primary uppercase tracking-wider"
                            >
                              {group.group}
                            </td>
                          </tr>
                          {group.perms.map((perm) => (
                            <tr key={perm.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{perm.label}</td>
                              {roleKeys.map((rk) => {
                                const checked = !!s.rbac.roles[rk]?.permissions[perm.key];
                                return (
                                  <td key={rk} className="px-4 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => updatePerm(rk, perm.key, !checked)}
                                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${
                                        checked
                                          ? "bg-primary border-primary text-white"
                                          : "border-slate-300 dark:border-slate-600 hover:border-primary/50"
                                      }`}
                                    >
                                      {checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-primary flex items-center justify-center">
                      <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </span>
                    مسموح
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600" />
                    ممنوع
                  </span>
                </div>
              </Card>
            </div>
          )}

            {/* ══ Tab: Users ══ */}
            {tab === "users" && (
              <div className="space-y-6">
                <Card title="إضافة مستخدم جديد" icon={UserPlus}>
                  <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <Field label="اسم المستخدم">
                      <Input 
                        value={newUser.username} 
                        onChange={(v) => setNewUser({ ...newUser, username: v })}
                        placeholder="أدخل اسم المستخدم"
                      />
                    </Field>
                    <Field label="كلمة المرور">
                      <div className="relative">
                        <Input 
                          value={newUser.password} 
                          onChange={(v) => setNewUser({ ...newUser, password: v })}
                          type={showNewUserPassword ? "text" : "password"}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                          className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showNewUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field label="الدور (الصلاحية)">
                      <Select 
                        value={newUser.role}
                        onChange={(v) => setNewUser({ ...newUser, role: v })}
                        options={[
                          { value: "WORKER", label: "موظف" },
                          { value: "ADMIN", label: "مدير" },
                        ]}
                      />
                    </Field>
                    <button
                      type="submit"
                      disabled={addingUser}
                      className="h-[42px] flex items-center justify-center gap-2 bg-primary text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                    >
                      {addingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      إنشاء الحساب
                    </button>
                  </form>
                </Card>

                <Card title="قائمة المستخدمين" icon={Users}>
                  {loadingUsers ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                      <table className="w-full text-sm text-right">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-300">المستخدم</th>
                            <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-300">الصلاحية</th>
                            <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-300 text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {users.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <UserIcon className="w-4 h-4 text-slate-500" />
                                  </div>
                                  <span className="font-medium text-slate-900 dark:text-white">{u.username}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  u.role === "ADMIN" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                                }`}>
                                  {u.role === "ADMIN" ? "مدير" : "موظف"}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                    title="حذف المستخدم"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ── Sticky save on dirty ── */}
            {dirty && (
              <div className="sticky bottom-4 flex justify-end">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold shadow-xl hover:opacity-90 transition-all"
                >
                  <Save className="w-4 h-4" />
                  حفظ التغييرات
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="sm:max-w-[440px] border-0 shadow-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white dark:bg-slate-900" dir="rtl">
          <div className="p-8 bg-rose-50/50 dark:bg-rose-950/10 border-b border-rose-100/50 dark:border-rose-900/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 shadow-sm animate-pulse">
                <Trash className="w-6 h-6" />
              </div>
              <div className="text-right">
                <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  تأكيد حذف المستخدم
                </AlertDialogTitle>
                <AlertDialogDescription className="text-rose-600/80 font-bold text-xs mt-0.5">
                  هذا الإجراء سيقوم بإزالة وصول الموظف للنظام نهائياً
                </AlertDialogDescription>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-slate-400">
                <UserIcon className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">بيانات الحساب</span>
              </div>
              <div>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100">{userToDelete?.username}</p>
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  الصلاحية: {userToDelete?.role === "ADMIN" ? "مدير" : "موظف"}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium px-1">
              أنت على وشك حذف حساب الموظف <span className="font-black text-slate-900 dark:text-white">"{userToDelete?.username}"</span>. 
              لن يتمكن هذا المستخدم من تسجيل الدخول مرة أخرى.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <AlertDialogCancel className="h-14 rounded-2xl font-black text-slate-600 border-slate-200 hover:bg-slate-50 transition-all">
                إلغاء العملية
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  confirmDeleteUser();
                }}
                className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-lg shadow-rose-200 dark:shadow-none transition-all disabled:opacity-50"
                disabled={isDeletingUser}
              >
                {isDeletingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : "تأكيد الحذف النهائي"}
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
