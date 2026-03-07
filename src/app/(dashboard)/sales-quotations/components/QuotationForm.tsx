// components/QuotationForm.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Save, Calculator, Hash, Printer,
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
import { PrintableInvoice } from "@/components/invoices/printable-invoice";
import type { ProductData } from "@/app/(dashboard)/inventory/products/actions";
import {
  getNextQuotationCode,
  getQuotationById,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
} from "../actions";
import { getCompanySettingsAction } from "@/app/(dashboard)/settings/actions";

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
  const [guestCustomerName, setGuestCustomerName] = useState<string>("");
  const [quotationDate, setQuotationDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [items, setItems] = useState<QuotationItemRow[]>([]);
  const [topNotes, setTopNotes] = useState<string[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>("Draft");
  const [companySettings, setCompanySettings] = useState<any>(null);

  // تحميل رقم العرض التالي وإعدادات الشركة
  useEffect(() => {
    getCompanySettingsAction().then(setCompanySettings);
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
            setGuestCustomerName(quotation.customerName || "");

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
                price: item.unitPrice,
                taxRate: item.taxRate || 0,
                discount: item.discount || 0,
                total: item.total,
                productId: item.productId || null,
              }));
              setItems(formattedItems);
            }

            setTopNotes((quotation as any).topNotes || []);
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
        taxRate: product.taxRate || 0,
        discount: 0,
        total: product.sellPrice * (1 + (product.taxRate || 0) / 100),
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
        if (field === "quantity" || field === "price" || field === "discount" || field === "taxRate") {
          finalValue = Math.max(0, Number(value));
        }
        const updated = { ...item, [field]: finalValue };

        // حساب الإجمالي: (qty × price × (1 - discount/100)) * (1 + tax/100)
        const basePrice = Number(updated.quantity) * Number(updated.price);
        const discountAmount = basePrice * (Number(updated.discount || 0) / 100);
        const priceAfterDiscount = basePrice - discountAmount;
        updated.total = priceAfterDiscount + (priceAfterDiscount * (Number(updated.taxRate || 0) / 100));
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

  const totalTax = useMemo(
    () =>
      items.reduce(
        (sum, i) => {
          const itemBase = Number(i.quantity) * Number(i.price);
          const discountAmount = itemBase * (Number(i.discount || 0) / 100);
          const itemAfterDiscount = itemBase - discountAmount;
          return sum + itemAfterDiscount * (Number(i.taxRate || 0) / 100);
        },
        0
      ),
    [items]
  );

  const subtotalAfterItemDiscounts = subtotal - itemsDiscountTotal;
  const grandTotal = subtotalAfterItemDiscounts - globalDiscount + totalTax;

  // ─── تغيير الحالة ───
  const handleStatusChange = async (newStatus: string) => {
    if (!quotationId) return;
    try {
      await updateQuotationStatus(
        Number(quotationId),
        newStatus as "Draft" | "Sent" | "Approved" | "Rejected"
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
    if (items.length === 0) {
      toast.error("لا يمكن حفظ عرض سعر فارغ");
      return;
    }

    try {
      setSaving(true);
      const quotationData = {
        customerId: customer?.id || null,
        customerName: guestCustomerName || null,
        date: quotationDate,
        subtotal: subtotalAfterItemDiscounts,
        totalTax,
        discount: globalDiscount,
        total: grandTotal,
        topNotes,
        notes,
        items: items.map(({ description, quantity, price, taxRate, discount, total, productId }) => {
          if (!productId) throw new Error("يجب اختيار منتج لكل صنف");
          return { productId, description, quantity, unitPrice: price, taxRate, discount, total };
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

  const canSave = !saving && !loading && !isViewMode;

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
              {isViewMode ? "عرض سعر" : isEditMode ? "تعديل عرض سعر" : "إنشاء عرض سعر جديد"}
            </h2>
            <p className="text-muted-foreground font-medium">
              نظام إدارة عروض أسعار مصنع الطوب
            </p>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {(isEditMode || isViewMode || quotationId) && (
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrint}
              className="gap-2 shadow-sm border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-primary"
            >
              <Printer className="h-5 w-5" />
              طباعة العرض
            </Button>
          )}
        </div>
      </div>

      {/* ─── النموذج ─── */}
      <div className="print:hidden">
        <div className="mb-6">
          <DynamicNotes
            notes={topNotes}
            onChange={setTopNotes}
            disabled={isViewMode}
          />
        </div>
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
                  <div className="w-full max-w-sm space-y-4">
                    <CustomerSelect
                      onSelect={(c) => {
                        setCustomer(c as Customer);
                        if (c) setGuestCustomerName("");
                      }}
                      selectedId={customer?.id}
                      error={""}
                    />
                    {!customer && (
                      <div className="space-y-1.5">
                        <Label className="text-slate-600 text-sm font-bold">اسم العميل (اختياري)</Label>
                        <Input
                          placeholder="أدخل اسم العميل إذا لم يكن مسجلاً"
                          value={guestCustomerName}
                          onChange={(e) => setGuestCustomerName(e.target.value)}
                          disabled={isViewMode}
                          className="bg-slate-50 border-slate-200"
                        />
                      </div>
                    )}
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
                  disabled={false}
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
                {totalTax > 0 && (
                  <div className="flex justify-between text-slate-400 text-sm">
                    <span>إجمالي الضرائب:</span>
                    <span className="text-orange-400 font-mono">
                      +{totalTax.toLocaleString("ar-EG")} ج.م
                    </span>
                  </div>
                )}
                
                {/* Global discount */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-slate-400 text-sm mb-1">
                    <span>خصم إضافي:</span>
                    <span className="text-red-400 font-mono">
                      -{globalDiscount.toLocaleString("ar-EG")} ج.م
                    </span>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={globalDiscount || ""}
                    onChange={(e) => setGlobalDiscount(Math.max(0, Number(e.target.value)))}
                    disabled={isViewMode}
                    className="bg-white/5 border-white/10 h-8 text-center font-bold"
                    placeholder="قيمة الخصم..."
                  />
                </div>

                <Separator className="bg-white/10" />
                <div className="pt-2">
                  <p className="text-xs text-slate-400 mb-1">صافي عرض السعر:</p>
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

      {/* ─── نسخة الطباعة (موحدة مع الفواتير) ─── */}
      <PrintableInvoice
        invoiceNumber={quotationCode}
        date={quotationDate}
        partnerName={customer?.name || guestCustomerName || "عميل عام"}
        partnerLabel={customer ? `كود العميل: ${customer.code || "---"}` : "عرض سعر لعميل غير مسجل"}
        title="عرض سعر"
        items={items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.total,
        }))}
        subtotal={subtotal}
        discount={globalDiscount + itemsDiscountTotal}
        tax={totalTax}
        total={grandTotal}
        topNotes={topNotes}
        notes={notes}
        companyName={companySettings?.companyName}
        companyNameEn={companySettings?.companyNameEn}
        companyLogo={companySettings?.companyLogo}
        companyStamp={companySettings?.companyStamp}
        showLogo={companySettings?.showLogoOnPrint}
        showStamp={companySettings?.showStampOnPrint}
        isQuotation={true}
      />
    </div>
  );
}
