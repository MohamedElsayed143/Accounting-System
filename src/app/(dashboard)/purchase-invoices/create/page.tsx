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

// Import real supplier action
import { getSuppliers } from "@/app/(dashboard)/suppliers/actions"; 

// Import mock invoice actions
import {
  getNextPurchaseInvoiceNumber,
  checkPurchaseInvoiceNumberExists,
  createPurchaseInvoice,
  getPurchaseInvoiceById,
  updatePurchaseInvoice,
  PurchaseInvoiceItem
} from "../actions";
import { PrintableInvoice } from "@/components/invoices/printable-invoice";

// ─── الأنواع ──────────────────────────────────────────────────────────────────
interface Supplier {
  id: number;
  name: string;
  code: number;
  phone: string | null;
  address: string | null;
  category: string | null;
}

// ============================================================
// Step 1 — البحث الفوري عن المورد
// ============================================================
function SupplierSearchStep({
  onSupplierSelected,
}: {
  onSupplierSelected: (supplier: Supplier) => void;
}) {
  const [query, setQuery] = useState("");
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSuppliers()
      .then((data) => setAllSuppliers(data as Supplier[]))
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allSuppliers.filter((s) => {
      const codeMatch = s.code.toString() === q;
      const phoneMatch = s.phone && s.phone === q;
      const nameMatch = s.name.toLowerCase().includes(q);
      return codeMatch || phoneMatch || nameMatch;
    });
  }, [query, allSuppliers]);

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
          <h2 className="text-2xl font-black text-slate-800">ابحث عن المورد أولاً</h2>
          <p className="text-muted-foreground">تظهر النتائج تلقائياً أثناء الكتابة</p>
        </div>

        <Card className="border-none shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">بحث فوري عن المورد</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="اكتب الكود، الموبايل، أو اسم المورد..."
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
                  results.map((supplier) => (
                    <button
                      key={supplier.id}
                      type="button"
                      onClick={() => onSupplierSelected(supplier)}
                      className="w-full text-right p-4 rounded-lg border border-slate-200 hover:border-primary hover:bg-primary/5 transition-all flex justify-between items-center group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 group-hover:text-primary">
                            {supplier.name}
                          </span>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                            #{supplier.code}
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
// Step 2 — نموذج إنشاء/تعديل الفاتورة
// ============================================================
function InvoiceFormStep({
  supplier,
  onBack,
  invoiceId,
}: {
  supplier: Supplier;
  onBack: () => void;
  invoiceId?: string | null;
}) {
  const router = useRouter();
  const isEditMode = !!invoiceId && invoiceId !== "create";

  // ─── رقم الفاتورة ─────────────────────────────────────────────────────────
  const [invoiceNumber, setInvoiceNumber] = useState<number>(1);
  const [invoiceNumberError, setInvoiceNumberError] = useState<string>("");
  const [checkingNumber, setCheckingNumber] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  // ─── باقي حقول الفاتورة ───────────────────────────────────────────────────
  const [paymentType, setPaymentType] = useState<"cash" | "credit" | "pending">("cash");
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [items, setItems] = useState<PurchaseInvoiceItem[]>([
    { id: Date.now(), description: "", quantity: 0, unitPrice: 0, taxRate: 0, total: 0 },
  ]);

  // تحميل بيانات الفاتورة إذا كنا في وضع التعديل
  useEffect(() => {
    if (isEditMode && invoiceId) {
      setLoading(true);
      getPurchaseInvoiceById(Number(invoiceId))
        .then((invoice) => {
          if (invoice) {
            setInvoiceNumber(invoice.invoiceNumber);
            setPaymentType(invoice.status as "cash" | "credit" | "pending");
            setInvoiceDate(new Date(invoice.invoiceDate).toISOString().split("T")[0]);
            
            if (invoice.items && invoice.items.length > 0) {
              const formattedItems = invoice.items.map((item: {
                description: string;
                quantity: number;
                unitPrice: number;
                taxRate: number;
                total: number;
              }, index: number) => ({
                id: Date.now() + index, // تأكد من أن كل item له id فريد
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
  }, [isEditMode, invoiceId]);

  // جلب الرقم التالي من قاعدة البيانات عند فتح النموذج (فقط في وضع الإنشاء)
  useEffect(() => {
    if (!isEditMode) {
      getNextPurchaseInvoiceNumber().then(setInvoiceNumber);
    }
  }, [isEditMode]);

  // التحقق من رقم الفاتورة عند تغييره (debounce 400ms)
  useEffect(() => {
    if (!invoiceNumber || invoiceNumber < 1) return;
    
    setCheckingNumber(true);
    const timer = setTimeout(async () => {
      const taken = await checkPurchaseInvoiceNumberExists(invoiceNumber);
      // في وضع التعديل، إذا كان الرقم هو نفس الرقم الأصلي، لا نعرض خطأ
      if (isEditMode && taken) {
        // نحتاج لمعرفة إذا كان هذا الرقم يخص هذه الفاتورة
        const invoice = await getPurchaseInvoiceById(Number(invoiceId));
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
  }, [invoiceNumber, isEditMode, invoiceId]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        description: "",
        quantity: 0,
        unitPrice: 0,
        taxRate: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateItem = (
    index: number,
    field: keyof PurchaseInvoiceItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
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

  // ─── حفظ أو تحديث الفاتورة في قاعدة البيانات ──────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        supplierId: supplier.id,
        supplierName: supplier.name,
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
        // تحديث فاتورة موجودة
        await updatePurchaseInvoice(Number(invoiceId), invoiceData);
        toast.success(`تم تحديث الفاتورة #${invoiceNumber} بنجاح`);
      } else {
        // إنشاء فاتورة جديدة
        await createPurchaseInvoice(invoiceData);
        toast.success(`تم حفظ الفاتورة #${invoiceNumber} بنجاح`);
      }
      
      router.push("/purchase-invoices");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const canSave = !invoiceNumberError && !checkingNumber && !saving && !loading;

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
        {/* Header content */}
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
              {isEditMode ? "تعديل فاتورة مشتريات" : "إنشاء فاتورة مشتريات"}
            </h2>
            <p className="text-muted-foreground font-medium">
              نظام إدارة المشتريات
            </p>
          </div>
        </div>

        {/* Print Button */}
        {(isEditMode || invoiceId) && (
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
          {/* ── بيانات المورد والطلب ── */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b py-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <div className="w-2 h-6 bg-primary rounded-full" /> بيانات المورد والطلب
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white pt-5 pb-5">
              <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                {/* معلومات المورد */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-black text-lg text-slate-800">
                      {supplier.name}
                    </span>
                    <div className="text-xs text-muted-foreground font-bold">
                      #{supplier.code}
                    </div>
                  </div>
                </div>

                {/* الحقول الإضافية */}
                <div className="flex items-end gap-4 flex-wrap">
                  {/* ── رقم الفاتورة ── */}
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
                        className={`w-32 bg-slate-50 border-slate-200 text-center font-bold text-lg ${
                          invoiceNumberError
                            ? "border-red-400 bg-red-50 focus-visible:ring-red-400"
                            : ""
                        }`}
                        required
                      />
                      {checkingNumber && (
                        <p className="text-xs text-slate-400 font-medium">جاري التحقق...</p>
                      )}
                      {invoiceNumberError && !checkingNumber && (
                        <p className="text-xs text-red-500 font-medium max-w-[220px] leading-tight">
                          {invoiceNumberError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── نوع الفاتورة ── */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 text-sm font-bold flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> نوع الفاتورة
                    </Label>
                    <Select
                      value={paymentType}
                      onValueChange={(v) =>
                        setPaymentType(v as "cash" | "credit" | "pending")
                      }
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

                  {/* ── تاريخ الفاتورة ── */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 text-sm font-bold">
                      تاريخ الفاتورة
                    </Label>
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="bg-slate-50 border-slate-200 w-44"
                      required
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── تفاصيل الأصناف ── */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-white border-b py-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <div className="w-2 h-6 bg-orange-500 rounded-full" /> تفاصيل الأصناف
              </CardTitle>
              <Button
                type="button"
                onClick={addItem}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 gap-2"
              >
                <Plus className="h-4 w-4" /> إضافة صنف
              </Button>
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
                  {items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>
                        <Input
                          placeholder="وصف الصنف"
                          value={item.description}
                          onChange={(e) =>
                            updateItem(index, "description", e.target.value)
                          }
                          className="bg-transparent border-none focus-visible:ring-1 shadow-none"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateItem(index, "quantity", e.target.value)
                          }
                          className="bg-slate-50"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unitPrice || ""}
                          onChange={(e) =>
                            updateItem(index, "unitPrice", e.target.value)
                          }
                          className="bg-slate-50"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) =>
                            updateItem(index, "taxRate", e.target.value)
                          }
                          className="bg-orange-50 border-orange-200"
                        />
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {item.total.toLocaleString("ar-EG")} ج.م
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* ── ملخص الفاتورة ── */}
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
              <Separator className="bg-white/10" />
              <div className="pt-2">
                <p className="text-xs text-slate-400 mb-1">الصافي النهائي:</p>
                <p className="text-3xl font-black text-green-400">
                  {grandTotal.toLocaleString("ar-EG")} ج.م
                </p>
              </div>
            </div>
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
          </Card>
        </div>
      </form>
      </div>

      {/* Printable Component */}
      <div className="hidden print:block absolute top-0 left-0 w-full h-full bg-white z-[9999]">
         <PrintableInvoice
            invoiceNumber={invoiceNumber}
            date={invoiceDate}
            partnerName={supplier.name}
            partnerLabel="المورد"
            title="فاتورة مشتريات"
            items={items.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total
            }))}
            subtotal={subtotal}
            tax={totalTax}
            total={grandTotal}
         />
      </div>
    </div>
  );
}

// ============================================================
// الصفحة الرئيسية
// ============================================================
export default function CreatePurchaseInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("id");
  const isEditMode = !!invoiceId && invoiceId !== "create";
  
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(isEditMode);

  // تحميل بيانات الفاتورة في وضع التعديل
  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      // جلب الفاتورة أولاً
      getPurchaseInvoiceById(Number(invoiceId))
        .then((invoice) => {
          if (invoice) {
            // جلب كل الموردين
            return getSuppliers().then((suppliers) => {
              // البحث عن المورد المطلوب
              const fullSupplier = (suppliers as Supplier[]).find(s => s.id === invoice.supplierId);
              if (fullSupplier) {
                setSelectedSupplier(fullSupplier);
              } else {
                // إذا لم يتم العثور على المورد، نستخدم بيانات من الفاتورة
                setSelectedSupplier({
                  id: invoice.supplierId,
                  name: invoice.supplierName,
                  code: 0,
                  phone: null,
                  address: null,
                  category: null
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
  }, [isEditMode, invoiceId]);

  if (loading) {
    return (
      <>
        <Navbar title="فاتورة مشتريات" />
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
      <Navbar title={isEditMode ? "تعديل فاتورة مشتريات" : "فاتورة مشتريات جديدة"} />
      {selectedSupplier === null ? (
        <SupplierSearchStep 
          onSupplierSelected={setSelectedSupplier}
        />
      ) : (
        <InvoiceFormStep
          supplier={selectedSupplier}
          onBack={() => {
            if (isEditMode) {
              router.push("/purchase-invoices");
            } else {
              setSelectedSupplier(null);
            }
          }}
          invoiceId={invoiceId}
        />
      )}
    </>
  );
}