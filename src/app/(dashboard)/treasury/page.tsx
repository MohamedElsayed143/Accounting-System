"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Landmark,
  Building2,
  Plus,
  Wallet,
  Banknote,
  Trash2,
  Archive,
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpCircle,
  ArrowDownCircle,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PasswordProtectionGate } from "@/components/shared/PasswordProtectionGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getTreasuryData,
  archiveBank,
  type AccountSummary,
  type TreasuryStats,
} from "./actions";
import AddBankDialog from "./components/AddBankDialog";
import AddSafeDialog from "./components/AddSafeDialog";
import { archiveSafe } from "./actions";
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
import { toast } from "sonner";
import TransferDialog from "./components/TransferDialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useManagementMode } from "@/hooks/use-management-mode";


// تعريف نوع المعاملات
interface Transaction {
  id: string;
  type: "payment" | "receipt" | "sales-invoice" | "purchase-invoice" | "sales-return" | "purchase-return" | "transfer";
  voucherNumber: string;
  amount: number;
  date: Date;
  partyName: string;
  accountName: string;
  description?: string | null;
}

// تعريف نوع Props لـ StatCard
interface StatCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  color: string;
  unit?: string;
}

export default function TreasuryPage() {
  const [data, setData] = useState<{
    accounts: AccountSummary[];
    stats: TreasuryStats;
    recentTransactions: Transaction[];
  } | null>(null);
  const [showAddBank, setShowAddBank] = useState(false);
  const [bankToArchive, setBankToArchive] = useState<AccountSummary | null>(
    null,
  );
  const [safeToArchive, setSafeToArchive] = useState<AccountSummary | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSafeConfirmDialog, setShowSafeConfirmDialog] = useState(false);
  const [archiveInfo, setArchiveInfo] = useState<{
    hasTransactions: boolean;
    transactionsCount: number;
    message: string;
  } | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const { isManagementActive, toggleManagementMode } = useManagementMode();
  const [isPassGateOpen, setIsPassGateOpen] = useState(false);
  const { hasPermission, isAdmin } = usePermissions();



  const loadData = () => {
    getTreasuryData().then(setData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleArchiveClick = (bank: AccountSummary) => {
    setBankToArchive(bank);
    setShowConfirmDialog(true);
  };

  const handleArchiveBank = async () => {
    if (!bankToArchive) return;

    setIsArchiving(true);
    try {
      const result = await archiveBank(bankToArchive.id);
      console.log("Archive result:", result);

      if (result.success) {
        if (result.deleted) {
          toast.success(
            `✅ تم حذف بنك "${bankToArchive.name}" نهائياً (لا يوجد معاملات)`,
          );
        } else {
          toast.success(
            `✅ تم أرشفة بنك "${bankToArchive.name}" وإخفاؤه من القائمة`,
          );
        }

        setShowConfirmDialog(false);
        setBankToArchive(null);
        setArchiveInfo(null);

        // تحديث البيانات
        setTimeout(() => {
          loadData();
        }, 500);
      } else {
        toast.error(result.error || "حدث خطأ أثناء أرشفة البنك");
        setShowConfirmDialog(false);
        setBankToArchive(null);
        setArchiveInfo(null);
      }
    } catch (error) {
      console.error("Error in handleArchiveBank:", error);
      toast.error("حدث خطأ غير متوقع");
      setShowConfirmDialog(false);
      setBankToArchive(null);
      setArchiveInfo(null);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleArchiveSafeClick = (safe: AccountSummary) => {
    setSafeToArchive(safe);
    setShowSafeConfirmDialog(true);
  };

  const handleArchiveSafe = async () => {
    if (!safeToArchive) return;

    setIsArchiving(true);
    try {
      const result = await archiveSafe(safeToArchive.id);
      if (result.success) {
        toast.success(result.message);
        setShowSafeConfirmDialog(false);
        setSafeToArchive(null);
        loadData();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsArchiving(false);
    }
  };

  const [showAddSafe, setShowAddSafe] = useState(false);

  if (!data)
    return <div className="p-10 text-center">جاري تحميل البيانات...</div>;

  return (
    <>
      <Navbar title="إدارة النقدية" />
      <div className="p-6 space-y-8" dir="rtl">
        <div className="flex justify-between items-center print:hidden">
            <div>
                <h2 className="text-2xl font-bold mb-2">النقدية والبنوك</h2>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant={isManagementActive ? "destructive" : "outline"}
                onClick={() => {
                  if (isManagementActive) {
                    toggleManagementMode(false);
                    toast.info("تم إغلاق وضع الإدارة");
                  } else {
                    setIsPassGateOpen(true);
                  }
                }}

                className="gap-2 border-dashed border-2 transition-all"
              >
                {isManagementActive ? (
                  <>
                    <ShieldAlert className="h-4 w-4" />
                    إغلاق وضع الإدارة
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    قائمة الحذف والتعديل
                  </>
                )}
              </Button>
            </div>
        </div>

        {/* كروت الإحصائيات العلوية */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي الأرصدة"
            amount={data.stats.grandTotal}
            icon={<Wallet className="text-emerald-600" />}
            color="border-r-emerald-500"
          />
          <StatCard
            title="رصيد الخزنة"
            amount={data.stats.totalSafeBalance}
            icon={<Banknote className="text-blue-600" />}
            color="border-r-blue-500"
          />
          <StatCard
            title="إجمالي البنوك"
            amount={data.stats.totalBanksBalance}
            icon={<Landmark className="text-violet-600" />}
            color="border-r-violet-500"
          />
          <StatCard
            title="إجمالي الحسابات"
            amount={data.stats.totalAccounts}
            unit="حساب"
            icon={<Plus className="text-orange-600" />}
            color="border-r-orange-500"
          />
        </div>

        {/* أزرار العمليات */}
        <div className="flex flex-wrap gap-3 justify-end">
          {hasPermission("treasury_manage") && isManagementActive && (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowAddBank(true)}
              >
                <Plus className="h-4 w-4" /> إضافة بنك جديد
              </Button>

              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowAddSafe(true)}
              >
                <Plus className="h-4 w-4" /> إضافة خزنة جديدة
              </Button>
            </>
          )}

          {/* زر البنوك المؤرشفة */}
          {isAdmin && isManagementActive && (
            <Link href="/treasury/archived">
              <Button
                variant="outline"
                className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <Landmark className="h-4 w-4" /> البنوك المؤرشفة
              </Button>
            </Link>
          )}

          
            {hasPermission("treasury_manage") && (
              <>
                {isManagementActive && (
                    <Button 
                        onClick={() => setShowTransfer(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ArrowLeftRight className="ml-2 h-4 w-4" />
                      تحويل أموال
                    </Button>
                )}
                <Link href="/treasury/receipt-voucher">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    + سند قبض جديد
                  </Button>
                </Link>
                <Link href="/treasury/payment-voucher">
                  <Button variant="destructive">+ سند صرف جديد</Button>
                </Link>
              </>
            )}
          </div>

        {/* عرض الحسابات (خزائن وبنوك) */}
        <div>
          <h2 className="text-xl font-bold mb-4">الحسابات</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.accounts.map((acc) => (
              <div key={`${acc.type}-${acc.id}`} className="relative">
                <Link href={`/treasury/${acc.id}?type=${acc.type}`}>
                  <Card
                    className={`hover:shadow-md transition-all cursor-pointer border-b-4 ${
                      acc.type === "safe"
                        ? "border-b-blue-500"
                        : "border-b-violet-500"
                    }`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div
                          className={`p-2 rounded-lg ${
                            acc.type === "safe" ? "bg-blue-50" : "bg-violet-50"
                          }`}
                        >
                          {acc.type === "safe" ? (
                            <Building2 className="text-blue-600" />
                          ) : (
                            <Landmark className="text-violet-600" />
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          {acc.isPrimary && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded-full">
                              رئيسية
                            </span>
                          )}
                          <span className="text-xs font-bold px-2 py-1 bg-muted rounded-full">
                            {acc.type === "safe" ? "خزنة" : "بنك"}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-1">{acc.name}</h3>
                      <p className="text-2xl font-black text-slate-800">
                        {acc.balance.toLocaleString()} ج.م
                      </p>
                      {acc.accountNumber && (
                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                          رقم الحساب: {acc.accountNumber}
                        </p>
                      )}
                      {acc.branch && (
                        <p className="text-xs text-muted-foreground font-mono">
                          الفرع: {acc.branch}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>

                {/* زر الأرشفة - يظهر ثابت للبنوك */}
                {acc.type === "bank" && isAdmin && isManagementActive && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute -top-2 -left-2 h-8 w-8 rounded-full shadow-lg cursor-pointer bg-orange-500 hover:bg-orange-600"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleArchiveClick(acc);
                    }}
                  >
                    <Archive className="h-4 w-4 text-white cursor-pointer" />
                  </Button>
                )}

                {/* زر أرشفة الخزنة (غير الرئيسية فقط) */}
                {acc.type === "safe" && !acc.isPrimary && isAdmin && isManagementActive && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute -top-2 -left-2 h-8 w-8 rounded-full shadow-lg cursor-pointer bg-orange-500 hover:bg-orange-600"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleArchiveSafeClick(acc);
                    }}
                  >
                    <Archive className="h-4 w-4 text-white cursor-pointer" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* العمليات الأخيرة */}
        {data.recentTransactions && data.recentTransactions.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">آخر العمليات</h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {data.recentTransactions.map((trans) => (
                    <div
                      key={trans.id}
                      className="p-4 flex justify-between items-center hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {trans.type === "receipt" || trans.type === "sales-invoice" || trans.type === "purchase-return" ? (
                          <ArrowDownCircle
                            className={`shrink-0 ${trans.type === "purchase-return" ? "text-red-600" : "text-emerald-600"}`}
                            size={20}
                          />
                        ) : trans.type === "transfer" ? (
                          <ArrowLeftRight className="text-blue-600 shrink-0" size={20} />
                        ) : (
                          <ArrowUpCircle className="text-red-600 shrink-0" size={20} />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-bold px-2 py-1 rounded-full ${
                                  trans.type === "payment" || trans.type === "purchase-invoice" || trans.type === "sales-return" || trans.type === "purchase-return"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {trans.type === "payment" ? "سند صرف" : 
                                 trans.type === "receipt" ? "سند قبض" :
                                 trans.type === "sales-invoice" ? "فاتورة مبيعات" : 
                                 trans.type === "purchase-invoice" ? "فاتورة مشتريات" :
                                 trans.type === "sales-return" ? "مرتجع مبيعات" : 
                                 trans.type === "purchase-return" ? "مرتجع مشتريات" : 
                                 trans.type === "transfer" ? "تحويل رصيد" : "أخرى"}
                              </span>
                            <span className="font-mono text-sm">
                              {trans.voucherNumber}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {trans.partyName} •{" "}
                            {new Date(trans.date).toLocaleDateString("ar-EG")}
                          </p>
                          {trans.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {trans.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <p
                          className={`font-bold ${
                            trans.type === "payment" || trans.type === "purchase-invoice" || trans.type === "sales-return" || trans.type === "purchase-return"
                              ? "text-red-600"
                              : trans.type === "transfer" ? "text-blue-600" : "text-emerald-600"
                          }`}
                        >
                          {trans.type === "payment" || trans.type === "purchase-invoice" || trans.type === "sales-return" ? "−" : 
                           trans.type === "transfer" ? "" : "+"}
                          {trans.amount.toLocaleString()} ج.م
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {trans.accountName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AddBankDialog
        open={showAddBank}
        onOpenChange={setShowAddBank}
        onSuccess={loadData}
      />

      <AddSafeDialog
        open={showAddSafe}
        onOpenChange={setShowAddSafe}
        onSuccess={loadData}
      />

      <TransferDialog
        open={showTransfer}
        onOpenChange={setShowTransfer}
        onSuccess={loadData}
      />

      {/* Alert Dialog لتأكيد أرشفة البنك */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <Archive className="h-5 w-5" />
              تأكيد أرشفة البنك
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  هل أنت متأكد من أرشفة بنك "{bankToArchive?.name}"؟
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-bold mb-2">
                    ℹ️ معلومات مهمة
                  </p>
                  <ul className="text-yellow-700 text-sm list-disc list-inside space-y-1">
                    <li>البنك سيختفي من قائمة الحسابات</li>
                    <li>جميع المعاملات المرتبطة به ستبقى محفوظة</li>
                    <li>يمكنك استرجاع البنك لاحقاً (تحتاج مطور)</li>
                  </ul>
                </div>

                {bankToArchive && bankToArchive.balance > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 font-bold">
                      ⚠️ رصيد البنك الحالي:{" "}
                      {bankToArchive.balance.toLocaleString()} ج.م
                    </p>
                    <p className="text-red-700 text-sm mt-1">
                      هذا الرصيد سيبقى في التقارير حتى بعد الأرشفة
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              onClick={() => {
                setShowConfirmDialog(false);
                setBankToArchive(null);
              }}
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveBank}
              disabled={isArchiving}
              className="bg-orange-600 hover:bg-orange-700 cursor-pointer"
            >
              {isArchiving ? "جاري الأرشفة..." : "نعم، أرشفة البنك"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog لتأكيد أرشفة الخزنة */}
      <AlertDialog open={showSafeConfirmDialog} onOpenChange={setShowSafeConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <Archive className="h-5 w-5" />
              تأكيد أرشفة الخزنة
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  هل أنت متأكد من أرشفة خزنة "{safeToArchive?.name}"؟
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-bold mb-2">ℹ️ معلومات مهمة</p>
                  <ul className="text-yellow-700 text-sm list-disc list-inside space-y-1">
                    <li>الخزنة ستختفي من قائمة الحسابات النشطة</li>
                    <li>المعاملات المرتبطة بها ستبقى محفوظة في النظام</li>
                    <li>يمكنك استعادتها من الحسابات المؤرشفة</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              onClick={() => {
                setShowSafeConfirmDialog(false);
                setSafeToArchive(null);
              }}
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveSafe}
              disabled={isArchiving}
              className="bg-orange-600 hover:bg-orange-700 cursor-pointer"
            >
              {isArchiving ? "جاري الأرشفة..." : "نعم، أرشفة الخزنة"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PasswordProtectionGate
        isOpen={isPassGateOpen}
        onClose={() => setIsPassGateOpen(false)}
        onSuccess={() => toggleManagementMode(true)}
      />
    </>
  );
}

function StatCard({ title, amount, icon, color, unit = "ج.م" }: StatCardProps) {
  return (
    <Card className={`border-r-4 shadow-sm ${color}`}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">
            {amount.toLocaleString()}{" "}
            <span className="text-xs font-normal">{unit}</span>
          </p>
        </div>
        <div className="p-2 bg-slate-50 rounded-full">{icon}</div>
      </CardContent>
    </Card>
  );
}
