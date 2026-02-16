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
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getArchivedBanks, restoreBank } from "../actions";
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

interface ArchivedBank {
  id: number;
  name: string;
  accountNumber: string | null;
  branch: string | null;
  balance: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  receiptVouchers: any[];
  paymentVouchers: any[];
}

export default function ArchivedBanksPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<ArchivedBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankToRestore, setBankToRestore] = useState<ArchivedBank | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadArchivedBanks();
  }, []);

  const loadArchivedBanks = async () => {
    setLoading(true);
    const result = await getArchivedBanks();
    if (result.success && result.banks) {
      setBanks(result.banks);
    } else {
      toast.error("فشل في تحميل البنوك المؤرشفة");
    }
    setLoading(false);
  };

  const handleRestoreClick = (bank: ArchivedBank) => {
    setBankToRestore(bank);
    setShowConfirmDialog(true);
  };

  const handleRestore = async () => {
    if (!bankToRestore) return;

    setIsRestoring(true);
    const result = await restoreBank(bankToRestore.id);
    setIsRestoring(false);

    if (result.success) {
      toast.success(`✅ تم إرجاع بنك "${bankToRestore.name}" إلى القائمة`);
      setShowConfirmDialog(false);
      setBankToRestore(null);
      loadArchivedBanks();
    } else {
      toast.error(result.error || "حدث خطأ أثناء إرجاع البنك");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar title="البنوك المؤرشفة" />
        <div className="p-10 text-center">جاري تحميل البيانات...</div>
      </>
    );
  }

  return (
    <>
      <Navbar title="البنوك المؤرشفة" />
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
            <Landmark className="h-6 w-6 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold">البنوك المؤرشفة</h1>
          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold mr-4">
            {banks.length} بنك
          </span>
        </div>

        {banks.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Landmark className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-600 mb-2">
                لا توجد بنوك مؤرشفة
              </h3>
              <p className="text-gray-500">جميع البنوك نشطة حالياً</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banks.map((bank) => {
              const totalTransactions =
                bank.receiptVouchers.length + bank.paymentVouchers.length;

              return (
                <Card
                  key={bank.id}
                  className="relative border-r-4 border-r-orange-500 hover:shadow-lg transition-all"
                >
                  <CardContent className="pt-6">
                    {/* أيقونة البنك */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <Landmark className="text-orange-600" />
                      </div>
                      <span className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                        مؤرشف
                      </span>
                    </div>

                    {/* اسم البنك */}
                    <h3 className="font-bold text-lg mb-2">{bank.name}</h3>

                    {/* تفاصيل البنك */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold">
                          {bank.balance.toLocaleString()} ج.م
                        </span>
                      </div>

                      {bank.accountNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <Hash className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">
                            {bank.accountNumber}
                          </span>
                        </div>
                      )}

                      {bank.branch && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">{bank.branch}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">
                          أرشفة:{" "}
                          {new Date(bank.updatedAt).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </div>

                    {/* ملخص المعاملات */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-gray-600">
                        لديه {totalTransactions} معاملة
                      </p>
                    </div>

                    {/* زر الإرجاع */}
                    <Button
                      className="w-full gap-2 bg-orange-600 hover:bg-orange-700"
                      onClick={() => handleRestoreClick(bank)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      إرجاع البنك
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
                    هل أنت متأكد من إرجاع بنك "{bankToRestore?.name}" إلى
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

                  {bankToRestore && bankToRestore.balance > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 font-bold">
                        رصيد البنك: {bankToRestore.balance.toLocaleString()} ج.م
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
                  setBankToRestore(null);
                }}
              >
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRestore}
                disabled={isRestoring}
                className="bg-orange-600 hover:bg-orange-700 cursor-pointer"
              >
                {isRestoring ? "جاري الإرجاع..." : "نعم، إرجاع البنك"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
