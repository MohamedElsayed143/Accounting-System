"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBank } from "../actions";

interface AddBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddBankDialog({ open, onOpenChange, onSuccess }: AddBankDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    accountNumber: "",
    branch: "",
    initialBalance: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await createBank({
      name: formData.name,
      accountNumber: formData.accountNumber,
      branch: formData.branch,
      initialBalance: parseFloat(formData.initialBalance) || 0,
    });

    if (result.success) {
      setFormData({ name: "", accountNumber: "", branch: "", initialBalance: "" });
      onSuccess();
      onOpenChange(false);
    } else {
      setError(result.error || "حدث خطأ أثناء الإضافة");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة بنك جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم البنك *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: البنك الأهلي"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="accountNumber">رقم الحساب</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="رقم الحساب"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="branch">الفرع</Label>
            <Input
              id="branch"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              placeholder="اسم الفرع"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="initialBalance">الرصيد الافتتاحي</Label>
            <Input
              id="initialBalance"
              type="number"
              step="0.01"
              value={formData.initialBalance}
              onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
              placeholder="0.00"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}