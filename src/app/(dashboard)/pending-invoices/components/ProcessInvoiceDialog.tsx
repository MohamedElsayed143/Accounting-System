"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CreditCard, 
  Banknote, 
  Building2, 
  Wallet,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { getInitialData } from "../../treasury/payment-voucher/actions";
import { finalizeSalesInvoice, finalizePurchaseInvoice } from "../actions";

interface ProcessInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  type: "sales" | "purchase";
  onSuccess: () => void;
}

export function ProcessInvoiceDialog({
  isOpen,
  onClose,
  invoice,
  type,
  onSuccess
}: ProcessInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vaults, setVaults] = useState<{ safes: any[], banks: any[] }>({ safes: [], banks: [] });
  const [status, setStatus] = useState<"cash" | "credit">("credit");
  const [paymentType, setPaymentType] = useState<"safe" | "bank">("safe");
  const [accountId, setAccountId] = useState<string>("");

  useEffect(() => {
    async function loadVaults() {
      setLoading(true);
      try {
        const data = await getInitialData();
        setVaults({ safes: data.safes, banks: data.banks });
      } catch (error) {
        toast.error("فشل في تحميل بيانات الخزائن");
      } finally {
        setLoading(false);
      }
    }
    if (isOpen) loadVaults();
  }, [isOpen]);

  const handleFinalize = async () => {
    if (status === "cash" && !accountId) {
      toast.error("يرجى اختيار الخزينة أو البنك");
      return;
    }

    setSubmitting(true);
    try {
      const paymentData = {
        status,
        ...(status === "cash" ? {
          safeId: paymentType === "safe" ? parseInt(accountId) : undefined,
          bankId: paymentType === "bank" ? parseInt(accountId) : undefined,
        } : {})
      };

      const result = type === "sales" 
        ? await finalizeSalesInvoice(invoice.id, paymentData as any)
        : await finalizePurchaseInvoice(invoice.id, paymentData as any);

      if (result.success) {
        toast.success("تم تأكيد الفاتورة بنجاح");
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء التأكيد");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-orange-600" />
            تأكيد الفاتورة رقم #{invoice?.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            اختر طريقة الدفع لتأكيد الفاتورة وتحديث المخازن والمالية.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <Label className="text-base font-bold">طريقة الدفع</Label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={status === "cash" ? "default" : "outline"}
                className={`h-24 flex-col gap-2 transition-all ${status === "cash" ? "bg-blue-600 hover:bg-blue-700 shadow-md" : ""}`}
                onClick={() => setStatus("cash")}
              >
                <Banknote className={`h-8 w-8 ${status === "cash" ? "text-white" : "text-blue-600"}`} />
                <span>دفع نقدي</span>
              </Button>
              <Button
                type="button"
                variant={status === "credit" ? "default" : "outline"}
                className={`h-24 flex-col gap-2 transition-all ${status === "credit" ? "bg-purple-600 hover:bg-purple-700 shadow-md" : ""}`}
                onClick={() => setStatus("credit")}
              >
                <CreditCard className={`h-8 w-8 ${status === "credit" ? "text-white" : "text-purple-600"}`} />
                <span>دفع آجل</span>
              </Button>
            </div>
          </div>

          {status === "cash" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label className="text-sm font-medium">نوع الحساب</Label>
                <Select value={paymentType} onValueChange={(v: any) => {
                  setPaymentType(v);
                  setAccountId("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الحساب" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="safe">خزينة</SelectItem>
                    <SelectItem value="bank">بنك</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {paymentType === "safe" ? "اختر الخزينة" : "اختر البنك"}
                </Label>
                <Select value={accountId} onValueChange={setAccountId} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? "جاري التحميل..." : (paymentType === "safe" ? "اختر خزينة" : "اختر بنك")} />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {paymentType === "safe" ? (
                      vaults.safes.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name} (المتاح: {s.balance.toLocaleString("ar-EG")} ج.م)
                        </SelectItem>
                      ))
                    ) : (
                      vaults.banks.map(b => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {b.name} (المتاح: {b.balance.toLocaleString("ar-EG")} ج.م)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg flex gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800 dark:text-orange-400">
              <p className="font-bold">تنبيه:</p>
              <p>عند الضغط على "تأكيد بالفواتير"، سيتم تحديث أرصدة الأصناف في المخزن وأرصدة {status === "cash" ? "الخزينة المختارة" : "المورد/العميل"} فوراً.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleFinalize}
            disabled={submitting || (status === "cash" && !accountId)}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري التأكيد...
              </>
            ) : "تأكيد وحفظ نهائي"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
