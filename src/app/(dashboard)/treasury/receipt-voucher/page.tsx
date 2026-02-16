"use client";

import React, { useState, useEffect } from "react";
import { ArrowDownCircle, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner"; // ← أضف هذا
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getReceiptInitialData, createReceiptVoucher } from "../actions";

interface Customer {
  id: number;
  name: string;
  code: number;
}

interface Account {
  id: number;
  name: string;
  balance: number;
}

export default function ReceiptVoucherPage() {
  const [formData, setFormData] = useState({
    voucherNumber: `RV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900 + 100))}`,
    date: new Date().toISOString().split("T")[0],
    amount: "",
    customerId: "",
    accountType: "" as "safe" | "bank" | "",
    accountId: "",
    description: "",
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [safes, setSafes] = useState<Account[]>([]);
  const [banks, setBanks] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.accountType === "safe" && safes.length === 1) {
      setFormData(prev => ({
        ...prev,
        accountId: safes[0].id.toString()
      }));
    } else if (formData.accountType === "bank") {
      setFormData(prev => ({ ...prev, accountId: "" }));
    }
  }, [formData.accountType, safes]);

  const loadInitialData = async () => {
    const data = await getReceiptInitialData();
    setCustomers(data.customers);
    setSafes(data.safes);
    setBanks(data.banks);
  };

  const handleReset = () => {
    setFormData({
      voucherNumber: `RV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900 + 100))}`,
      date: new Date().toISOString().split("T")[0],
      amount: "",
      customerId: "",
      accountType: "",
      accountId: "",
      description: "",
    });
    toast.info("تم مسح البيانات");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.accountType) {
      toast.error("الرجاء اختيار نوع الحساب");
      return;
    }

    if (!formData.customerId) {
      toast.error("الرجاء اختيار العميل");
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح");
      return;
    }

    let finalAccountId = formData.accountId;

    if (formData.accountType === "safe") {
      if (!finalAccountId && safes.length === 1) {
        finalAccountId = safes[0].id.toString();
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

    const customerIdNum = parseInt(formData.customerId);
    if (isNaN(customerIdNum) || customerIdNum <= 0) {
      toast.error("رقم العميل غير صحيح");
      return;
    }

    setLoading(true);

    try {
      const result = await createReceiptVoucher({
        voucherNumber: formData.voucherNumber,
        date: formData.date,
        amount: parseFloat(formData.amount),
        customerId: customerIdNum,
        accountType: formData.accountType,
        accountId: accountIdNum,
        description: formData.description,
      });

      if (result.success) {
        toast.success("✅ تم حفظ سند القبض بنجاح");
        setTimeout(() => {
          window.location.href = "/treasury";
        }, 1000);
      } else {
        toast.error(`خطأ: ${result.error}`);
      }
    } catch (error) {
      console.error("خطأ في حفظ السند:", error);
      toast.error("حدث خطأ أثناء حفظ السند");
    } finally {
      setLoading(false);
    }
  };

  const currentAccounts: Account[] =
    formData.accountType === "safe"
      ? safes
      : formData.accountType === "bank"
        ? banks
        : [];

  const showAccountSelector = formData.accountType === "bank" ||
    (formData.accountType === "safe" && safes.length > 1);

  return (
    <>
      <Navbar title="سند قبض" />
      <div className="flex-1 p-6" dir="rtl">
        <Card className="max-w-3xl mx-auto shadow-sm">
          <CardHeader className="border-b bg-emerald-50/50">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-emerald-100 shadow-sm">
                <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
              </div>
              إنشاء سند قبض جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="voucherNumber">رقم السند</Label>
                  <Input
                    id="voucherNumber"
                    value={formData.voucherNumber}
                    readOnly
                    className="bg-muted/50 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">التاريخ</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>من حساب (العميل) *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, customerId: val })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name} {c.code ? `(كود: ${c.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>إيداع في (نوع الحساب) *</Label>
                  <Select
                    value={formData.accountType}
                    onValueChange={(val: "safe" | "bank") =>
                      setFormData({
                        ...formData,
                        accountType: val,
                        accountId: "",
                      })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الحساب" />
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
                      value={formData.accountId}
                      onValueChange={(val) =>
                        setFormData({ ...formData, accountId: val })
                      }
                      required
                      disabled={!formData.accountType}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            formData.accountType
                              ? `اختر ${formData.accountType === 'safe' ? 'الخزنة' : 'البنك'}`
                              : "اختر نوع الحساب أولاً"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {currentAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id.toString()}>
                            {acc.name} (الرصيد: {acc.balance.toLocaleString()} ج.م)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : formData.accountType === "safe" && safes.length === 1 ? (
                  <div className="space-y-2">
                    <Label>الخزنة</Label>
                    <Input
                      value={safes[0].name}
                      readOnly
                      className="bg-muted/50"
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                  className="text-lg font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">البيان / الملاحظات</Label>
                <Textarea
                  id="description"
                  placeholder="أدخل وصف أو ملاحظات عن سند القبض..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="gap-2"
                  disabled={loading}
                >
                  <RotateCcw className="h-4 w-4" />
                  مسح
                </Button>
                <Button
                  type="submit"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  disabled={loading}
                >
                  <Save className="h-4 w-4" />
                  {loading ? "جاري الحفظ..." : "حفظ سند القبض"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}