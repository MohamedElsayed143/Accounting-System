// app/(dashboard)/sales-invoices/create/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Calculator,
  Search,
  User,
  ChevronLeft,
  CreditCard,
  Hash,
  Printer,
  History as HistoryIcon,
  Loader2,
  AlertTriangle,
  Package,
  ChevronDown,
  Banknote,
  Building2,
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  Percent,
  Tag,
  ShoppingCart,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { useFormAutoSave } from "@/hooks/useFormAutoSave";

import { getCustomers } from "@/app/(dashboard)/customers/actions";
import {
  getNextInvoiceNumber,
  checkInvoiceNumberExists,
  createSalesInvoice,
  getSalesInvoiceWithReturns,
  updateSalesInvoice,
} from "../actions";
import { getTreasuryData } from "@/app/(dashboard)/treasury/actions";
import {
  getSystemSettings,
  getCompanySettingsAction,
  getGeneralSettingsAction,
} from "@/app/(dashboard)/settings/actions";

// ─── الأنواع ──────────────────────────────────────────────────────────────────
interface Customer {
  id: number;
  name: string;
  code?: number;
  phone?: string | null;
  address?: string | null;
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
  buyPrice?: number;
}

import {
  getProducts,
  getProductPricingHistory,
  ProductData,
} from "@/app/(dashboard)/inventory/products/actions";

