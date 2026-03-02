"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Landmark,
  Building2,
  ArrowLeft,
  RotateCcw,
  Calendar,
  DollarSign,
  Hash,
  Archive,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getArchivedAccounts, restoreAccount } from "../actions";
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

interface ArchivedAccount {
  id: number;
  name: string;
  type: 'safe' | 'bank';
  accountNumber?: string | null;
  branch?: string | null;
  balance: number;
  description?: string | null;
  updatedAt: string | Date;
}

export default function ArchivedAccountsPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<ArchivedAccount[]>([]);
  const [safes, setSafes] = useState<ArchivedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountToRestore, setAccountToRestore] = useState<ArchivedAccount | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadArchivedAccounts();
  }, []);

  const loadArchivedAccounts = async () => {
    setLoading(true);
    const result = await getArchivedAccounts();
    if (result.success) {
      setBanks(result.banks || []);
      setSafes(result.safes || []);
    } else {
      toast.error("فشل في تحميل الحسابات المؤرشفة");
    }
    setLoading(false);
  };

  const handleRestoreClick = (account: ArchivedAccount) => {
    setAccountToRestore(account);
    setShowConfirmDialog(true);
  };

  const handleRestore = async () => {
    if (!accountToRestore) return;

    setIsRestoring(true);
    const result = await restoreAccount(accountToRestore.id, accountToRestore.type);
    setIsRestoring(false);

    if (result.success) {
      toast.success(`✅ تم إرجاع "${accountToRestore.name}" إلى القائمة`);
      setShowConfirmDialog(false);
      setAccountToRestore(null);
      loadArchivedAccounts();
    } else {
      toast.error(result.error || "حدث خطأ أثناء إرجاع الحساب");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar title="الحسابات المؤرشفة" />
        <div className="p-10 text-center">جاري تحميل البيانات...</div>
      </>
    );
  }

  return (
    <>
      <Navbar title="الحسابات المؤرشفة" />
      <div className="p-6" dir="rtl">
        {/* زر الرجوع */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => router.push("/treasury")}
          >
            <ArrowLeft className="h-4 w-4" />
            العودة لإدارة النقدية
          </Button>
        </div>

        {/* عنوان الصفحة */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Archive className="h-6 w-6 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold">الحسابات المؤرشفة</h1>
          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold mr-4">
            {banks.length + safes.length} حساب
          </span>
        </div>

        {banks.length === 0 && safes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Archive className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-600 mb-2">
                لا توجد حسابات مؤرشفة
              </h3>
              <p className="text-gray-500">جميع الحسابات نشطة حالياً</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...banks, ...safes].map((account) => {
              return (
                <Card
                  key={`${account.type}-${account.id}`}
                  className="relative border-r-4 border-r-orange-500 hover:shadow-lg transition-all"
                >
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        {account.type === 'safe' ? <Building2 className="text-orange-600" /> : <Landmark className="text-orange-600" />}
                      </div>
                      <span className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                        {account.type === 'safe' ? 'خزنة' : 'بنك'}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg mb-2">{account.name}</h3>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-900 font-bold">
                        <span>{account.balance.toLocaleString()} ج.م</span>
                      </div>

                      {account.accountNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <Hash className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">{account.accountNumber}</span>
                        </div>
                      )}

                      {account.branch && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">{account.branch}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">
                          أرشفة: {new Date(account.updatedAt).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full gap-2 bg-orange-600 hover:bg-orange-700"
                      onClick={() => handleRestoreClick(account)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      إرجاع الحساب
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Alert Dialog لتأكيد الإرجاع */}
        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
                <RotateCcw className="h-5 w-5" />
                تأكيد إرجاع البنك
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    هل أنت متأكد من إرجاع "{accountToRestore?.name}" إلى
                    القائمة النشطة؟
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 font-bold mb-2">ℹ️ معلومات</p>
                    <ul className="text-blue-700 text-sm list-disc list-inside space-y-1">
                      <li>البنك سيظهر مرة أخرى في قائمة الحسابات</li>
                      <li>جميع المعاملات المرتبطة به ستبقى كما هي</li>
                      <li>يمكنك استخدام البنك في سندات جديدة</li>
                    </ul>
                  </div>

                  {accountToRestore && accountToRestore.balance > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 font-bold">
                        الرصيد: {accountToRestore.balance.toLocaleString()} ج.م
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
                  setAccountToRestore(null);
                }}
              >
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRestore}
                disabled={isRestoring}
                className="bg-orange-600 hover:bg-orange-700 cursor-pointer"
              >
                {isRestoring ? "جاري الإرجاع..." : "نعم، إرجاع الحساب"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
