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
import { toast } from "sonner";
import { PRODUCT_UNITS } from "@/constants/units";
import { ImageUploader } from "@/components/shared/ImageUploader";

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
  imageUrl: string;
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
    imageUrl?: string;
  }) => Promise<void>;
  initialValues?: Partial<ProductFormValues> & { id?: number };
  title: string;
  /** أكواد الأصناف الموجودة لتوليد الكود التالي محلياً بدون DB call */
  existingCodes?: string[];
}

const defaultValues: ProductFormValues = {
  code: "",
  name: "",
  unit: "",
  buyPrice: "",
  sellPrice: "",
  categoryId: "",
  discountPercent: "",
  imageUrl: "",
};

export function ProductForm({
  open,
  onClose,
  onSubmit,
  initialValues,
  title,
  existingCodes = [],
}: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(defaultValues);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [updatingFromDiscount, setUpdatingFromDiscount] = useState(false);
  const [updatingFromBuyPrice, setUpdatingFromBuyPrice] = useState(false);
  const [updatingFromSellPrice, setUpdatingFromSellPrice] = useState(false);

  // جلب التصنيفات مرة واحدة عند التحميل
  useEffect(() => {
    getCategories().then((cats) => setCategories(cats));
  }, []);

  // ✅ تهيئة النموذج وتوليد الكود في useEffect واحد لتجنب التعارض بين الـ effects
  useEffect(() => {
    if (!open) return;

    // توليد كود تلقائي للصنف الجديد من الأكواد الموجودة
    let autoCode = initialValues?.code ?? "";
    if (!initialValues?.id && !autoCode) {
      const prdCodes = (existingCodes ?? [])
        .filter((c) => c.startsWith("PRD-"))
        .map((c) => parseInt(c.replace("PRD-", ""), 10))
        .filter((n) => !isNaN(n));
      const nextNum = prdCodes.length > 0 ? Math.max(...prdCodes) + 1 : 1;
      autoCode = `PRD-${String(nextNum).padStart(3, "0")}`;
    }

    setValues({
      ...defaultValues,
      ...initialValues,
      code: autoCode,                          // ✅ الكود المُولَّد أو المحدَّد مسبقاً
      buyPrice: initialValues?.buyPrice ?? "",
      sellPrice: initialValues?.sellPrice ?? "",
      categoryId: initialValues?.categoryId ?? "",
      discountPercent: "",                     // يُحسب تلقائياً بواسطة useEffect الخاص به
      imageUrl: initialValues?.imageUrl ?? "",
    });
  }, [open, initialValues, existingCodes]);

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
        categoryId: values.categoryId === "none" ? undefined : parseInt(values.categoryId, 10),
        imageUrl: values.imageUrl.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };




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
                placeholder="مثال: PRD-001"
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
              <Select
                value={values.unit}
                onValueChange={(v) =>
                  setValues((prev) => ({ ...prev, unit: v }))
                }
              >
                <SelectTrigger id="unit" className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold focus:ring-blue-500">
                  <SelectValue placeholder="اختر وحدة القياس" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {PRODUCT_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {/* صورة المنتج */}
            <div className="col-span-2 mt-2">
              <ImageUploader
                label="صورة المنتج"
                value={values.imageUrl}
                onChange={(base64: string) => setValues((prev) => ({ ...prev, imageUrl: base64 }))}
                hint="اختر صورة واضحة للمنتج (يفضل أن تكون مربعة)"
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