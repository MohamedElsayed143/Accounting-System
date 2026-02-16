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
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getTreasuryData,
  archiveBank,
  type AccountSummary,
  type TreasuryStats,
} from "./actions";
import AddBankDialog from "./components/AddBankDialog";
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

// تعريف نوع المعاملات
interface Transaction {
  id: string;
  type: "payment" | "receipt";
  voucherNumber: string;
  amount: number;
  date: Date;
  partyName: string;
  accountName: string;
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [archiveInfo, setArchiveInfo] = useState<{
    hasTransactions: boolean;
    transactionsCount: number;
    message: string;
  } | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

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

  if (!data)
    return <div className="p-10 text-center">جاري تحميل البيانات...</div>;

  return (
    <>
      <Navbar title="إدارة النقدية" />
      <div className="p-6 space-y-8" dir="rtl">
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
            title="عدد الحسابات"
            amount={data.stats.totalAccounts}
            unit="حساب"
            icon={<Plus className="text-orange-600" />}
            color="border-r-orange-500"
          />
        </div>

        {/* أزرار العمليات */}
        <div className="flex flex-wrap gap-3 justify-end">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowAddBank(true)}
          >
            <Plus className="h-4 w-4" /> إضافة بنك جديد
          </Button>

          {/* زر البنوك المؤرشفة */}
          <Link href="/treasury/archived">
            <Button
              variant="outline"
              className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <Landmark className="h-4 w-4" /> البنوك المؤرشفة
            </Button>
          </Link>

          
          <Link href="/treasury/receipt-voucher">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              + سند قبض جديد
            </Button>
          </Link>
          <Link href="/treasury/payment-voucher">
            <Button variant="destructive">+ سند صرف جديد</Button>
          </Link>
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
                        <span className="text-xs font-bold px-2 py-1 bg-muted rounded-full">
                          {acc.type === "safe" ? "خزنة" : "بنك"}
                        </span>
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
                {acc.type === "bank" && (
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
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-bold px-2 py-1 rounded-full ${
                              trans.type === "payment"
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {trans.type === "payment" ? "سند صرف" : "سند قبض"}
                          </span>
                          <span className="font-mono text-sm">
                            {trans.voucherNumber}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {trans.partyName} •{" "}
                          {new Date(trans.date).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      <div className="text-left">
                        <p
                          className={`font-bold ${
                            trans.type === "payment"
                              ? "text-red-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {trans.type === "payment" ? "−" : "+"}
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
