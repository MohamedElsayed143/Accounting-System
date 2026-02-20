"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight, Plus, Trash2, Save, Calculator,
  Search, User, ChevronLeft, CreditCard, Hash, Printer,
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
  code: number;
  phone: string | null;
  address: string | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

// ============================================================
// Step 1 — البحث الفوري عن العميل
// ============================================================
function CustomerSearchStep({
  onCustomerSelected,
}: {
  onCustomerSelected: (customer: Customer) => void;
}) {
  const [query, setQuery] = useState("");
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomers()
      .then((data) => setAllCustomers(data as Customer[]))
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allCustomers.filter((c) => {
      const codeMatch = c.code.toString() === q;
      const phoneMatch = c.phone && c.phone === q;
      const nameMatch = c.name.toLowerCase().includes(q);
      return codeMatch || phoneMatch || nameMatch;
    });
  }, [query, allCustomers]);

  return (
    <div
      className="flex-1 flex items-center justify-center p-6 bg-slate-50/50 min-h-[calc(100vh-64px)]"
      dir="rtl"
    >
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">ابحث عن العميل أولاً</h2>
          <p className="text-muted-foreground">تظهر النتائج تلقائياً أثناء الكتابة</p>
        </div>

        <Card className="border-none shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">بحث فوري عن العميل</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="اكتب الكود، الموبايل، أو اسم العميل..."
                  value={query}
                  disabled={loading}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pr-10 bg-slate-50 h-12"
                  autoFocus
                />
              </div>
            </div>

            {query.trim() !== "" && (
              <div className="space-y-2 pt-2 max-h-64 overflow-y-auto">
                {results.length > 0 ? (
                  results.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => onCustomerSelected(customer)}
                      className="w-full text-right p-4 rounded-lg border border-slate-200 hover:border-primary hover:bg-primary/5 transition-all flex justify-between items-center group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 group-hover:text-primary">
                            {customer.name}
                          </span>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                            #{customer.code}
                          </span>
                        </div>
                      </div>
                      <ChevronLeft className="h-5 w-5 text-slate-300 group-hover:text-primary" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">لا يوجد نتائج مطابقة</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Step 2 — نموذج إنشاء/تعديل/عرض الفاتورة
// ============================================================
function InvoiceFormStep({
  customer,
  onBack,
  invoiceId,
  readOnly,
}: {
  customer: Customer;
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

  const [paymentType, setPaymentType] = useState<"cash" | "credit" | "pending">("cash");
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", description: "", quantity: 0, unitPrice: 0, taxRate: 0, total: 0 },
  ]);

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

            const totalReturns = invoice.salesReturns?.reduce((sum, ret) => sum + ret.total, 0) || 0;
            setReturnsTotal(totalReturns);
            setReturnsCount(invoice.salesReturns?.length || 0);

            if (invoice.items && invoice.items.length > 0) {
              const formattedItems = invoice.items.map((item: {
                description: string;
                quantity: number;
                unitPrice: number;
                taxRate: number;
                total: number;
              }, index: number) => ({
                id: String(index + 1),
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: item.taxRate,
                total: item.total,
              }));
              setItems(formattedItems);
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

  const addItem = () => {
    if (isViewMode) return;
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: "",
        quantity: 0,
        unitPrice: 0,
        taxRate: 0,
        total: 0,
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
    value: string | number
  ) => {
    if (isViewMode) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        let finalValue = value;
        if (field === "quantity" || field === "unitPrice" || field === "taxRate") {
          finalValue = Math.max(0, Number(value));
        }
        const updated = { ...item, [field]: finalValue };
        const basePrice = Number(updated.quantity) * Number(updated.unitPrice);
        updated.total = basePrice + basePrice * (Number(updated.taxRate) / 100);
        return updated;
      })
    );
  };

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitPrice), 0),
    [items]
  );
  const totalTax = useMemo(
    () =>
      items.reduce(
        (sum, i) =>
          sum + Number(i.quantity) * Number(i.unitPrice) * (Number(i.taxRate) / 100),
        0
      ),
    [items]
  );
  const grandTotal = subtotal + totalTax;
  const netTotal = grandTotal - returnsTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    if (invoiceNumberError || checkingNumber) {
      toast.error("يرجى تصحيح رقم الفاتورة أولاً");
      return;
    }
    if (grandTotal === 0) {
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
        total: grandTotal,
        status: paymentType,
        items: items.map(({ description, quantity, unitPrice, taxRate, total }) => ({
          description,
          quantity,
          unitPrice,
          taxRate,
          total,
        })),
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
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrint}
            className="gap-2 shadow-sm border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-primary"
          >
            <Printer className="h-5 w-5" />
            طباعة الفاتورة
          </Button>
        )}
      </div>

      <div className="print:hidden">
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
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-black text-lg text-slate-800">
                        {customer.name}
                      </span>
                      <div className="text-xs text-muted-foreground font-bold">
                        #{customer.code}
                      </div>
                    </div>
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
                  <Button
                    type="button"
                    onClick={addItem}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 gap-2"
                  >
                    <Plus className="h-4 w-4" /> إضافة صنف
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0 bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-right font-bold">الصنف *</TableHead>
                      <TableHead className="text-right font-bold w-24">الكمية *</TableHead>
                      <TableHead className="text-right font-bold w-28">السعر *</TableHead>
                      <TableHead className="text-right font-bold w-24">الضريبة %</TableHead>
                      <TableHead className="text-right font-bold w-32">الإجمالي</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            placeholder="وصف الصنف"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                            disabled={isViewMode}
                            className="bg-transparent border-none focus-visible:ring-1 shadow-none"
                            required={!isViewMode}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity || ""}
                            onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                            disabled={isViewMode}
                            className="bg-slate-50"
                            required={!isViewMode}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitPrice || ""}
                            onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                            disabled={isViewMode}
                            className="bg-slate-50"
                            required={!isViewMode}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) => updateItem(item.id, "taxRate", e.target.value)}
                            disabled={isViewMode}
                            className="bg-orange-50 border-orange-200"
                          />
                        </TableCell>
                        <TableCell className="font-bold text-primary">
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
                              className="text-red-400"
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
      <div className="hidden print:block absolute top-0 left-0 w-full h-full bg-white z-[9999] p-8" dir="rtl">
        <div className="max-w-4xl mx-auto">
          {/* رأس الفاتورة */}
          <div className="border-b pb-4 mb-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">فاتورة مبيعات</h1>
              <p className="text-sm text-gray-600">مصنع الطوب</p>
            </div>
            <div className="text-left">
              <p className="text-sm">التاريخ: {new Date(invoiceDate).toLocaleDateString('ar-EG')}</p>
              <p className="text-sm font-bold">رقم الفاتورة: #{invoiceNumber}</p>
            </div>
          </div>

          {/* بيانات العميل */}
          <div className="mb-4 p-2 bg-gray-50 rounded">
            <p><span className="font-bold">العميل:</span> {customer.name}</p>
          </div>

          {/* جدول الأصناف */}
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="py-2 px-1 text-right">البيان</th>
                <th className="py-2 px-1 text-right">الكمية</th>
                <th className="py-2 px-1 text-right">السعر</th>
                <th className="py-2 px-1 text-right">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-1 px-1">{item.description}</td>
                  <td className="py-1 px-1">{item.quantity}</td>
                  <td className="py-1 px-1">{item.unitPrice.toLocaleString('ar-EG')}</td>
                  <td className="py-1 px-1 font-bold">{item.total.toLocaleString('ar-EG')} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ملخص الأرقام */}
          <div className="flex flex-col items-end space-y-1 border-t pt-2">
            <div className="flex gap-4">
              <span>الإجمالي قبل الضريبة:</span>
              <span className="font-mono">{subtotal.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex gap-4">
              <span>الضريبة:</span>
              <span className="font-mono">{totalTax.toLocaleString('ar-EG')} ج.م</span>
            </div>
            {returnsCount > 0 && (
              <div className="flex gap-4 text-red-600">
                <span>إجمالي المرتجعات:</span>
                <span className="font-mono">-{returnsTotal.toLocaleString('ar-EG')} ج.م</span>
              </div>
            )}
            <div className="flex gap-4 text-lg font-bold border-t pt-1 mt-1">
              <span>الإجمالي النهائي:</span>
              <span className="text-green-600 font-mono">
                {(returnsCount > 0 ? netTotal : grandTotal).toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          </div>

          {/* توقيع */}
          <div className="mt-8 text-center text-sm text-gray-500">
            شكراً لتعاملكم معنا
          </div>
        </div>
      </div>
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
  const isEditMode = !!invoiceId && invoiceId !== "create" && mode !== "view";
  const isViewMode = !!invoiceId && invoiceId !== "create" && mode === "view";

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(isEditMode || isViewMode);

  useEffect(() => {
    if (isEditMode || isViewMode) {
      setLoading(true);
      getSalesInvoiceWithReturns(Number(invoiceId))
        .then((invoice) => {
          if (invoice) {
            return getCustomers().then((customers) => {
              const fullCustomer = (customers as Customer[]).find(c => c.id === invoice.customerId);
              if (fullCustomer) {
                setSelectedCustomer(fullCustomer);
              } else {
                setSelectedCustomer({
                  id: invoice.customerId,
                  name: invoice.customerName,
                  code: 0,
                  phone: null,
                  address: null,
                });
              }
            });
          }
        })
        .catch((error) => {
          console.error("Error loading invoice:", error);
          toast.error("حدث خطأ أثناء تحميل بيانات الفاتورة");
        })
        .finally(() => setLoading(false));
    }
  }, [isEditMode, isViewMode, invoiceId]);

  if (loading) {
    return (
      <>
        <Navbar title="فاتورة مبيعات" />
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50/50 min-h-[calc(100vh-64px)]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">جاري تحميل بيانات الفاتورة...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar title={isViewMode ? "عرض فاتورة مبيعات" : isEditMode ? "تعديل فاتورة مبيعات" : "فاتورة مبيعات جديدة"} />
      {selectedCustomer === null ? (
        <CustomerSearchStep
          onCustomerSelected={setSelectedCustomer}
        />
      ) : (
        <InvoiceFormStep
          customer={selectedCustomer}
          onBack={() => {
            if (isEditMode || isViewMode) {
              router.push("/sales-invoices");
            } else {
              setSelectedCustomer(null);
            }
          }}
          invoiceId={invoiceId}
          readOnly={isViewMode}
        />
      )}
    </>
  );
}