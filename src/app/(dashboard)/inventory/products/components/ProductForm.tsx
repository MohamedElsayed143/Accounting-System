// app/(dashboard)/inventory/products/components/ProductForm.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategories } from "../../categories/actions";
import { getNextProductCode } from "../actions";
import { toast } from "sonner";

interface Category {
  id: number;
  name: string;
}

interface ProductFormValues {
  code: string;
  name: string;
  unit: string;
  buyPrice: string;
  sellPrice: string;
  categoryId: string;
  discountPercent: string; // نسبة الخصم/الربح (بالنسبة لسعر البيع)
}

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    code: string;
    name: string;
    unit: string;
    buyPrice: number;
    sellPrice: number;
    profitMargin: number;
    categoryId?: number;
  }) => Promise<void>;
  initialValues?: Partial<ProductFormValues> & { id?: number };
  title: string;
}

const defaultValues: ProductFormValues = {
  code: "",
  name: "",
  unit: "",
  buyPrice: "",
  sellPrice: "",
  categoryId: "",
  discountPercent: "",
};

export function ProductForm({
  open,
  onClose,
  onSubmit,
  initialValues,
  title,
}: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(defaultValues);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [updatingFromDiscount, setUpdatingFromDiscount] = useState(false);
  const [updatingFromBuyPrice, setUpdatingFromBuyPrice] = useState(false);
  const [updatingFromSellPrice, setUpdatingFromSellPrice] = useState(false);

  useEffect(() => {
    getCategories().then((cats) => setCategories(cats));
  }, []);

  // توليد كود افتراضي عند فتح النموذج للإضافة
  useEffect(() => {
    if (open && !initialValues?.id) {
      setLoadingCode(true);
      getNextProductCode()
        .then((code) => {
          setValues((prev) => ({ ...prev, code }));
        })
        .catch(() => toast.error("فشل في توليد الكود الافتراضي"))
        .finally(() => setLoadingCode(false));
    }
  }, [open, initialValues?.id]);

  // حساب نسبة الخصم بناءً على سعر البيع والشراء
  useEffect(() => {
    if (updatingFromDiscount || updatingFromBuyPrice || updatingFromSellPrice) return;

    const buy = parseFloat(values.buyPrice);
    const sell = parseFloat(values.sellPrice);
    if (!isNaN(buy) && !isNaN(sell) && sell > 0) {
      const discount = ((sell - buy) / sell) * 100;
      setValues((prev) => ({ ...prev, discountPercent: discount.toFixed(2) }));
    } else {
      setValues((prev) => ({ ...prev, discountPercent: "" }));
    }
  }, [values.buyPrice, values.sellPrice, updatingFromDiscount, updatingFromBuyPrice, updatingFromSellPrice]);

  // عند تغيير حقل الخصم (نسبة)
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    if (!isNaN(percent)) {
      setUpdatingFromDiscount(true);
      const sell = parseFloat(values.sellPrice);
      if (!isNaN(sell) && sell > 0) {
        // إذا كانت النسبة 100%، سيصبح سعر الشراء صفراً – نسمح بذلك؟ قد يكون مقبولاً
        const newBuy = sell * (1 - percent / 100);
        if (newBuy >= 0) {
          setValues((prev) => ({
            ...prev,
            discountPercent: e.target.value,
            buyPrice: newBuy.toFixed(2),
          }));
        } else {
          toast.error("نسبة الخصم تؤدي إلى سعر شراء سالب");
        }
      } else {
        // إذا لم يتم إدخال سعر البيع بعد، نخزن النسبة فقط
        setValues((prev) => ({ ...prev, discountPercent: e.target.value }));
      }
      setUpdatingFromDiscount(false);
    } else {
      setValues((prev) => ({ ...prev, discountPercent: e.target.value }));
    }
  };

  // عند تغيير سعر الشراء يدوياً
  const handleBuyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpdatingFromBuyPrice(true);
    setValues((prev) => ({ ...prev, buyPrice: e.target.value }));
    setUpdatingFromBuyPrice(false);
  };

  // عند تغيير سعر البيع يدوياً
  const handleSellPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpdatingFromSellPrice(true);
    setValues((prev) => ({ ...prev, sellPrice: e.target.value }));
    setUpdatingFromSellPrice(false);
  };

  const setField = (field: keyof ProductFormValues) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من الحقول الإلزامية
    if (!values.code.trim()) {
      toast.error("كود الصنف مطلوب");
      return;
    }
    if (!values.name.trim()) {
      toast.error("اسم الصنف مطلوب");
      return;
    }
    if (!values.unit.trim()) {
      toast.error("وحدة القياس مطلوبة");
      return;
    }
    const buyPrice = parseFloat(values.buyPrice);
    if (isNaN(buyPrice) || buyPrice < 0) {
      toast.error("سعر الشراء يجب أن يكون رقماً غير سالب");
      return;
    }
    const sellPrice = parseFloat(values.sellPrice);
    if (isNaN(sellPrice) || sellPrice <= 0) {
      toast.error("سعر البيع يجب أن يكون رقماً أكبر من صفر");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        code: values.code.trim(),
        name: values.name.trim(),
        unit: values.unit.trim(),
        buyPrice,
        sellPrice,
        profitMargin: parseFloat(values.discountPercent) || 0,
        categoryId: values.categoryId ? parseInt(values.categoryId) : undefined,
      });
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (open) {
      setValues({
        ...defaultValues,
        ...initialValues,
        code: initialValues?.code ?? values.code,
        buyPrice: initialValues?.buyPrice ?? "",
        sellPrice: initialValues?.sellPrice ?? "",
        categoryId: initialValues?.categoryId ?? "",
        discountPercent: "", // سيتم حسابه تلقائياً بواسطة useEffect
      });
    }
  }, [open, initialValues]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[540px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* كود الصنف - قابل للتعديل */}
            <div className="space-y-2">
              <Label htmlFor="code">كود الصنف *</Label>
              <Input
                id="code"
                placeholder={loadingCode ? "جاري التوليد..." : "مثال: PRD-001"}
                value={values.code}
                onChange={setField("code")}
                dir="ltr"
                required
              />
              <p className="text-xs text-muted-foreground">
                {initialValues?.id
                  ? "تغيير الكود سيؤثر على المنتج (تأكد من عدم تكراره)"
                  : "يمكنك تعديل الكود المقترح"}
              </p>
            </div>

            {/* وحدة القياس - إلزامية */}
            <div className="space-y-2">
              <Label htmlFor="unit">وحدة القياس *</Label>
              <Input
                id="unit"
                placeholder="مثال: كيلو، قطعة"
                value={values.unit}
                onChange={setField("unit")}
                required
              />
            </div>

            {/* اسم الصنف - إلزامي */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">اسم الصنف *</Label>
              <Input
                id="name"
                placeholder="اسم الصنف"
                value={values.name}
                onChange={setField("name")}
                required
              />
            </div>

            {/* التصنيف - اختياري */}
            <div className="col-span-2 space-y-2">
              <Label>التصنيف (اختياري)</Label>
              <Select
                value={values.categoryId}
                onValueChange={(v) =>
                  setValues((prev) => ({ ...prev, categoryId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر تصنيفاً" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون تصنيف</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* سعر الشراء - إلزامي */}
            <div className="space-y-2">
              <Label htmlFor="buyPrice">سعر الشراء (ج.م) *</Label>
              <Input
                id="buyPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={values.buyPrice}
                onChange={handleBuyPriceChange}
                dir="ltr"
                required
              />
            </div>

            {/* الخصم/الربح (نسبة مئوية) - اختياري */}
            <div className="space-y-2">
              <Label htmlFor="discountPercent">الربح/الخصم (%)</Label>
              <Input
                id="discountPercent"
                type="number"
                step="0.1"
                placeholder="مثال: 50% ربح، -10% خسارة"
                value={values.discountPercent}
                onChange={handleDiscountChange}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                النسبة = (سعر البيع - سعر الشراء) / سعر البيع * 100
              </p>
            </div>

            {/* سعر البيع - إلزامي */}
            <div className="space-y-2">
              <Label htmlFor="sellPrice">سعر البيع (ج.م) *</Label>
              <Input
                id="sellPrice"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={values.sellPrice}
                onChange={handleSellPriceChange}
                dir="ltr"
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {submitting ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}