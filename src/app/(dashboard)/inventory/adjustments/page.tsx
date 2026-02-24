// app/(dashboard)/inventory/adjustments/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Settings, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { getProducts, type ProductData } from "../products/actions";
import { createAdjustment, getCurrentStock } from "./actions";

export default function AdjustmentsPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [newQty, setNewQty] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .finally(() => setLoadingProducts(false));
  }, []);

  const handleProductChange = async (value: string) => {
    setSelectedProductId(value);
    setCurrentStock(null);
    setNewQty("");
    if (!value || value === "none") return;

    setLoadingStock(true);
    try {
      const stock = await getCurrentStock(parseInt(value));
      setCurrentStock(stock);
      setNewQty(String(stock));
    } catch {
      toast.error("فشل جلب المخزون الحالي");
    } finally {
      setLoadingStock(false);
    }
  };

  const selectedProduct = products.find((p) => String(p.id) === selectedProductId);
  const diff = currentStock !== null && newQty !== "" ? parseFloat(newQty) - currentStock : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) { toast.error("يرجى اختيار صنف"); return; }
    if (newQty === "") { toast.error("يرجى إدخال الكمية الجديدة"); return; }

    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty < 0) { toast.error("الكمية يجب أن تكون 0 أو أكثر"); return; }
    if (diff === 0) { toast.error("الكمية الجديدة مساوية للكمية الحالية — لا تغيير"); return; }

    setSubmitting(true);
    try {
      const result = await createAdjustment({
        productId: parseInt(selectedProductId),
        newQty: qty,
        notes: notes || undefined,
      });

      const diffLabel = result.diff > 0 ? `+${result.diff}` : String(result.diff);
      toast.success(`تمت التسوية بنجاح — الفرق: ${diffLabel}`);

      // Reset form
      setSelectedProductId("");
      setCurrentStock(null);
      setNewQty("");
      setNotes("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء التسوية");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar title="تسويات المخزون" />
      <div className="flex-1 space-y-6 p-6" dir="rtl">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
            تسويات المخزون
          </h2>
          <p className="text-muted-foreground font-medium">
            تعديل كميات المخزون يدوياً عند وجود فروق
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5 text-primary" />
                  إجراء تسوية جديدة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Product selector */}
                  <div className="space-y-2">
                    <Label>الصنف *</Label>
                    {loadingProducts ? (
                      <div className="h-10 bg-muted animate-pulse rounded-md" />
                    ) : (
                      <Select value={selectedProductId} onValueChange={handleProductChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر صنفاً من قائمة الأصناف" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.code} — {p.name}
                              {p.unit ? ` (${p.unit})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Current stock display */}
                  {selectedProductId && (
                    <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-lg border">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground font-medium">المخزون الحالي</p>
                        {loadingStock ? (
                          <div className="h-7 w-20 bg-muted animate-pulse rounded mt-1" />
                        ) : (
                          <p className="text-2xl font-bold text-primary">
                            {currentStock?.toLocaleString("ar-EG") ?? "—"}
                            {selectedProduct?.unit ? (
                              <span className="text-sm text-muted-foreground font-normal mr-1">
                                {selectedProduct.unit}
                              </span>
                            ) : null}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleProductChange(selectedProductId)}
                        disabled={loadingStock}
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingStock ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  )}

                  {/* New quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="new-qty">الكمية الجديدة (المستهدفة) *</Label>
                    <Input
                      id="new-qty"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="أدخل الكمية الصحيحة الموجودة فعلاً"
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value)}
                      disabled={!selectedProductId || loadingStock}
                      dir="ltr"
                    />
                  </div>

                  {/* Diff preview */}
                  {diff !== null && diff !== 0 && (
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        diff > 0
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      {diff > 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                      )}
                      <p className={`font-bold text-sm ${diff > 0 ? "text-green-700" : "text-red-700"}`}>
                        سيتم إنشاء حركة تسوية بمقدار{" "}
                        <span className="text-base">
                          {diff > 0 ? "+" : ""}
                          {diff.toLocaleString("ar-EG")}
                        </span>{" "}
                        {selectedProduct?.unit ?? ""}
                      </p>
                    </div>
                  )}

                  {diff === 0 && newQty !== "" && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
                      <CheckCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        الكمية المُدخلة مساوية للكمية الحالية — لا يوجد فرق.
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                    <Textarea
                      id="notes"
                      placeholder="سبب التسوية، مثلاً: جرد فعلي، تلف، فقد..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting || !selectedProductId || loadingStock || diff === 0}
                    className="w-full gap-2 font-bold"
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        جاري حفظ التسوية...
                      </>
                    ) : (
                      <>
                        <Settings className="h-4 w-4" />
                        تطبيق التسوية
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Info panel */}
          <div className="space-y-4">
            <Card className="shadow-sm bg-blue-50/50 border-blue-200">
              <CardContent className="p-5 space-y-3">
                <h4 className="font-bold text-blue-800">كيف تعمل التسوية؟</h4>
                <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>اختر الصنف المراد تسويته</li>
                  <li>سيظهر المخزون الحالي المحسوب</li>
                  <li>أدخل الكمية الفعلية الصحيحة</li>
                  <li>سيتم حساب الفرق تلقائياً</li>
                  <li>اضغط «تطبيق التسوية» لحفظ حركة التسوية</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-amber-50/50 border-amber-200">
              <CardContent className="p-5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-amber-800 mb-1">تنبيه</h4>
                    <p className="text-sm text-amber-700 leading-relaxed">
                      التسوية تنشئ حركة مخزون بالفرق فقط، ولا تمسح أي سجلات سابقة.
                      جميع الحركات محفوظة في السجل.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
