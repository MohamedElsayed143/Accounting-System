// app/(dashboard)/sales-invoices/create/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Plus, Trash2, Save, Calculator,
  Search, User, ChevronLeft, CreditCard, Hash, Printer,
  History as HistoryIcon
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ProductSelect } from "@/components/shared/ProductSelect";
import { DynamicNotes } from "@/components/shared/DynamicNotes";
import { CustomerSelect } from "@/components/shared/CustomerSelect";
import { PrintableInvoice } from "@/components/invoices/printable-invoice";

import { getCustomers } from "@/app/(dashboard)/customers/actions";
import {
  getNextInvoiceNumber,
  checkInvoiceNumberExists,
  createSalesInvoice,
  getSalesInvoiceWithReturns,
  updateSalesInvoice,
} from "../actions";

// ─── الأنواع ──────────────────────────────────────────────────────────────────
interface Customer {
  id: number;
  name: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  profitMargin: number;
  taxRate: number;
  discount: number;
  total: number;
  productId?: number | null;
}

import { getProducts, ProductData } from "@/app/(dashboard)/inventory/products/actions";

// ============================================================
// Step 1 — البحث الفوري عن العميل
// ============================================================

// ============================================================
// Step 2 — نموذج إنشاء/تعديل/عرض الفاتورة
// ============================================================
function InvoiceFormStep({
  customer: initialCustomer,
  onBack,
  invoiceId,
  readOnly,
}: {
  customer: Customer | null;
  onBack: () => void;
  invoiceId?: string | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const isEditMode = !!invoiceId && invoiceId !== "create" && !readOnly;
  const isViewMode = !!readOnly;

  const [invoiceNumber, setInvoiceNumber] = useState<number>(1);
  const [invoiceNumberError, setInvoiceNumberError] = useState<string>("");
  const [checkingNumber, setCheckingNumber] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode || isViewMode);

  const [customer, setCustomer] = useState<Customer | null>(initialCustomer);
  const [paymentType, setPaymentType] = useState<"cash" | "credit" | "pending">("cash");
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [topNotes, setTopNotes] = useState<string[]>([]);
  const [discount, setDiscount] = useState<number>(0); // Global discount
  const [notes, setNotes] = useState<string[]>([]);

  // قائمة جميع المنتجات
  const [products, setProducts] = useState<ProductData[]>([]);

  // تحميل المنتجات
  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const [returnsTotal, setReturnsTotal] = useState<number>(0);
  const [returnsCount, setReturnsCount] = useState<number>(0);

  useEffect(() => {
    if ((isEditMode || isViewMode) && invoiceId) {
      setLoading(true);
      getSalesInvoiceWithReturns(Number(invoiceId))
        .then((invoice) => {
          if (invoice) {
            setInvoiceNumber(invoice.invoiceNumber);
            setPaymentType(invoice.status as "cash" | "credit" | "pending");
            setInvoiceDate(new Date(invoice.invoiceDate).toISOString().split("T")[0]);
            setDiscount(invoice.discount || 0);
            
            if (invoice.customer) {
              setCustomer({
                id: invoice.customer.id,
                name: invoice.customer.name,
              });
            }

            const totalReturns = invoice.salesReturns?.reduce((sum, ret) => sum + ret.total, 0) || 0;
            setReturnsTotal(totalReturns);
            setReturnsCount(invoice.salesReturns?.length || 0);

            if (invoice.items && invoice.items.length > 0) {
              const formattedItems = invoice.items.map((item: any, index: number) => ({
                id: String(item.id || index + 1),
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                profitMargin: item.profitMargin || 0,
                taxRate: item.taxRate,
                discount: item.discount || 0,
                total: item.total,
                productId: item.productId || null,
              }));
                setItems(formattedItems);
              setTopNotes((invoice as any).topNotes || []);
              setNotes((invoice as any).notes || []);
            }
          }
        })
        .catch((error) => {
          console.error("Error loading invoice:", error);
          toast.error("حدث خطأ أثناء تحميل بيانات الفاتورة");
        })
        .finally(() => setLoading(false));
    }
  }, [isEditMode, isViewMode, invoiceId]);

  useEffect(() => {
    if (!isEditMode && !isViewMode) {
      getNextInvoiceNumber().then(setInvoiceNumber);
    }
  }, [isEditMode, isViewMode]);

  useEffect(() => {
    if (isViewMode) return;
    if (!invoiceNumber || invoiceNumber < 1) return;

    setCheckingNumber(true);
    const timer = setTimeout(async () => {
      const taken = await checkInvoiceNumberExists(invoiceNumber);
      if (isEditMode && taken) {
        const invoice = await getSalesInvoiceWithReturns(Number(invoiceId));
        if (invoice && invoice.invoiceNumber === invoiceNumber) {
          setInvoiceNumberError("");
        } else {
          setInvoiceNumberError(
            taken ? `رقم الفاتورة #${invoiceNumber} مستخدم مسبقاً، يرجى اختيار رقم آخر` : ""
          );
        }
      } else {
        setInvoiceNumberError(
          taken ? `رقم الفاتورة #${invoiceNumber} مستخدم مسبقاً، يرجى اختيار رقم آخر` : ""
        );
      }
      setCheckingNumber(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [invoiceNumber, isEditMode, invoiceId, isViewMode]);

  const addItem = (product: ProductData) => {
    if (isViewMode) return;
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: product.name,
        quantity: 1,
        unitPrice: product.sellPrice,
        profitMargin: product.profitMargin || 0,
        taxRate: 0,
        discount: 0,
        total: product.sellPrice * 1.14,
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
    field: keyof InvoiceItem,
    value: string | number | null
  ) => {
    if (isViewMode) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        let finalValue = value;

        if (field === "quantity" || field === "unitPrice" || field === "taxRate" || field === "discount") {
          finalValue = Math.max(0, Number(value));
        }

        const updated = { ...item, [field]: finalValue };

        const basePrice = Number(updated.quantity) * Number(updated.unitPrice);
        // Discount as percentage
        const discountAmount = basePrice * (Number(updated.discount || 0) / 100);
        const priceAfterDiscount = basePrice - discountAmount;
        updated.total = priceAfterDiscount + priceAfterDiscount * (Number(updated.taxRate) / 100);
        return updated;
      })
    );
  };

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitPrice), 0),
    [items]
  );
  const itemsDiscount = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unitPrice)) * (Number(i.discount || 0) / 100), 0),
    [items]
  );
  const totalTax = useMemo(
    () =>
      items.reduce(
        (sum, i) => {
          const itemBase = Number(i.quantity) * Number(i.unitPrice);
          const discountAmount = itemBase * (Number(i.discount || 0) / 100);
          const itemAfterDiscount = itemBase - discountAmount;
          return sum + itemAfterDiscount * (Number(i.taxRate) / 100);
        },
        0
      ),
    [items]
  );
  const grandTotal = subtotal - itemsDiscount - discount + totalTax;
  const netTotal = grandTotal - returnsTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    if (invoiceNumberError || checkingNumber) {
      toast.error("يرجى تصحيح رقم الفاتورة أولاً");
      return;
    }
    if (!customer) {
      toast.error("يرجى اختيار العميل أولاً");
      return;
    }
    if (grandTotal <= 0 && items.length > 0) {
      toast.error("إجمالي الفاتورة يجب أن يكون أكبر من صفر");
      return;
    }
    if (items.length === 0) {
      toast.error("لا يمكن حفظ فاتورة فارغة");
      return;
    }

    try {
      setSaving(true);
      const invoiceData = {
        invoiceNumber,
        customerId: customer.id,
        customerName: customer.name,
        invoiceDate,
        subtotal,
        totalTax,
        discount: itemsDiscount + discount,
        total: grandTotal,
        status: paymentType,
        topNotes,
        notes,
        items: items.map(({ description, quantity, unitPrice, taxRate, discount, total, productId }) => {
          if (!productId) throw new Error("يجب اختيار منتج لكل صنف");
          return {
            description,
            quantity,
            unitPrice,
            taxRate,
            discount,
            total,
            productId,
          };
        }),
      };

      if (isEditMode && invoiceId) {
        await updateSalesInvoice(Number(invoiceId), invoiceData);
        toast.success(`تم تحديث الفاتورة #${invoiceNumber} بنجاح`);
      } else {
        await createSalesInvoice(invoiceData);
        toast.success(`تم حفظ الفاتورة #${invoiceNumber} بنجاح`);
      }
      router.push("/sales-invoices");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const canSave = !invoiceNumberError && !checkingNumber && !saving && !loading && !isViewMode;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50/50 min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">جاري تحميل بيانات الفاتورة...</p>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen" dir="rtl">
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="rounded-full shadow-sm"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              {isViewMode ? "عرض فاتورة مبيعات" : isEditMode ? "تعديل فاتورة مبيعات" : "إنشاء فاتورة مبيعات"}
            </h2>
            <p className="text-muted-foreground font-medium">
              نظام إدارة مبيعات مصنع الطوب
            </p>
          </div>
        </div>

        {(isEditMode || isViewMode || invoiceId) && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrint}
              className="gap-2 shadow-sm border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-primary"
            >
              <Printer className="h-5 w-5" />
              طباعة الفاتورة
            </Button>
            {isViewMode && customer && (
              <Button
                variant="outline"
                size="lg"
                asChild
                className="gap-2 shadow-sm border-blue-200 hover:bg-blue-50 hover:border-blue-400 text-blue-600"
              >
                <Link href={`/reports?customerId=${customer.id}`}>
                  <HistoryIcon className="h-5 w-5" />
                  كشف حساب العميل
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

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
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="w-2 h-6 bg-primary rounded-full" /> بيانات العميل والطلب
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white pt-5 pb-5">
                <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                  <div className="w-full max-w-sm">
                    <CustomerSelect
                      onSelect={(c) => setCustomer(c)}
                      selectedId={customer?.id}
                      error={!customer ? "يرجى اختيار العميل" : ""}
                    />
                  </div>

                  <div className="flex items-end gap-4 flex-wrap">
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-sm font-bold flex items-center gap-1">
                        <Hash className="h-3 w-3" /> رقم الفاتورة
                      </Label>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          min={1}
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(Number(e.target.value))}
                          disabled={isViewMode}
                          className={`w-32 bg-slate-50 border-slate-200 text-center font-bold text-lg ${
                            invoiceNumberError
                              ? "border-red-400 bg-red-50 focus-visible:ring-red-400"
                              : ""
                          }`}
                          required={!isViewMode}
                        />
                        {checkingNumber && !isViewMode && (
                          <p className="text-xs text-slate-400 font-medium">جاري التحقق...</p>
                        )}
                        {invoiceNumberError && !checkingNumber && !isViewMode && (
                          <p className="text-xs text-red-500 font-medium max-w-[220px] leading-tight">
                            {invoiceNumberError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-sm font-bold flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> نوع الفاتورة
                      </Label>
                      <Select
                        value={paymentType}
                        onValueChange={(v) => setPaymentType(v as "cash" | "credit" | "pending")}
                        disabled={isViewMode}
                      >
                        <SelectTrigger className="w-36 bg-slate-50 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">نقدي</SelectItem>
                          <SelectItem value="credit">أجل</SelectItem>
                          <SelectItem value="pending">معلقة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-sm font-bold">
                        تاريخ الفاتورة
                      </Label>
                      <Input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        disabled={isViewMode}
                        className="bg-slate-50 border-slate-200 w-44"
                        required={!isViewMode}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-white border-b py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="w-2 h-6 bg-orange-500 rounded-full" /> تفاصيل الأصناف
                </CardTitle>
                {!isViewMode && (
                  <div className="w-72">
                    <ProductSelect onSelect={addItem} disabled={loading} onlyInStock={true} />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0 bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-right font-bold">الصنف</TableHead>
                      <TableHead className="text-right font-bold w-24">الكمية *</TableHead>
                      <TableHead className="text-right font-bold w-24">السعر *</TableHead>
                      <TableHead className="text-right font-bold w-24 text-green-600">الربح (%)</TableHead>
                      <TableHead className="text-right font-bold w-24">الخصم (%)</TableHead>
                      <TableHead className="text-right font-bold w-20">الضريبة %</TableHead>
                      <TableHead className="text-right font-bold w-32">الإجمالي</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-800">{item.description}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              PID: {item.productId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            value={item.quantity || ""}
                            onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                            disabled={isViewMode}
                            className="bg-slate-50 h-9 font-bold text-center"
                            required={!isViewMode}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            value={item.unitPrice || ""}
                            onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                            disabled={isViewMode}
                            className="bg-slate-50 h-9 font-bold text-center"
                            required={!isViewMode}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            value={item.profitMargin || 0}
                            disabled
                            className="bg-green-50/50 border-green-100 h-9 font-bold text-center text-green-700"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            value={item.discount || ""}
                            onChange={(e) => updateItem(item.id, "discount", e.target.value)}
                            disabled={isViewMode}
                            placeholder="%"
                            className="bg-red-50 border-red-100 h-9 font-bold text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            value={item.taxRate}
                            onChange={(e) => updateItem(item.id, "taxRate", e.target.value)}
                            disabled={isViewMode}
                            className="bg-orange-50 border-orange-200 h-9 font-bold text-center"
                          />
                        </TableCell>
                        <TableCell className="font-bold text-primary text-sm whitespace-nowrap">
                          {item.total.toLocaleString("ar-EG")} ج.م
                        </TableCell>
                        <TableCell>
                          {!isViewMode && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                              className="text-red-400 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <DynamicNotes notes={notes} onChange={setNotes} disabled={isViewMode} />
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-xl bg-slate-900 text-white p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 border-b border-white/10 pb-4">
                <Calculator className="h-5 w-5 text-orange-400" /> ملخص الفاتورة
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>رقم الفاتورة:</span>
                  <span className="text-white font-mono font-bold">
                    #{invoiceNumber}
                  </span>
                </div>
                <Separator className="bg-white/10" />
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>الإجمالي قبل الضريبة:</span>
                  <span className="text-white font-mono">
                    {subtotal.toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>إجمالي الضرائب:</span>
                  <span className="text-orange-400 font-mono">
                    +{totalTax.toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-slate-400 text-sm mb-1">
                    <span>خصم إضافي:</span>
                    <span className="text-red-400 font-mono">
                      -{discount.toLocaleString("ar-EG")} ج.م
                    </span>
                  </div>
                  <Input
                    type="number"
                    value={discount || ""}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    disabled={isViewMode}
                    className="bg-white/5 border-white/10 h-8 text-center font-bold"
                    placeholder="قيمة الخصم..."
                  />
                </div>

                {returnsCount > 0 && (
                  <>
                    <div className="flex justify-between text-slate-400 text-sm">
                      <span>إجمالي المرتجعات:</span>
                      <span className="text-red-400 font-mono">
                        -{returnsTotal.toLocaleString("ar-EG")} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-sm">
                      <span>عدد المرتجعات:</span>
                      <span className="text-white font-mono">
                        {returnsCount}
                      </span>
                    </div>
                  </>
                )}

                <Separator className="bg-white/10" />
                <div className="pt-2">
                  <p className="text-xs text-slate-400 mb-1">الصافي النهائي:</p>
                  <p className="text-3xl font-black text-green-400">
                    {netTotal.toLocaleString("ar-EG")} ج.م
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
                      <Save className="h-5 w-5" /> {isEditMode ? "تحديث الفاتورة" : "حفظ الفاتورة"}
                    </>
                  )}
                </Button>
              )}
            </Card>
          </div>
        </form>
      </div>

      {/* ========== نسخة الطباعة (مضمنة بالكامل) ========== */}
      <PrintableInvoice
        invoiceNumber={invoiceNumber}
        date={invoiceDate}
        partnerName={customer?.name || ""}
        partnerLabel="العميل"
        title="فاتورة مبيعات"
        items={items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        }))}
        subtotal={subtotal}
        tax={totalTax}
        total={returnsCount > 0 ? netTotal : grandTotal}
        topNotes={topNotes}
        notes={notes}
      />
    </div>
  );
}

// ============================================================
// الصفحة الرئيسية
// ============================================================
export default function CreateSalesInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("id");
  const mode = searchParams.get("mode");
  const isViewMode = !!invoiceId && invoiceId !== "create" && mode === "view";

  const [initialCustomer, setInitialCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(!!invoiceId && invoiceId !== "create");

  useEffect(() => {
    if (invoiceId && invoiceId !== "create") {
      setLoading(true);
      getSalesInvoiceWithReturns(Number(invoiceId))
        .then((invoice) => {
          if (invoice) {
            getCustomers().then((customers) => {
              const fullCustomer = (customers as Customer[]).find(c => c.id === invoice.customerId);
              if (fullCustomer) {
                setInitialCustomer(fullCustomer);
              } else {
                setInitialCustomer({
                  id: invoice.customerId,
                  name: invoice.customerName,
                });
              }
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [invoiceId]);

  if (loading) {
    return (
      <>
        <Navbar title="فاتورة مبيعات" />
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50/50 min-h-[calc(100vh-64px)]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">جاري تحميل بيانات الفاتورة...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar title={isViewMode ? "عرض فاتورة مبيعات" : (invoiceId && invoiceId !== "create" ? "تعديل فاتورة مبيعات" : "فاتورة مبيعات جديدة")} />
      <div className="min-h-screen bg-slate-50/50 pb-12">
        <InvoiceFormStep
          customer={initialCustomer}
          onBack={() => router.push("/sales-invoices")}
          invoiceId={invoiceId}
          readOnly={isViewMode}
        />
      </div>
    </>
  );
}

import { Loader2 } from "lucide-react";