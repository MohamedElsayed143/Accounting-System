"use client";

import { useState } from "react";
import { ArrowDownCircle, Save, RotateCcw } from "lucide-react";
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
import { treasuryAccounts, customers } from "@/mock-data";

export default function ReceiptVoucherPage() {
  const [formData, setFormData] = useState({
    voucherNumber: `RV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900 + 100))}`,
    date: new Date().toISOString().split("T")[0],
    amount: "",
    fromAccount: "",
    toAccount: "",
    description: "",
  });

  const depositAccounts = treasuryAccounts;

  const handleReset = () => {
    setFormData({
      voucherNumber: `RV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900 + 100))}`,
      date: new Date().toISOString().split("T")[0],
      amount: "",
      fromAccount: "",
      toAccount: "",
      description: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder for save logic
    alert("تم حفظ سند القبض بنجاح");
    handleReset();
  };

  return (
    <>
      <Navbar title="سند قبض" />
      <div className="flex-1 p-6" dir="rtl">
        <Card className="max-w-3xl mx-auto shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-emerald-100 shadow-sm">
                <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
              </div>
              إنشاء سند قبض جديد
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
                  <Label>من حساب (المصدر)</Label>
                  <Select
                    value={formData.fromAccount}
                    onValueChange={(val) =>
                      setFormData({ ...formData, fromAccount: val })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل أو الجهة" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>إيداع في</Label>
                  <Select
                    value={formData.toAccount}
                    onValueChange={(val) =>
                      setFormData({ ...formData, toAccount: val })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الخزنة أو البنك" />
                    </SelectTrigger>
                    <SelectContent>
                      {depositAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.name}>
                          {a.name}
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
                  placeholder="أدخل وصف أو ملاحظات عن سند القبض..."
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
                  حفظ سند القبض
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
