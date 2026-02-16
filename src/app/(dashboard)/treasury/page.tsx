"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Landmark, Building2, Plus, Wallet, Banknote, Trash2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getTreasuryData,
  deleteBank,
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
  const [bankToDelete, setBankToDelete] = useState<AccountSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = () => {
    getTreasuryData().then(setData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteBank = async () => {
    if (!bankToDelete) return;
    
    setIsDeleting(true);
    const result = await deleteBank(bankToDelete.id);
    setIsDeleting(false);
    
    if (result.success) {
      setBankToDelete(null);
      loadData();
    } else {
      alert(result.error || "حدث خطأ أثناء حذف البنك");
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
                      acc.type === "safe" ? "border-b-blue-500" : "border-b-violet-500"
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
                
                {/* زر الحذف - يظهر ثابت للبنوك مع cursor pointer */}
                {acc.type === "bank" && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -left-2 h-8 w-8 rounded-full shadow-lg cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setBankToDelete(acc);
                    }}
                  >
                    <Trash2 className="h-4 w-4 cursor-pointer" />
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
                            trans.type === "payment" ? "text-red-600" : "text-emerald-600"
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

      {/* Alert Dialog لتأكيد الحذف */}
      <AlertDialog open={!!bankToDelete} onOpenChange={() => setBankToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف البنك؟</AlertDialogTitle>
            <AlertDialogDescription>
              {`هل تريد حذف بنك "${bankToDelete?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
              {bankToDelete && (bankToDelete.balance > 0) && (
                <p className="text-red-600 mt-2 font-bold">
                  {`⚠️ تحذير: هذا البنك لديه رصيد ${bankToDelete.balance.toLocaleString()} ج.م`}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBank}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 cursor-pointer"
            >
              {isDeleting ? "جاري الحذف..." : "نعم، احذف"}
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