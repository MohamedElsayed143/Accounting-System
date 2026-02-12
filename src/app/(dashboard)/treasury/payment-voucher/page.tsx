"use client";

import { useState } from "react";
import { ArrowUpCircle, Save, RotateCcw } from "lucide-react";
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
import { treasuryAccounts, suppliers, expenseCategories } from "@/mock-data";

export default function PaymentVoucherPage() {
  const [formData, setFormData] = useState({
    voucherNumber: `PV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900 + 100))}`,
    date: new Date().toISOString().split("T")[0],
    amount: "",
    fromAccount: "",
    toAccount: "",
    description: "",
  });

  const sourceAccounts = treasuryAccounts;

  const handleReset = () => {
    setFormData({
      voucherNumber: `PV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900 + 100))}`,
      date: new Date().toISOString().split("T")[0],
      amount: "",
      fromAccount: "",
      toAccount: "",
      description: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("تم حفظ سند الصرف بنجاح");
    handleReset();
  };

  return (
    <>
      <Navbar title="سند صرف" />
      <div className="flex-1 p-6" dir="rtl">
        <Card className="max-w-3xl mx-auto shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-red-100 shadow-sm">
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
              </div>
              إنشاء سند صرف جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Voucher Number & Date */}
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

              {/* Row 2: Source & Destination */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>الصرف من</Label>
                  <Select
                    value={formData.fromAccount}
                    onValueChange={(val) =>
                      setFormData({ ...formData, fromAccount: val })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الخزنة أو البنك" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.name}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>إلى حساب (الجهة)</Label>
                  <Select
                    value={formData.toAccount}
                    onValueChange={(val) =>
                      setFormData({ ...formData, toAccount: val })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المورد أو فئة المصروف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__separator_suppliers" disabled>
                        — الموردون —
                      </SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__separator_expenses" disabled>
                        — فئات المصروفات —
                      </SelectItem>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ (ر.س)</Label>
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

              {/* Row 4: Description */}
              <div className="space-y-2">
                <Label htmlFor="description">البيان / الملاحظات</Label>
                <Textarea
                  id="description"
                  placeholder="أدخل وصف أو ملاحظات عن سند الصرف..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  مسح
                </Button>
                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" />
                  حفظ سند الصرف
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
