// components/QuotationForm.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Save, Calculator, Hash, Printer, FileOutput,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CustomerSelect } from "@/components/shared/CustomerSelect";
import { DynamicNotes } from "@/components/shared/DynamicNotes";
import { QuotationTable, type QuotationItemRow } from "./QuotationTable";
import { QuotationPrint } from "./QuotationPrint";
import type { ProductData } from "@/app/(dashboard)/inventory/products/actions";
import {
  getNextQuotationCode,
  getQuotationById,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
} from "../actions";

interface Customer {
  id: number;
  name: string;
  code?: number;
  phone?: string;
  address?: string;
}

interface QuotationFormProps {
  quotationId?: string | null;
  readOnly?: boolean;
  onBack: () => void;
}

const statusOptions = [
  { value: "Draft", label: "مسودة" },
  { value: "Sent", label: "مُرسل" },
  { value: "Approved", label: "مقبول" },
  { value: "Rejected", label: "مرفوض" },
];

export function QuotationForm({ quotationId, readOnly, onBack }: QuotationFormProps) {
  const router = useRouter();
  const isEditMode = !!quotationId && !readOnly;
  const isViewMode = !!readOnly;

  const [quotationCode, setQuotationCode] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!quotationId);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [quotationDate, setQuotationDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [items, setItems] = useState<QuotationItemRow[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>("Draft");

  // تحميل رقم العرض التالي (للإنشاء فقط)
  useEffect(() => {
    if (!quotationId) {
      getNextQuotationCode().then(setQuotationCode);
    }
  }, [quotationId]);

  // تحميل بيانات العرض (للتعديل والعرض)
  useEffect(() => {
    if (quotationId) {
      setLoading(true);
      getQuotationById(Number(quotationId))
        .then((quotation) => {
          if (quotation) {
            setQuotationCode(quotation.code);
            setQuotationDate(new Date(quotation.date).toISOString().split("T")[0]);
            setGlobalDiscount(quotation.discount || 0);
            setCurrentStatus(quotation.status);

            if (quotation.customer) {
              setCustomer({
                id: quotation.customer.id,
                name: quotation.customer.name,
                code: quotation.customer.code,
                phone: quotation.customer.phone || undefined,
                address: quotation.customer.address || undefined,
              });
            }

            if (quotation.items && quotation.items.length > 0) {
              const formattedItems = quotation.items.map((item: any, index: number) => ({
                id: String(item.id || index + 1),
                description: item.description,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount || 0,
                total: item.total,
                productId: item.productId || null,
              }));
              setItems(formattedItems);
            }

            setNotes((quotation as any).notes || []);
          }
        })
        .catch((error) => {
          console.error("Error loading quotation:", error);
          toast.error("حدث خطأ أثناء تحميل بيانات العرض");
        })
        .finally(() => setLoading(false));
    }
  }, [quotationId]);

  // ─── إضافة/حذف/تحديث الأصناف ───
  const addItem = (product: ProductData) => {
    if (isViewMode) return;
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: product.name,
        quantity: 1,
        price: product.sellPrice,
        discount: 0,
        total: product.sellPrice,
        productId: product.id,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (isViewMode) return;
    if (items.length > 1) setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof QuotationItemRow,
    value: string | number | null
  ) => {
    if (isViewMode) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        let finalValue = value;
        if (field === "quantity" || field === "price" || field === "discount") {
          finalValue = Math.max(0, Number(value));
        }
        const updated = { ...item, [field]: finalValue };

        // حساب الإجمالي: qty × price × (1 - discount/100)
        const basePrice = Number(updated.quantity) * Number(updated.price);
        const discountAmount = basePrice * (Number(updated.discount || 0) / 100);
        updated.total = basePrice - discountAmount;
        return updated;
      })
    );
  };

  // ─── حساب الإجماليات (نفس منطق الفواتير) ───
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.price), 0),
    [items]
  );

  const itemsDiscountTotal = useMemo(
    () =>
      items.reduce(
        (sum, i) =>
          sum + Number(i.quantity) * Number(i.price) * (Number(i.discount || 0) / 100),
        0
      ),
    [items]
  );

  const subtotalAfterItemDiscounts = subtotal - itemsDiscountTotal;
  const globalDiscountAmount = subtotalAfterItemDiscounts * (globalDiscount / 100);
  const grandTotal = subtotalAfterItemDiscounts - globalDiscountAmount;

  // ─── تغيير الحالة ───
  const handleStatusChange = async (newStatus: string) => {
    if (!quotationId) return;
    try {
      await updateQuotationStatus(
        Number(quotationId),
        newStatus as "Draft" | "Sent" | "Approved" | "Rejected" | "Converted"
      );
      setCurrentStatus(newStatus);
      toast.success("تم تحديث الحالة بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث الحالة");
    }
  };

  // ─── حفظ العرض ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    if (!customer) {
      toast.error("يرجى اختيار العميل أولاً");
      return;
    }
    if (items.length === 0) {
      toast.error("لا يمكن حفظ عرض سعر فارغ");
      return;
    }

    try {
      setSaving(true);
      const quotationData = {
        customerId: customer.id,
        date: quotationDate,
        subtotal: subtotalAfterItemDiscounts,
        discount: globalDiscountAmount,
        total: grandTotal,
        notes,
        items: items.map(({ description, quantity, price, discount, total, productId }) => {
          if (!productId) throw new Error("يجب اختيار منتج لكل صنف");
          return { productId, description, quantity, price, discount, total };
        }),
      };

      if (isEditMode && quotationId) {
        await updateQuotation(Number(quotationId), quotationData);
        toast.success(`تم تحديث عرض السعر ${quotationCode} بنجاح`);
      } else {
        await createQuotation(quotationData);
        toast.success(`تم حفظ عرض السعر بنجاح`);
      }
      router.push("/sales-quotations");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  const canSave = !saving && !loading && !isViewMode && !!customer;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50/50 min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">جاري تحميل بيانات العرض...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen" dir="rtl">
      {/* ─── العنوان والأزرار ─── */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-full shadow-sm">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              {isViewMode ? "عرض سعر" : isEditMode ? "تعديل عرض سعر" : "إنشاء عرض سعر"}
            </h2>
            <p className="text-muted-foreground font-medium">
              {quotationCode && <span className="text-primary font-bold">{quotationCode}</span>}
            </p>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {(isEditMode || isViewMode) && (
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrint}
              className="gap-2 shadow-sm border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-primary"
            >
              <Printer className="h-5 w-5" />
              طباعة / تحميل PDF
            </Button>
          )}
          {isViewMode && currentStatus !== "Converted" && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push(`/sales-invoices/create?fromQuotation=${quotationId}`)}
              className="gap-2 shadow-sm border-green-200 hover:bg-green-50 hover:border-green-400 text-green-600"
            >
              <FileOutput className="h-5 w-5" />
              تحويل إلى فاتورة بيع
            </Button>
          )}
          {isViewMode && currentStatus === "Converted" && (
            <Button variant="outline" size="lg" disabled className="gap-2 opacity-50 cursor-not-allowed">
              <FileOutput className="h-5 w-5" />
              تم التحويل مسبقاً
            </Button>
          )}
        </div>
      </div>

      {/* ─── النموذج ─── */}
      <div className="print:hidden">
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-6">
            {/* بيانات العميل */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="w-2 h-6 bg-primary rounded-full" /> بيانات العميل والعرض
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white pt-5 pb-5">
                <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                  <div className="w-full max-w-sm">
                    <CustomerSelect
                      onSelect={(c) => setCustomer(c as Customer)}
                      selectedId={customer?.id}
                      error={!customer ? "يرجى اختيار العميل" : ""}
                    />
                  </div>

                  <div className="flex items-end gap-4 flex-wrap">
                    {/* Read-only code */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-sm font-bold flex items-center gap-1">
                        <Hash className="h-3 w-3" /> رقم العرض
                      </Label>
                      <Input
                        type="text"
                        value={quotationCode}
                        disabled
                        className="w-36 bg-slate-100 border-slate-200 text-center font-bold text-lg cursor-not-allowed"
                      />
                    </div>

                    {/* Date */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-sm font-bold">تاريخ العرض</Label>
                      <Input
                        type="date"
                        value={quotationDate}
                        onChange={(e) => setQuotationDate(e.target.value)}
                        disabled={isViewMode}
                        className="bg-slate-50 border-slate-200 w-44"
                        required={!isViewMode}
                      />
                    </div>

                    {/* Status (only in edit/view mode) */}
                    {quotationId && (
                      <div className="space-y-1.5">
                        <Label className="text-slate-600 text-sm font-bold">الحالة</Label>
                        <Select
                          value={currentStatus}
                          onValueChange={handleStatusChange}
                          disabled={currentStatus === "Converted"}
                        >
                          <SelectTrigger className="w-36 bg-slate-50 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* جدول الأصناف */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="w-2 h-6 bg-orange-500 rounded-full" /> تفاصيل الأصناف
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 bg-white">
                <QuotationTable
                  items={items}
                  onAddItem={addItem}
                  onRemoveItem={removeItem}
                  onUpdateItem={updateItem}
                  disabled={!customer}
                  readOnly={isViewMode}
                />
              </CardContent>
            </Card>

            {/* الملاحظات */}
            <DynamicNotes notes={notes} onChange={setNotes} disabled={isViewMode} />
          </div>

          {/* ─── ملخص العرض ─── */}
          <div className="space-y-6">
            <Card className="border-none shadow-xl bg-slate-900 text-white p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 border-b border-white/10 pb-4">
                <Calculator className="h-5 w-5 text-orange-400" /> ملخص العرض
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>رقم العرض:</span>
                  <span className="text-white font-mono font-bold">{quotationCode}</span>
                </div>
                <Separator className="bg-white/10" />
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>الإجمالي:</span>
                  <span className="text-white font-mono">
                    {subtotal.toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
                {itemsDiscountTotal > 0 && (
                  <div className="flex justify-between text-slate-400 text-sm">
                    <span>خصم الأصناف:</span>
                    <span className="text-red-400 font-mono">
                      -{itemsDiscountTotal.toLocaleString("ar-EG")} ج.م
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>الإجمالي بعد خصم الأصناف:</span>
                  <span className="text-white font-mono">
                    {subtotalAfterItemDiscounts.toLocaleString("ar-EG")} ج.م
                  </span>
                </div>

                {/* Global discount */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-slate-400 text-sm mb-1">
                    <span>خصم إضافي (%):</span>
                    <span className="text-red-400 font-mono">
                      -{globalDiscountAmount.toLocaleString("ar-EG")} ج.م
                    </span>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={globalDiscount || ""}
                    onChange={(e) => setGlobalDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                    disabled={isViewMode}
                    className="bg-white/5 border-white/10 h-8 text-center font-bold"
                    placeholder="نسبة الخصم %"
                  />
                </div>

                <Separator className="bg-white/10" />
                <div className="pt-2">
                  <p className="text-xs text-slate-400 mb-1">الصافي النهائي:</p>
                  <p className="text-3xl font-black text-green-400">
                    {grandTotal.toLocaleString("ar-EG")} ج.م
                  </p>
                </div>
              </div>

              {!isViewMode && (
                <Button
                  type="submit"
                  disabled={!canSave}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 h-14 text-lg font-bold gap-2 mt-4 transition-transform active:scale-95 shadow-lg"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" /> {isEditMode ? "تحديث العرض" : "حفظ العرض"}
                    </>
                  )}
                </Button>
              )}
            </Card>
          </div>
        </form>
      </div>

      {/* ─── نسخة الطباعة ─── */}
      <QuotationPrint
        code={quotationCode}
        date={quotationDate}
        customerName={customer?.name || ""}
        customerCode={customer?.code}
        customerPhone={customer?.phone}
        customerAddress={customer?.address}
        items={items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          total: item.total,
        }))}
        subtotal={subtotalAfterItemDiscounts}
        discount={globalDiscountAmount}
        total={grandTotal}
        notes={notes}
      />
    </div>
  );
}
