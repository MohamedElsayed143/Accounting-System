"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTreasuryData, AccountSummary } from "../actions";
import { createTransfer, getNextTransferNumber } from "../transfers/actions";
import { toast } from "sonner";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function TransferDialog({ open, onOpenChange, onSuccess }: TransferDialogProps) {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextNumber, setNextNumber] = useState("");
  
  const [fromAccount, setFromAccount] = useState<string>("");
  const [toAccount, setToAccount] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    const [data, num] = await Promise.all([
      getTreasuryData(),
      getNextTransferNumber()
    ]);
    setAccounts(data.accounts);
    setNextNumber(num);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccount || !toAccount) {
      toast.error("يرجى اختيار الحسابات");
      return;
    }

    if (fromAccount === toAccount) {
      toast.error("لا يمكن التحويل لنفس الحساب");
      return;
    }

    const fromAcc = accounts.find(a => `${a.type}-${a.id}` === fromAccount);
    if (fromAcc && fromAcc.balance < parseFloat(amount)) {
      toast.error("رصيد الحساب المصدر غير كافٍ");
      return;
    }

    setLoading(true);
    try {
      const [fromType, fromId] = fromAccount.split("-");
      const [toType, toId] = toAccount.split("-");

      const result = await createTransfer({
        transferNumber: nextNumber,
        date,
        amount: parseFloat(amount),
        description,
        fromType: fromType as "safe" | "bank",
        fromId: parseInt(fromId),
        toType: toType as "safe" | "bank",
        toId: parseInt(toId),
      });

      if ((result as any).pending) {
        toast.success(result.message || "✅ تم إرسال طلب التحويل للمدير للموافقة");
      } else {
        toast.success("تم التحويل بنجاح");
      }
      onSuccess();
      onOpenChange(false);
      // Reset
      setAmount("");
      setDescription("");
      setFromAccount("");
      setToAccount("");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء التحويل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">تحويل أموال بين الحسابات</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>رقم العملية</Label>
              <Input value={nextNumber} readOnly className="bg-slate-50 font-mono" />
            </div>
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>من حساب</Label>
              <Select value={fromAccount} onValueChange={setFromAccount}>
                <SelectTrigger className="bg-red-50/30 border-red-100 focus:ring-red-500">
                  <SelectValue placeholder="اختر المصدر" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={`${acc.type}-${acc.id}`} value={`${acc.type}-${acc.id}`}>
                      {acc.type === "safe" ? "📦" : "🏦"} {acc.name} ({acc.balance.toLocaleString()} ج.م)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>إلى حساب</Label>
              <Select value={toAccount} onValueChange={setToAccount}>
                <SelectTrigger className="bg-green-50/30 border-green-100 focus:ring-green-500">
                  <SelectValue placeholder="اختر الوجهة" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={`${acc.type}-${acc.id}`} value={`${acc.type}-${acc.id}`}>
                      {acc.type === "safe" ? "📦" : "🏦"} {acc.name} ({acc.balance.toLocaleString()} ج.م)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>المبلغ المراد تحويله</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0.00"
              required 
              className="text-lg font-bold text-center"
            />
          </div>

          <div className="space-y-2">
            <Label>ملاحظات / سبب التحويل</Label>
            <Textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="اكتب تفاصيل التحويل هنا..."
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading} className="px-8">
              {loading ? "جاري التحويل..." : "تأكيد التحويل"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