// ============================================================
// Payment Type Badge Component
// ============================================================
function PaymentBadge({ type }: { type: "cash" | "credit" | "pending" }) {
  const config = {
    cash: {
      label: "نقدي",
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    credit: {
      label: "أجل",
      icon: Clock,
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    pending: {
      label: "معلقة",
      icon: XCircle,
      className: "bg-rose-50 text-rose-700 border-rose-200",
    },
  };
  const c = config[type];
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
        c.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

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
  const [itemsExceedingStock, setItemsExceedingStock] = useState<
    { name: string; requested: number; available: number }[]
  >([]);

  const [customer, setCustomer] = useState<Customer | null>(initialCustomer);
  const [paymentType, setPaymentType] = useState<"cash" | "credit" | "pending">(
    "cash",
  );
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState<string>("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [topNotes, setTopNotes] = useState<string[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string[]>([]);
  const [safes, setSafes] = useState<
    { id: number; name: string; balance: number }[]
  >([]);
  const [banks, setBanks] = useState<
    { id: number; name: string; balance: number }[]
  >([]);
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

  const [products, setProducts] = useState<ProductData[]>([]);

  // Draft handling
  const currentFormState = useMemo(
    () => ({
      customer,
      paymentType,
      invoiceDate,
      dueDate,
      items,
      topNotes,
      discount,
      notes,
      printableTitle,
      topNotesTitle,
      notesTitle,
    }),
    [
      customer,
      paymentType,
      invoiceDate,
      dueDate,
      items,
      topNotes,
      discount,
      notes,
      printableTitle,
      topNotesTitle,
      notesTitle,
    ],
  );

  const { clearDraft, removeDraftOnly, isLoaded: draftLoaded } = useFormAutoSave(
    "sales_invoice_new",
    currentFormState,
    (saved) => {
      if (saved.customer) setCustomer(saved.customer);
      if (saved.paymentType) setPaymentType(saved.paymentType);
      if (saved.invoiceDate) setInvoiceDate(saved.invoiceDate);
      if (saved.dueDate) setDueDate(saved.dueDate);
      if (saved.items && saved.items.length > 0) setItems(saved.items);
      if (saved.topNotes) setTopNotes(saved.topNotes);
      if (saved.discount !== undefined) setDiscount(saved.discount);
      if (saved.notes) setNotes(saved.notes);
      if (saved.printableTitle) setPrintableTitle(saved.printableTitle);
      if (saved.topNotesTitle) setTopNotesTitle(saved.topNotesTitle);
      if (saved.notesTitle) setNotesTitle(saved.notesTitle);
    },
    isEditMode || isViewMode,
  );

  const handleClearDraft = () => {
    setCustomer(null);
    setPaymentType("cash");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setItems([]);
    setTopNotes([]);
    setDiscount(0);
    setNotes([]);
    clearDraft();
  };

  useEffect(() => {
    getProducts().then(setProducts);
    getCompanySettingsAction().then((s) => {
      setSettings(s);
      if (s?.salesInvoiceName) {
        setPrintableTitle(s.salesInvoiceName);
      }
    });
    getSystemSettings().then(setSystemSettings);
    getGeneralSettingsAction().then(setNotifSettings);
    getTreasuryData().then((data) => {
      const allSafes = data.accounts.filter(
        (acc) => acc.type === "safe",
      ) as any[];
      const allBanks = data.accounts.filter(
        (acc) => acc.type === "bank",
      ) as any[];
      setSafes(allSafes);
      setBanks(allBanks);
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
            setInvoiceDate(
              new Date(invoice.invoiceDate).toISOString().split("T")[0],
            );
            if (invoice.dueDate) {
              setDueDate(new Date(invoice.dueDate).toISOString().split("T")[0]);
            }
            setDiscount(invoice.discount || 0);

            if (invoice.customer) {
              setCustomer({
                id: invoice.customer.id,
                name: invoice.customer.name,
                phone: invoice.customer.phone,
                address: invoice.customer.address,
              });
            }

            const totalReturns =
              invoice.salesReturns?.reduce(
                (sum: number, ret: any) => sum + ret.total,
                0,
              ) || 0;
            setReturnsTotal(totalReturns);
            setReturnsCount(invoice.salesReturns?.length || 0);
            setReturns(invoice.salesReturns || []);

            if (invoice.items && invoice.items.length > 0) {
              const formattedItems = invoice.items.map(
                (item: any, index: number) => ({
                  id: String(item.id || index + 1),
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  profitMargin:
                    item.profitMargin || item.product?.profitMargin || 0,
                  taxRate: item.taxRate,
                  discount: item.discount || 0,
                  total: item.total,
                  productId: item.productId || null,
                  stockBalance: item.product?.currentStock || 0,
                  buyPrice: item.product?.buyPrice || 0,
                }),
              );
              setItems(formattedItems);
            }

            // Load notes regardless of items presence
            const rawTopNotes = (invoice as any).topNotes || [];
            if (
              rawTopNotes &&
              typeof rawTopNotes === "object" &&
              "items" in rawTopNotes
            ) {
              setTopNotesTitle(rawTopNotes.title || "ملاحظات هامة");
              setTopNotes(rawTopNotes.items || []);
            } else {
              setTopNotes(Array.isArray(rawTopNotes) ? rawTopNotes : []);
            }

            const rawNotes = (invoice as any).notes || [];
            if (
              rawNotes &&
              typeof rawNotes === "object" &&
              "items" in rawNotes
            ) {
              setNotesTitle(rawNotes.title || "ملاحظات إضافية");
              setNotes(rawNotes.items || []);
            } else {
              setNotes(Array.isArray(rawNotes) ? rawNotes : []);
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
            taken
              ? `رقم الفاتورة #${invoiceNumber} مستخدم مسبقاً، يرجى اختيار رقم آخر`
              : "",
          );
        }
      } else {
        setInvoiceNumberError(
          taken
            ? `رقم الفاتورة #${invoiceNumber} مستخدم مسبقاً، يرجى اختيار رقم آخر`
            : "",
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
      toast.warning(
        `تنبيه: سيتم بيع الصنف "${product.name}" بدون رصيد كافٍ. جاري استرجاع آخر سعر بيع...`,
      );

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
        buyPrice: product.buyPrice,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (isViewMode) return;
    if (items.length > 1)
      setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof InvoiceItem,
    value: string | number | null,
  ) => {
    if (isViewMode) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        let finalValue = value;

        if (
          field === "quantity" ||
          field === "unitPrice" ||
          field === "taxRate" ||
          field === "discount"
        ) {
          finalValue = Math.max(0, Number(value));
        }

        const updated = { ...item, [field]: finalValue };

        if (field === "unitPrice") {
          const newUnitPrice = Number(updated.unitPrice);
          const buyPrice = updated.buyPrice || 0;
          if (buyPrice > 0) {
            if (newUnitPrice > 0) {
              updated.profitMargin = Number(
                ((1 - buyPrice / newUnitPrice) * 100).toFixed(2),
              );
            } else {
              updated.profitMargin = -100;
            }
          }
        }

        const basePrice = Number(updated.quantity) * Number(updated.unitPrice);
        const discountAmount =
          basePrice * (Number(updated.discount || 0) / 100);
        const priceAfterDiscount = basePrice - discountAmount;
        updated.total =
          priceAfterDiscount +
          priceAfterDiscount * (Number(updated.taxRate) / 100);
        return updated;
      }),
    );
  };

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, i) => sum + Number(i.quantity) * Number(i.unitPrice),
        0,
      ),
    [items],
  );
  const itemsDiscount = useMemo(
    () =>
      items.reduce(
        (sum, i) =>
          sum +
          Number(i.quantity) *
            Number(i.unitPrice) *
            (Number(i.discount || 0) / 100),
        0,
      ),
    [items],
  );
  const totalTax = useMemo(
    () =>
      items.reduce((sum, i) => {
        const itemBase = Number(i.quantity) * Number(i.unitPrice);
        const discountAmount = itemBase * (Number(i.discount || 0) / 100);
        const itemAfterDiscount = itemBase - discountAmount;
        return sum + itemAfterDiscount * (Number(i.taxRate) / 100);
      }, 0),
    [items],
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
            toast.warning(`تنبيه: لا يوجد مخزون كافٍ للصنف "${w}"`, {
              duration: 6000,
            });
          });
        }
      } else {
        const result = await createSalesInvoice(invoiceData);
        toast.success(`تم حفظ الفاتورة #${invoiceNumber} بنجاح`);
        if (result.stockWarnings && result.stockWarnings.length > 0) {
          result.stockWarnings.forEach((w) => {
            toast.warning(`تنبيه: لا يوجد مخزون كافٍ للصنف "${w}"`, {
              duration: 6000,
            });
          });
        }
      }
      router.push("/sales-invoices");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ";
      toast.error(message);
    } finally {
      if (!isEditMode && !isViewMode) removeDraftOnly();
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
      dueDate:
        paymentType === "credit" || notifSettings?.showDueDateOnInvoices
          ? dueDate
          : undefined,
      safeId:
        paymentType === "cash" && treasuryType === "safe" && selectedSafeId
          ? Number(selectedSafeId)
          : undefined,
      bankId:
        paymentType === "cash" && treasuryType === "bank" && selectedBankId
          ? Number(selectedBankId)
          : undefined,
      topNotes: { title: topNotesTitle, items: topNotes } as any,
      notes: { title: notesTitle, items: notes } as any,
      printableTitle,
      items: items.map(
        ({
          description,
          quantity,
          unitPrice,
          profitMargin,
          taxRate,
          discount,
          total,
          productId,
        }) => {
          if (!productId) throw new Error("يجب اختيار منتج لكل صنف");
          return {
            description,
            quantity,
            unitPrice,
            profitMargin,
            taxRate,
            discount,
            total,
            productId,
          };
        },
      ),
    };

    if (systemSettings?.inventory?.allowNegativeStock) {
      const exceedingItems = items.filter(
        (i) => i.quantity > (i.stockBalance || 0),
      );
      if (exceedingItems.length > 0) {
        setItemsExceedingStock(
          exceedingItems.map((i) => ({
            name: i.description,
            requested: i.quantity,
            available: i.stockBalance || 0,
          })),
        );
        setPendingSaveData(invoiceData);
        setShowNegativeWarning(true);
        return;
      }
    }

    await executeSave(invoiceData);
  };

  const canSave =
    !invoiceNumberError &&
    !checkingNumber &&
    !saving &&
    !loading &&
    !isViewMode;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Receipt className="h-8 w-8 text-blue-500" />
            </div>
            <div className="absolute -inset-1 rounded-2xl border-2 border-blue-200 border-t-blue-500 animate-spin" />
          </div>
          <p className="text-sm text-gray-500 font-medium">
            جاري تحميل بيانات الفاتورة...
          </p>
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

  const pageTitle = isViewMode
    ? "عرض الفاتورة"
    : isEditMode
      ? "تعديل الفاتورة"
      : "فاتورة جديدة";

  return (
    <div
      className="flex-1 print:p-0 print:space-y-0 print:bg-white bg-gray-50 min-h-screen print:min-h-0"
      dir="rtl"
    >
      {/* ── Top Header Bar ── */}
      <div className="print:hidden sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
              <ArrowRight className="h-4 w-4 text-gray-600" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {pageTitle}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">
                  #{invoiceNumber}
                </span>
                {(isEditMode || isViewMode) && (
                  <PaymentBadge type={paymentType} />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                نظام إدارة مبيعات مصنع الطوب
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isEditMode && !isViewMode && (
              <button
                type="button"
                onClick={handleClearDraft}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">مسح المسودة</span>
              </button>
            )}
            {(isEditMode || isViewMode || invoiceId) && (
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-sm"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">طباعة</span>
              </button>
            )}
            {isViewMode && customer && (
              <Link
                href={`/reports?customerId=${customer.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all"
              >
                <HistoryIcon className="h-4 w-4" />
                <span className="hidden sm:inline">كشف الحساب</span>
              </Link>
            )}
            {!isViewMode && (
              <button
                type="submit"
                form="invoice-form"
                disabled={!canSave}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm active:scale-95"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditMode ? "تحديث" : "حفظ الفاتورة"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="print:hidden max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Top Notes */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 overflow-hidden">
          <DynamicNotes
            title={topNotesTitle}
            onTitleChange={setTopNotesTitle}
            notes={topNotes}
            onChange={setTopNotes}
            disabled={isViewMode}
          />
        </div>

        <form id="invoice-form" onSubmit={handleSubmit} className="space-y-5">
          {/* ── Section 1: Invoice Info ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Section Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="font-bold text-gray-800 text-sm">
                بيانات الفاتورة والعميل
              </h2>
            </div>

            <div className="p-5 space-y-5">
              {/* Row 1: Customer + Invoice fields */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Customer Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    العميل
                  </label>
                  <CustomerSelect
                    onSelect={(c) => setCustomer(c)}
                    selectedId={customer?.id}
                    selectedName={customer?.name}
                    selectedCode={customer?.code}
                    disabled={isViewMode || isEditMode}
                    error={!customer ? "يرجى اختيار العميل" : ""}
                  />
                  {customer && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {customer.phone && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          📞 {customer.phone}
                        </span>
                      )}
                      {customer.address && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          📍 {customer.address}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Invoice fields grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Invoice Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      رقم الفاتورة
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={1}
                        value={invoiceNumber}
                        onChange={(e) =>
                          setInvoiceNumber(Number(e.target.value))
                        }
                        disabled={isViewMode}
                        className={cn(
                          "text-center font-bold text-base h-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors",
                          invoiceNumberError &&
                            "border-red-400 bg-red-50 focus:border-red-400",
                        )}
                        required={!isViewMode}
                      />
                      {checkingNumber && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    {invoiceNumberError && !checkingNumber && !isViewMode && (
                      <p className="text-xs text-red-500 font-medium leading-tight">
                        {invoiceNumberError}
                      </p>
                    )}
                  </div>

                  {/* Invoice Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      تاريخ الفاتورة
                    </label>
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      disabled={isViewMode}
                      className="h-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                      required={!isViewMode}
                    />
                  </div>

                  {/* Invoice Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      مسمى الفاتورة
                    </label>
                    <Input
                      value={printableTitle}
                      onChange={(e) => setPrintableTitle(e.target.value)}
                      disabled={isViewMode}
                      className="h-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors font-bold"
                      placeholder="فاتورة مبيعات"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Payment Type + Treasury */}
              <div className="pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 block">
                  نوع الدفع
                </label>
                <div className="flex flex-wrap items-start gap-4">
                  {/* Payment type toggle */}
                  <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
                    {[
                      {
                        value: "cash",
                        label: "نقدي",
                        icon: "💵",
                        active: "bg-emerald-500 text-white shadow-sm",
                      },
                      {
                        value: "credit",
                        label: "أجل",
                        icon: "📋",
                        active: "bg-amber-500 text-white shadow-sm",
                      },
                      {
                        value: "pending",
                        label: "معلقة",
                        icon: "⏳",
                        active: "bg-rose-500 text-white shadow-sm",
                      },
                    ].map((pt) => (
                      <button
                        key={pt.value}
                        type="button"
                        disabled={isViewMode || isEditMode}
                        onClick={() =>
                          setPaymentType(
                            pt.value as "cash" | "credit" | "pending",
                          )
                        }
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                          paymentType === pt.value
                            ? pt.active
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
                          (isViewMode || isEditMode) &&
                            "opacity-75 cursor-default",
                        )}
                      >
                        <span>{pt.icon}</span>
                        {pt.label}
                      </button>
                    ))}
                  </div>

                  {/* Due Date (for credit) */}
                  {(paymentType === "credit" ||
                    notifSettings?.showDueDateOnInvoices) && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">
                        {paymentType === "credit"
                          ? "تاريخ الاستحقاق"
                          : "تاريخ التحصيل المتوقع"}
                      </label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        disabled={isViewMode}
                        className="h-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors w-44"
                      />
                    </div>
                  )}

                  {/* Treasury (for cash) */}
                  {paymentType === "cash" && (
                    <div className="flex items-end gap-3 flex-wrap">
                      {/* Safe/Bank toggle */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">
                          جهة الاستلام
                        </label>
                        <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
                          {[
                            {
                              value: "safe",
                              label: "خزنة",
                              icon: Banknote,
                            },
                            {
                              value: "bank",
                              label: "بنك",
                              icon: Building2,
                            },
                          ].map((tt) => {
                            const Icon = tt.icon;
                            return (
                              <button
                                key={tt.value}
                                type="button"
                                disabled={isViewMode || isEditMode}
                                onClick={() =>
                                  setTreasuryType(tt.value as "safe" | "bank")
                                }
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                                  treasuryType === tt.value
                                    ? "bg-blue-500 text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
                                  (isViewMode || isEditMode) &&
                                    "opacity-75 cursor-default",
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {tt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Safe / Bank Select */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">
                          {treasuryType === "safe"
                            ? "اختر الخزنة"
                            : "اختر البنك"}
                        </label>
                        {treasuryType === "safe" ? (
                          <>
                            <Select
                              value={selectedSafeId}
                              onValueChange={setSelectedSafeId}
                              disabled={
                                isViewMode || isEditMode || safes.length === 0
                              }
                            >
                              <SelectTrigger className="w-48 h-10 rounded-xl border-gray-200 bg-gray-50">
                                <SelectValue
                                  placeholder={
                                    safes.length === 0
                                      ? "لا يوجد خزن"
                                      : "اختر الخزنة"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {safes.map((s) => (
                                  <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name} (
                                    {s.balance.toLocaleString()}{" "}
                                    {settings?.currencyCode || "ج.م"})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {safes.length === 0 && (
                              <p className="text-xs text-red-500 font-bold">
                                يرجى إضافة خزنة أولاً
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <Select
                              value={selectedBankId}
                              onValueChange={setSelectedBankId}
                              disabled={
                                isViewMode || isEditMode || banks.length === 0
                              }
                            >
                              <SelectTrigger className="w-48 h-10 rounded-xl border-gray-200 bg-gray-50">
                                <SelectValue
                                  placeholder={
                                    banks.length === 0
                                      ? "لا يوجد بنوك"
                                      : "اختر البنك"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {banks.map((b) => (
                                  <SelectItem key={b.id} value={String(b.id)}>
                                    {b.name} (
                                    {b.balance.toLocaleString()}{" "}
                                    {settings?.currencyCode || "ج.م"})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {banks.length === 0 && (
                              <p className="text-xs text-red-500 font-bold">
                                يرجى إضافة بنك أولاً
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Items ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 flex-shrink-0">
                  <ShoppingCart className="h-4 w-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-800 text-sm">
                    تفاصيل الأصناف
                  </h2>
                  {items.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {items.length} صنف
                    </p>
                  )}
                </div>
              </div>

              {!isViewMode && (
                <div className="flex items-center gap-3 flex-wrap">
                  {systemSettings?.inventory?.allowNegativeStock && (
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors select-none">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400 cursor-pointer"
                        checked={showZeroStock}
                        onChange={(e) => setShowZeroStock(e.target.checked)}
                      />
                      عرض الرصيد الصفري
                    </label>
                  )}
                  <div className="w-72">
                    <ProductSelect
                      onSelect={addItem}
                      disabled={loading}
                      onlyInStock={
                        !(
                          systemSettings?.inventory?.allowNegativeStock &&
                          showZeroStock
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Items Table */}
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-400 font-medium text-sm">
                  لم يتم إضافة أصناف بعد
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  استخدم الحقل أعلاه للبحث وإضافة الأصناف
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-right font-bold text-gray-500 text-xs uppercase tracking-wide px-5 py-3 bg-gray-50/30">
                        الصنف
                      </th>
                      <th className="text-center font-bold text-blue-500 text-xs uppercase tracking-wide px-3 py-3 bg-gray-50/30 w-24">
                        الرصيد
                      </th>
                      <th className="text-center font-bold text-gray-500 text-xs uppercase tracking-wide px-3 py-3 bg-gray-50/30 w-24">
                        الكمية
                      </th>
                      <th className="text-center font-bold text-gray-500 text-xs uppercase tracking-wide px-3 py-3 bg-gray-50/30 w-28">
                        السعر
                      </th>
                      <th className="text-center font-bold text-emerald-500 text-xs uppercase tracking-wide px-3 py-3 bg-gray-50/30 w-24">
                        الربح %
                      </th>
                      <th className="text-center font-bold text-rose-500 text-xs uppercase tracking-wide px-3 py-3 bg-gray-50/30 w-24">
                        خصم %
                      </th>
                      <th className="text-center font-bold text-amber-500 text-xs uppercase tracking-wide px-3 py-3 bg-gray-50/30 w-20">
                        ضريبة %
                      </th>
                      <th className="text-center font-bold text-gray-500 text-xs uppercase tracking-wide px-5 py-3 bg-gray-50/30 w-32">
                        الإجمالي
                      </th>
                      {!isViewMode && (
                        <th className="w-10 bg-gray-50/30"></th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "group hover:bg-blue-50/30 transition-colors",
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/20",
                        )}
                      >
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-800 text-sm">
                              {item.description}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              #{item.productId}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-lg text-xs font-bold",
                              (item.stockBalance || 0) <= 0
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : "bg-blue-50 text-blue-600 border border-blue-100",
                            )}
                          >
                            {Math.max(
                              0,
                              item.stockBalance || 0,
                            ).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            type="number"
                            step="any"
                            value={item.quantity || ""}
                            onChange={(e) =>
                              updateItem(item.id, "quantity", e.target.value)
                            }
                            disabled={isViewMode}
                            className="h-9 text-center font-bold rounded-lg border-gray-200 bg-gray-50 focus:bg-white transition-colors w-full"
                            required={!isViewMode}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            type="number"
                            step="any"
                            value={item.unitPrice || ""}
                            onChange={(e) =>
                              updateItem(item.id, "unitPrice", e.target.value)
                            }
                            disabled={isViewMode}
                            className="h-9 text-center font-bold rounded-lg border-gray-200 bg-gray-50 focus:bg-white transition-colors w-full"
                            required={!isViewMode}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            type="number"
                            step="any"
                            value={item.profitMargin || 0}
                            disabled
                            className="h-9 text-center font-bold rounded-lg bg-emerald-50 border-emerald-100 text-emerald-700 w-full cursor-default"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            type="number"
                            step="any"
                            value={item.discount || ""}
                            onChange={(e) =>
                              updateItem(item.id, "discount", e.target.value)
                            }
                            disabled={isViewMode}
                            placeholder="0"
                            className="h-9 text-center font-bold rounded-lg bg-rose-50 border-rose-100 focus:bg-rose-50 transition-colors w-full"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            type="number"
                            step="any"
                            value={item.taxRate}
                            onChange={(e) =>
                              updateItem(item.id, "taxRate", e.target.value)
                            }
                            disabled={isViewMode}
                            className="h-9 text-center font-bold rounded-lg bg-amber-50 border-amber-100 focus:bg-amber-50 transition-colors w-full"
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="font-black text-gray-800 whitespace-nowrap">
                            {item.total.toLocaleString("ar-EG")}
                            <span className="text-xs text-gray-400 font-normal mr-1">
                              {settings?.currencyCode || "ج.م"}
                            </span>
                          </span>
                        </td>
                        {!isViewMode && (
                          <td className="px-2 py-3">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                              className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Section 3: Notes + Summary (side by side on large screens) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Bottom Notes */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100">
                    <StickyNote className="h-4 w-4 text-purple-600" />
                  </div>
                  <h2 className="font-bold text-gray-800 text-sm">الملاحظات</h2>
                </div>
                <div className="p-4">
                  <DynamicNotes
                    title={notesTitle}
                    onTitleChange={setNotesTitle}
                    notes={notes}
                    onChange={setNotes}
                    disabled={isViewMode}
                  />
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden h-full">
                {/* Card Header */}
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Calculator className="h-4 w-4 text-blue-400" />
                    ملخص الفاتورة
                  </h3>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {/* Invoice # */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs">رقم الفاتورة</span>
                    <span className="text-white font-mono font-bold text-sm">
                      #{invoiceNumber}
                    </span>
                  </div>

                  <div className="h-px bg-white/10" />

                  {/* Subtotal */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs">
                      الإجمالي قبل الضريبة
                    </span>
                    <span className="text-gray-200 font-mono text-sm">
                      {subtotal.toLocaleString("ar-EG")}
                    </span>
                  </div>

                  {/* Item discounts */}
                  {itemsDiscount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">
                        خصومات الأصناف
                      </span>
                      <span className="text-rose-400 font-mono text-sm">
                        -{itemsDiscount.toLocaleString("ar-EG")}
                      </span>
                    </div>
                  )}

                  {/* Tax */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-xs">إجمالي الضرائب</span>
                    <span className="text-amber-400 font-mono text-sm">
                      +{totalTax.toLocaleString("ar-EG")}
                    </span>
                  </div>

                  {/* Additional discount */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">خصم إضافي</span>
                      <span className="text-rose-400 font-mono text-sm">
                        -{discount.toLocaleString("ar-EG")}
                      </span>
                    </div>
                    {!isViewMode && (
                      <Input
                        type="number"
                        value={discount || ""}
                        onChange={(e) =>
                          setDiscount(Math.max(0, Number(e.target.value)))
                        }
                        className="bg-white/5 border-white/10 h-8 text-center font-bold text-white text-sm rounded-lg placeholder-gray-500 focus:border-white/20"
                        placeholder="أدخل قيمة الخصم..."
                      />
                    )}
                  </div>

                  {/* Returns */}
                  {returnsCount > 0 && (
                    <>
                      <div className="h-px bg-white/10" />
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs">
                          المرتجعات ({returnsCount})
                        </span>
                        <span className="text-rose-400 font-mono text-sm">
                          -{returnsTotal.toLocaleString("ar-EG")}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="h-px bg-white/10" />

                  {/* Net Total */}
                  <div className="pt-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-gray-400 text-xs">
                        الإجمالي النهائي
                      </span>
                      <div className="text-left">
                        <span className="text-3xl font-black text-emerald-400 font-mono">
                          {netTotal.toLocaleString("ar-EG")}
                        </span>
                        <span className="text-gray-400 text-xs mr-1">
                          {settings?.currencyCode || "ج.م"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Save button (inside card, only visible on large screens) */}
                  {!isViewMode && (
                    <button
                      type="submit"
                      disabled={!canSave}
                      className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-white transition-all active:scale-95 shadow-lg shadow-blue-900/30 text-sm"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          {isEditMode ? "تحديث الفاتورة" : "حفظ الفاتورة"}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ========== نسخة الطباعة (مضمنة بالكامل) ========== */}
      <PrintableInvoice
        invoiceNumber={invoiceNumber}
        prefix={settings?.salesPrefix}
        date={invoiceDate}
        dueDate={dueDate || undefined}
        partnerName={customer?.name || ""}
        phone={customer?.phone || undefined}
        address={customer?.address || undefined}
        title={printableTitle}
        paymentStatus={paymentType}
        returns={returns}
        items={items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount || 0,
          total: i.total,
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
        companyBarcode={(settings as any)?.companyBarcode}
        showLogo={settings?.showLogoOnPrint}
        showStamp={settings?.showStampOnPrint}
        showBarcode={(settings as any)?.showBarcodeOnPrint ?? true}
        termsAndConditions={settings?.termsAndConditions}
      />

      {/* ── Negative Stock Warning Dialog ── */}
      <AlertDialog
        open={showNegativeWarning}
        onOpenChange={setShowNegativeWarning}
      >
        <AlertDialogContent dir="rtl" className="sm:max-w-[440px] rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-start gap-4 mb-2">
              <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-bold text-gray-900">
                  تأكيد البيع بدون رصيد
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-gray-500 mt-1">
                  الأصناف التالية لا تملك رصيداً كافياً:
                </AlertDialogDescription>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              {itemsExceedingStock.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-bold text-gray-800">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">مطلوب</span>
                    <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs">
                      {item.requested}
                    </span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">متاح</span>
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                      {item.available}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-500 mt-2">
              هل تريد المتابعة وإتمام الفاتورة بدون رصيد كافٍ؟
            </p>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel
              disabled={saving}
              onClick={() => {
                setShowNegativeWarning(false);
                setPendingSaveData(null);
              }}
              className="rounded-xl"
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingSaveData) executeSave(pendingSaveData);
              }}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "نعم، متابعة"
              )}
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
              const fullCustomer = (customers as Customer[]).find(
                (c) => c.id === invoice.customerId,
              );
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
        <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Receipt className="h-8 w-8 text-blue-400" />
              </div>
              <div className="absolute -inset-1 rounded-2xl border-2 border-blue-200 border-t-blue-500 animate-spin" />
            </div>
            <p className="text-sm text-gray-400 font-medium">
              جاري تحميل بيانات الفاتورة...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar
        title={
          isViewMode
            ? "عرض فاتورة مبيعات"
            : invoiceId && invoiceId !== "create"
              ? "تعديل فاتورة مبيعات"
              : "فاتورة مبيعات جديدة"
        }
      />
      <div className="min-h-screen bg-gray-50 pb-12">
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