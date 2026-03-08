"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSafe } from "../actions";
import { toast } from "sonner";

interface AddSafeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddSafeDialog({ open, onOpenChange, onSuccess }: AddSafeDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    initialBalance: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await createSafe({
      name: formData.name,
      description: formData.description,
      initialBalance: parseFloat(formData.initialBalance) || 0,
    });

    if (result.success) {
      setFormData({ name: "", description: "", initialBalance: "" });
      if ((result as any).pending) {
        toast.success(result.message || "تم إرسال الطلب للمدير للموافقة");
      } else {
        toast.success("تمت الإضافة بنجاح");
        onSuccess();
      }
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
          <DialogTitle>إضافة خزنة جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم الخزنة *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: خزنة المعرض"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="وصف اختياري للخزنة"
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
