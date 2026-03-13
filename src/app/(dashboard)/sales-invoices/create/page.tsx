// app/(dashboard)/sales-invoices/create/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Plus, Trash2, Save, Calculator,
  Search, User, ChevronLeft, CreditCard, Hash, Printer,
  History as HistoryIcon, Loader2, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { getTreasuryData } from "@/app/(dashboard)/treasury/actions";
import { getSystemSettings, getCompanySettingsAction, getGeneralSettingsAction } from "@/app/(dashboard)/settings/actions";

// ─── الأنواع ──────────────────────────────────────────────────────────────────
interface Customer {
  id: number;
  name: string;
  code?: number;
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
  stockBalance?: number;
}

import { getProducts, getProductPricingHistory, ProductData } from "@/app/(dashboard)/inventory/products/actions";

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

  const [showNegativeWarning, setShowNegativeWarning] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);
  const [itemsExceedingStock, setItemsExceedingStock] = useState<{name: string, requested: number, available: number}[]>([]);

  const [customer, setCustomer] = useState<Customer | null>(initialCustomer);
  const [paymentType, setPaymentType] = useState<"cash" | "credit" | "pending">("cash");
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState<string>("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [topNotes, setTopNotes] = useState<string[]>([]);
  const [discount, setDiscount] = useState<number>(0); // Global discount
  const [notes, setNotes] = useState<string[]>([]);
  const [safes, setSafes] = useState<{ id: number; name: string; balance: number }[]>([]);
  const [banks, setBanks] = useState<{ id: number; name: string; balance: number }[]>([]);
  const [selectedSafeId, setSelectedSafeId] = useState<string>("");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [treasuryType, setTreasuryType] = useState<"safe" | "bank">("safe");
  const [settings, setSettings] = useState<any>(null);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [notifSettings, setNotifSettings] = useState<any>(null);
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [printableTitle, setPrintableTitle] = useState<string>("فاتورة مبيعات");
  const [topNotesTitle, setTopNotesTitle] = useState<string>("ملاحظات هامة");
  const [notesTitle, setNotesTitle] = useState<string>("ملاحظات إضافية");

  // قائمة جميع المنتجات
  const [products, setProducts] = useState<ProductData[]>([]);

  // تحميل المنتجات والخزائن والإعدادات
  useEffect(() => {
    getProducts().then(setProducts);
    getCompanySettingsAction().then((s) => {
      setSettings(s);
      if (s?.invoiceName) {
        setPrintableTitle(s.invoiceName);
      }
    });
    getSystemSettings().then(setSystemSettings);
    getGeneralSettingsAction().then(setNotifSettings);
    getTreasuryData().then((data) => {
      const allSafes = data.accounts.filter(acc => acc.type === "safe") as any[];
      const allBanks = data.accounts.filter(acc => acc.type === "bank") as any[];
      setSafes(allSafes);
      setBanks(allBanks);
      // التحديد الافتراضي لأول خزنة
      if (allSafes.length > 0) setSelectedSafeId(String(allSafes[0].id));
    });
  }, []);

  const [returnsTotal, setReturnsTotal] = useState<number>(0);
  const [returnsCount, setReturnsCount] = useState<number>(0);
  const [returns, setReturns] = useState<any[]>([]);

  useEffect(() => {
    if ((isEditMode || isViewMode) && invoiceId) {
      setLoading(true);
      getSalesInvoiceWithReturns(Number(invoiceId))
        .then((invoice: any) => {
          if (invoice) {
            setInvoiceNumber(invoice.invoiceNumber);
            setPaymentType(invoice.status as "cash" | "credit" | "pending");
            setInvoiceDate(new Date(invoice.invoiceDate).toISOString().split("T")[0]);
            if (invoice.dueDate) {
              setDueDate(new Date(invoice.dueDate).toISOString().split("T")[0]);
            }
            setDiscount(invoice.discount || 0);
            
            if (invoice.customer) {
              setCustomer({
                id: invoice.customer.id,
                name: invoice.customer.name,
              });
            }

            const totalReturns = invoice.salesReturns?.reduce((sum: number, ret: any) => sum + ret.total, 0) || 0;
            setReturnsTotal(totalReturns);
            setReturnsCount(invoice.salesReturns?.length || 0);
            setReturns(invoice.salesReturns || []);

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
                stockBalance: item.product?.currentStock || 0,
              }));
                setItems(formattedItems);
              
              // Handle topNotes (could be string[] or {title, items})
              const rawTopNotes = (invoice as any).topNotes;
              if (rawTopNotes && typeof rawTopNotes === 'object' && 'items' in rawTopNotes) {
                setTopNotesTitle(rawTopNotes.title || "ملاحظات هامة");
                setTopNotes(rawTopNotes.items || []);
              } else {
                setTopNotes(rawTopNotes || []);
              }

              // Handle bottom notes
              const rawNotes = (invoice as any).notes;
              if (rawNotes && typeof rawNotes === 'object' && 'items' in rawNotes) {
                setNotesTitle(rawNotes.title || "ملاحظات إضافية");
                setNotes(rawNotes.items || []);
              } else {
                setNotes(rawNotes || []);
              }
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

  const addItem = async (product: ProductData) => {
    if (isViewMode) return;
    
    let appliedUnitPrice = product.sellPrice;
    let appliedProfitMargin = product.profitMargin || 0;

    if (product.currentStock <= 0) {
      toast.warning(`تنبيه: سيتم بيع الصنف "${product.name}" بدون رصيد كافٍ. جاري استرجاع آخر سعر بيع...`);
      
      const history = await getProductPricingHistory(product.id);
      if (history) {
        appliedUnitPrice = history.lastSellingPrice;
        appliedProfitMargin = history.lastProfitMargin;
      }
    }

    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: product.name,
        quantity: 1,
        unitPrice: appliedUnitPrice,
        profitMargin: appliedProfitMargin,
        taxRate: product.taxRate || 0,
        discount: 0,
        total: appliedUnitPrice * (1 + (product.taxRate || 0) / 100),
        productId: product.id,
        stockBalance: product.currentStock,
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

  const executeSave = async (invoiceData: any) => {
    try {
      setSaving(true);
      if (isEditMode && invoiceId) {
        const result = await updateSalesInvoice(Number(invoiceId), invoiceData);
        toast.success(`تم تحديث الفاتورة #${invoiceNumber} بنجاح`);
        if (result.stockWarnings && result.stockWarnings.length > 0) {
          result.stockWarnings.forEach((w) => {
            toast.warning(`تنبيه: لا يوجد مخزون كافٍ للصنف "${w}"`, { duration: 6000 });
          });
        }
      } else {
        const result = await createSalesInvoice(invoiceData);
        toast.success(`تم حفظ الفاتورة #${invoiceNumber} بنجاح`);
        if (result.stockWarnings && result.stockWarnings.length > 0) {
          result.stockWarnings.forEach((w) => {
            toast.warning(`تنبيه: لا يوجد مخزون كافٍ للصنف "${w}"`, { duration: 6000 });
          });
        }
      }
      router.push("/sales-invoices");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ";
      toast.error(message);
    } finally {
      setSaving(false);
      setShowNegativeWarning(false);
      setPendingSaveData(null);
    }
  };

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
      dueDate: (paymentType === "credit" || notifSettings?.showDueDateOnInvoices) ? dueDate : undefined,
      safeId: (paymentType === "cash" && treasuryType === "safe" && selectedSafeId) ? Number(selectedSafeId) : undefined,
      bankId: (paymentType === "cash" && treasuryType === "bank" && selectedBankId) ? Number(selectedBankId) : undefined,
      topNotes: { title: topNotesTitle, items: topNotes } as any,
      notes: { title: notesTitle, items: notes } as any,
      printableTitle,
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

    if (systemSettings?.inventory?.allowNegativeStock) {
      const exceedingItems = items.filter(i => i.quantity > (i.stockBalance || 0));
      if (exceedingItems.length > 0) {
        setItemsExceedingStock(exceedingItems.map(i => ({
          name: i.description,
          requested: i.quantity,
          available: i.stockBalance || 0
        })));
        setPendingSaveData(invoiceData);
        setShowNegativeWarning(true);
        return; // Pause save process
      }
    }

    await executeSave(invoiceData);
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
    const originalTitle = document.title;
    document.title = "fast";
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  return (
    <div className="flex-1 space-y-6 p-6 print:p-0 print:space-y-0 print:bg-white bg-slate-50/50 min-h-screen print:min-h-0" dir="rtl">
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
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrint}
              className="gap-2 shadow-sm border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-primary h-[42px]"
            >
              <Printer className="h-5 w-5" />
              طباعة الفاتورة
            </Button>
            {isViewMode && customer && (
              <Button
                variant="outline"
                size="lg"
                asChild
                className="gap-2 shadow-sm border-blue-200 hover:bg-blue-50 hover:border-blue-400 text-blue-600 h-[42px]"
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
            title={topNotesTitle}
            onTitleChange={setTopNotesTitle}
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
                      selectedName={customer?.name}
                      selectedCode={customer?.code}
                      disabled={isViewMode || isEditMode}
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
                        disabled={isViewMode || isEditMode}
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
                      <Label className="text-slate-600 text-sm font-bold flex items-center gap-1">
                        مسمى الفاتورة
                      </Label>
                      <Input
                        value={printableTitle}
                        onChange={(e) => setPrintableTitle(e.target.value)}
                        disabled={isViewMode}
                        className="bg-slate-50 border-slate-200 w-44 font-bold"
                        placeholder="مثلاً: فاتورة مبيعات"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-sm font-bold flex items-center gap-1">
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

                    {(paymentType === "credit" || notifSettings?.showDueDateOnInvoices) && (
                      <div className="space-y-1.5">
                        <Label className="text-slate-600 text-sm font-bold flex items-center gap-1">
                          {paymentType === "credit" ? "تاريخ الاستحقاق" : "تاريخ التحصيل المتوقع"}
                        </Label>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          disabled={isViewMode}
                          className="bg-slate-50 border-slate-200 w-44"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {paymentType === "cash" && (
                  <div className="mt-4 pt-4 border-t flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-sm font-bold">جهة الدفع (نقدي)</Label>
                      <Select
                        value={treasuryType}
                        onValueChange={(v) => setTreasuryType(v as "safe" | "bank")}
                        disabled={isViewMode || isEditMode}
                      >
                        <SelectTrigger className="w-32 bg-slate-50 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="safe">خزنة</SelectItem>
                          <SelectItem value="bank">بنك</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {treasuryType === "safe" ? (
                      <div className="space-y-1.5 flex-1 max-w-[200px]">
                        <Label className="text-slate-600 text-sm font-bold">اختر الخزنة</Label>
                        <Select
                          value={selectedSafeId}
                          onValueChange={setSelectedSafeId}
                          disabled={isViewMode || isEditMode || safes.length === 0}
                        >
                          <SelectTrigger className="bg-slate-50 border-slate-200">
                            <SelectValue placeholder={safes.length === 0 ? "لا يوجد خزن" : "اختر الخزنة"} />
                          </SelectTrigger>
                          <SelectContent>
                            {safes.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name} ({s.balance.toLocaleString()} {settings?.currencyCode || "ج.م"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-1.5 flex-1 max-w-[200px]">
                        <Label className="text-slate-600 text-sm font-bold">اختر البنك</Label>
                        <Select
                          value={selectedBankId}
                          onValueChange={setSelectedBankId}
                          disabled={isViewMode || isEditMode || banks.length === 0}
                        >
                          <SelectTrigger className="bg-slate-50 border-slate-200">
                            <SelectValue placeholder={banks.length === 0 ? "لا يوجد بنوك" : "اختر البنك"} />
                          </SelectTrigger>
                          <SelectContent>
                            {banks.map((b) => (
                              <SelectItem key={b.id} value={String(b.id)}>
                                {b.name} ({b.balance.toLocaleString()} {settings?.currencyCode || "ج.م"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {paymentType === "cash" && treasuryType === "safe" && safes.length === 0 && (
                      <p className="text-xs text-red-500 font-bold mb-2">يرجى إضافة خزنة أولاً</p>
                    )}
                    {paymentType === "cash" && treasuryType === "bank" && banks.length === 0 && (
                      <p className="text-xs text-red-500 font-bold mb-2">يرجى إضافة بنك أولاً</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-white border-b py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="w-2 h-6 bg-orange-500 rounded-full" /> تفاصيل الأصناف
                </CardTitle>
                {!isViewMode && (
                  <div className="flex items-center gap-4">
                    {systemSettings?.inventory?.allowNegativeStock && (
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                          checked={showZeroStock}
                          onChange={(e) => setShowZeroStock(e.target.checked)}
                        />
                        عرض أصناف الرصيد الصفري
                      </label>
                    )}
                    <div className="w-72">
                      <ProductSelect 
                        onSelect={addItem} 
                        disabled={loading} 
                        onlyInStock={!(systemSettings?.inventory?.allowNegativeStock && showZeroStock)} 
                      />
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0 bg-white">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-right font-bold">الصنف</TableHead>
                        <TableHead className="text-right font-bold w-24 text-blue-600 outline-none">الرصيد</TableHead>
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
                          <TableCell className="text-right">
                            <span className={cn(
                              "font-bold px-2 py-1 rounded text-sm",
                              (item.stockBalance || 0) <= 0 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                            )}>
                              {Math.max(0, item.stockBalance || 0).toLocaleString()}
                            </span>
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
                            {item.total.toLocaleString("ar-EG")} {settings?.currencyCode || "ج.م"}
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
                </div>
              </CardContent>
            </Card>

            <DynamicNotes 
              title={notesTitle} 
              onTitleChange={setNotesTitle} 
              notes={notes} 
              onChange={setNotes} 
              disabled={isViewMode} 
            />
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
                    {subtotal.toLocaleString("ar-EG")} {settings?.currencyCode || "ج.م"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>إجمالي الضرائب:</span>
                  <span className="text-orange-400 font-mono">
                    +{totalTax.toLocaleString("ar-EG")} {settings?.currencyCode || "ج.م"}
                  </span>
                </div>
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-slate-400 text-sm mb-1">
                    <span>خصم إضافي:</span>
                    <span className="text-red-400 font-mono">
                      -{discount.toLocaleString("ar-EG")} {settings?.currencyCode || "ج.م"}
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
                        -{returnsTotal.toLocaleString("ar-EG")} {settings?.currencyCode || "ج.م"}
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
                    {netTotal.toLocaleString("ar-EG")} {settings?.currencyCode || "ج.م"}
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
        prefix={settings?.salesPrefix}
        date={invoiceDate}
        partnerName={customer?.name || ""}
        partnerLabel="العميل"
        title={printableTitle}
        paymentStatus={paymentType}
        returns={returns}
        items={items.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount || 0,
          total: i.total
        }))}
        subtotal={subtotal}
        discount={itemsDiscount + discount}
        tax={totalTax}
        total={grandTotal}
        currencyCode={settings?.currencyCode}
        topNotes={topNotes}
        topNotesTitle={topNotesTitle}
        notes={notes}
        notesTitle={notesTitle}
        companyName={settings?.companyName}
        companyNameEn={settings?.companyNameEn}
        companyLogo={settings?.companyLogo}
        companyStamp={settings?.companyStamp}
        showLogo={settings?.showLogoOnPrint}
        showStamp={settings?.showStampOnPrint}
        termsAndConditions={settings?.termsAndConditions}
      />

      <AlertDialog open={showNegativeWarning} onOpenChange={setShowNegativeWarning}>
        <AlertDialogContent dir="rtl" className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">
                تأكيد البيع بدون رصيد
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base leading-relaxed pt-2">
              أنت على وشك بيع أصناف كميتها المطلوبة أكبر من الرصيد المتاح:
              <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                {itemsExceedingStock.map((item, index) => (
                  <li key={index}>
                    <span className="font-bold text-slate-800">{item.name}</span>: مطلوب <span className="text-red-500 font-bold">{item.requested}</span>، متاح <span className="text-green-600 font-bold">{item.available}</span>
                  </li>
                ))}
              </ul>
              <br/>
              هل أنت متأكد من رغبتك في إتمام هذه الفاتورة بدون رصيد كافٍ؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel disabled={saving} onClick={() => {
               setShowNegativeWarning(false);
               setPendingSaveData(null);
            }}>
              إلغاء التعديل
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (pendingSaveData) executeSave(pendingSaveData);
              }} 
              disabled={saving} 
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : "نعم، متأكد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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