"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner"; // ← أضف هذا
import { createPaymentVoucher, getInitialData, type InitialData } from "./actions";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PaymentVoucherPage() {
  const [formData, setFormData] = useState({
    voucherNumber: `PV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString().split("T")[0],
    amount: "",
    accountType: "" as "safe" | "bank" | "",
    accountId: "",
    supplierId: "",
    description: "",
  });

  const [data, setData] = useState<InitialData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getInitialData().then((fetchedData) => {
      setData(fetchedData);
      if (fetchedData?.safes?.length === 1 && formData.accountType === "safe") {
        setFormData(prev => ({ 
          ...prev, 
          accountId: fetchedData.safes[0].id.toString() 
        }));
      }
    });
  }, []);

  useEffect(() => {
    if (formData.accountType === "safe" && data?.safes) {
      if (data.safes.length === 1) {
        setFormData(prev => ({ 
          ...prev, 
          accountId: data.safes[0].id.toString() 
        }));
      } else if (data.safes.length > 1 && !formData.accountId) {
        setFormData(prev => ({ ...prev, accountId: "" }));
      }
    } else if (formData.accountType === "bank") {
      setFormData(prev => ({ ...prev, accountId: "" }));
    }
  }, [formData.accountType, data?.safes, data?.banks]);

  const currentAccounts = formData.accountType === "safe" ? data?.safes : data?.banks;
  const selectedAcc = currentAccounts?.find(a => a.id.toString() === formData.accountId);
  const isOverBalance = selectedAcc ? selectedAcc.balance < (Number(formData.amount) || 0) : false;

  const showAccountSelector = formData.accountType === "bank" || 
                             (formData.accountType === "safe" && data?.safes && data.safes.length > 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.accountType) {
      toast.error("الرجاء اختيار نوع الحساب");
      return;
    }

    if (!formData.supplierId) {
      toast.error("الرجاء اختيار المورد");
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح");
      return;
    }

    let finalAccountId = formData.accountId;

    if (formData.accountType === "safe") {
      if (!finalAccountId && data?.safes && data.safes.length === 1) {
        finalAccountId = data.safes[0].id.toString();
      }
      
      if (!finalAccountId) {
        toast.error("الرجاء اختيار الخزنة");
        return;
      }
    } else if (formData.accountType === "bank") {
      if (!finalAccountId) {
        toast.error("الرجاء اختيار البنك");
        return;
      }
    }

    const accountIdNum = parseInt(finalAccountId);
    if (isNaN(accountIdNum) || accountIdNum <= 0) {
      toast.error("رقم الحساب غير صحيح");
      return;
    }

    const supplierIdNum = parseInt(formData.supplierId);
    if (isNaN(supplierIdNum) || supplierIdNum <= 0) {
      toast.error("رقم المورد غير صحيح");
      return;
    }

    const finalSelectedAcc = formData.accountType === "safe" 
      ? data?.safes?.find(a => a.id === accountIdNum)
      : data?.banks?.find(a => a.id === accountIdNum);

    const amountNum = parseFloat(formData.amount);
    
    if (finalSelectedAcc && finalSelectedAcc.balance < amountNum) {
      toast.error(`الرصيد غير كافٍ (المتاح: ${finalSelectedAcc.balance.toLocaleString()} ج.م)`);
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await createPaymentVoucher({
        voucherNumber: formData.voucherNumber,
        date: formData.date,
        amount: amountNum,
        accountType: formData.accountType,
        accountId: accountIdNum,
        supplierId: supplierIdNum,
        description: formData.description,
      });
      
      if (res.success) {
        toast.success("✅ تم حفظ سند الصرف بنجاح");
        setTimeout(() => {
          window.location.href = "/treasury";
        }, 1000);
      } else {
        toast.error(`خطأ: ${res.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar title="إنشاء سند صرف" />
      <div className="p-6" dir="rtl">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader className="bg-red-50/50">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <ArrowUpCircle className="h-6 w-6" /> سند صرف مالي
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رقم السند</Label>
                  <Input value={formData.voucherNumber} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>التاريخ</Label>
                  <Input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نوع الحساب *</Label>
                  <Select 
                    required
                    value={formData.accountType}
                    onValueChange={(v: "safe" | "bank") => setFormData({...formData, accountType: v, accountId: ""})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safe">خزنة</SelectItem>
                      <SelectItem value="bank">بنك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showAccountSelector ? (
                  <div className="space-y-2">
                    <Label>اختر {formData.accountType === 'safe' ? 'الخزنة' : 'البنك'} *</Label>
                    <Select 
                      required
                      value={formData.accountId}
                      onValueChange={v => setFormData({...formData, accountId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`اختر ${formData.accountType === 'safe' ? 'الخزنة' : 'البنك'}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {currentAccounts?.map(acc => (
                          <SelectItem key={acc.id} value={acc.id.toString()}>
                            {acc.name} ({acc.balance.toLocaleString()} ج.م)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : formData.accountType === "safe" && data?.safes && data.safes.length === 1 ? (
                  <div className="space-y-2">
                    <Label>الخزنة</Label>
                    <Input 
                      value={data.safes[0].name} 
                      readOnly 
                      className="bg-muted/50"
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>إلى المورد *</Label>
                <Select 
                  required
                  value={formData.supplierId}
                  onValueChange={v => setFormData({...formData, supplierId: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المورد" />
                  </SelectTrigger>
                  <SelectContent>
                    {data?.suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name} {s.code ? `(${s.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>المبلغ *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  required
                  value={formData.amount} 
                  className={isOverBalance ? "border-red-500 bg-red-50" : ""}
                  onChange={e => setFormData({...formData, amount: e.target.value})} 
                />
                {isOverBalance && (
                  <p className="text-xs text-red-600 font-bold">
                    ⚠️ الرصيد غير كافٍ (المتاح: {selectedAcc?.balance.toLocaleString()} ج.م)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>البيان</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={4}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700" 
                disabled={loading}
              >
                {loading ? "جاري الحفظ..." : "حفظ السند وتحديث الأرصدة"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}