"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Printer,
  FileSpreadsheet,
  Play,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  FileText,
  Eye,
  X,
  Receipt,
  CreditCard,
  Banknote,
  Building2,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getCustomers,
  getSuppliers,
  getCustomerTransactions,
  getSupplierTransactions,
  getCustomerById,
  getSupplierById,
  type CustomerType,
  type TransactionType,
} from "./actions";
import { getCompanySettingsAction } from "../settings/actions";
import { PrintableStatement } from "./components/PrintableStatement";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- Types imported from actions.tsx ---

// --- Loading Skeleton ---
const TableSkeleton = () => (
  <div className="animate-pulse space-y-4 p-6">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex gap-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/6"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/6"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/6"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded flex-1"></div>
      </div>
    ))}
  </div>
);

// --- Customer/Supplier Search Component ---
const CustomerSearchDropdown = ({
  type,
  selectedCustomer,
  onSelect,
  getCustomers,
}: {
  type: "customer" | "supplier";
  selectedCustomer: CustomerType | null;
  onSelect: (customer: CustomerType | null) => void;
  getCustomers: (search?: string) => Promise<CustomerType[]>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const data = await getCustomers(searchQuery);
      setCustomers(data);
      setLoading(false);
    };

    if (isOpen) {
      fetchCustomers();
    }
  }, [searchQuery, isOpen, getCustomers]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (customer: CustomerType) => {
    onSelect(customer);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = () => {
    onSelect(null);
    setSearchQuery("");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
        {type === "customer" ? "اختر العميل" : "اختر المورد"}
      </label>

      <div className="relative">
        <input
          type="text"
          placeholder={`ابحث بالكود أو الاسم أو رقم الموبايل...`}
          value={
            selectedCustomer
              ? `${selectedCustomer.code} - ${selectedCustomer.name}`
              : searchQuery
          }
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            if (selectedCustomer) onSelect(null);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pr-10 pl-10 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
        {selectedCustomer && (
          <button
            onClick={handleClear}
            className="absolute left-3 top-3 text-slate-400 hover:text-rose-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-slate-400">
              جاري التحميل...
            </div>
          ) : customers.length > 0 ? (
            <div className="py-2">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelect(customer)}
                  className="w-full px-4 py-3 text-right hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                          {customer.code}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {customer.name}
                        </span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            📱 {customer.phone}
                          </span>
                        </div>
                      )}
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">لا توجد نتائج</p>
              <p className="text-xs mt-1">جرب البحث بكلمات أخرى</p>
            </div>
          )}
        </div>
      )}

      {selectedCustomer && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">
                  {selectedCustomer.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedCustomer.name}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500">
                    <span className="font-mono font-medium">
                      {selectedCustomer.code}
                    </span>
                  </span>
                  {selectedCustomer.phone && (
                    <span className="text-xs text-slate-500">
                      📱 {selectedCustomer.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
              title="إزالة التحديد"
            >
              <X className="w-4 h-4 text-rose-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Transaction Details Modal ---
const TransactionModal = ({
  transaction,
  companySettings,
  onClose,
}: {
  transaction: TransactionType | null;
  companySettings: any;
  onClose: () => void;
}) => {
  if (!transaction) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                تفاصيل المعاملة
              </h3>
              <p className="text-sm text-slate-500">{transaction.documentId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                التاريخ
              </label>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {new Date(transaction.date).toLocaleDateString("ar-EG")}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                نوع الحركة
              </label>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  transaction.type === "فاتورة"
                    ? "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20"
                    : transaction.type === "سند قبض"
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20"
                      : transaction.type === "سند صرف"
                        ? "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20"
                        : "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-900/20"
                }`}
              >
                {transaction.type}
              </span>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                رقم المستند
              </label>
              <p className="text-sm font-mono text-slate-900 dark:text-white">
                {transaction.documentId}
              </p>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                البيان
              </label>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {transaction.description}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                طريقة الدفع
              </label>
              <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                {transaction.paymentMethod === "نقدي" && (
                  <Banknote className="w-4 h-4 text-emerald-600" />
                )}
                {transaction.paymentMethod === "بنك" && (
                  <Building2 className="w-4 h-4 text-blue-600" />
                )}
                {transaction.paymentMethod === "شيك" && (
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                )}
                {transaction.paymentMethod === "تحويل" && (
                  <CreditCard className="w-4 h-4 text-amber-600" />
                )}
                {transaction.paymentMethod}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">
              تفاصيل المبلغ
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {transaction.debit > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    مدين
                  </span>
                  <span className="text-lg font-bold text-emerald-600">
                    +{transaction.debit.toLocaleString("ar-EG")}{" "}
                    <span className="text-xs">{companySettings?.currencyCode || "ج.م"}</span>
                  </span>
                </div>
              )}
              {transaction.credit > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    دائن
                  </span>
                  <span className="text-lg font-bold text-rose-600">
                    -{transaction.credit.toLocaleString("ar-EG")}{" "}
                    <span className="text-xs">{companySettings?.currencyCode || "ج.م"}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            إغلاق
          </button>
          <button className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Printer className="w-4 h-4" /> طباعة
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
export default function AccountStatementPage() {
  const [reportType, setReportType] = useState<"customer" | "supplier">(
    "customer",
  );
  const [selectedEntity, setSelectedEntity] = useState<CustomerType | null>(
    null,
  );
  const [transactionTypeFilter, setTransactionTypeFilter] =
    useState<string>("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [displayTransactions, setDisplayTransactions] = useState<
    TransactionType[]
  >([]);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [companySettings, setCompanySettings] = useState<any>(null);
  const itemsPerPage = 10;

  const searchParams = useSearchParams();

  useEffect(() => {
    const customerId = searchParams.get("customerId");
    const supplierId = searchParams.get("supplierId");

    if (customerId) {
        setReportType("customer");
        getCustomerById(Number(customerId)).then(data => {
            if (data) setSelectedEntity(data);
        });
    } else if (supplierId) {
        setReportType("supplier");
        getSupplierById(Number(supplierId)).then(data => {
            if (data) setSelectedEntity(data);
        });
    }
  }, [searchParams]);

  useEffect(() => {
    getCompanySettingsAction().then(setCompanySettings);
  }, []);

  const loadTransactions = async () => {
    if (!selectedEntity) return;

    setIsLoading(true);
    try {
      const from = fromDate ? new Date(fromDate) : undefined;
      const to = toDate ? new Date(toDate) : undefined;

      let data: TransactionType[] = [];
      if (reportType === "customer") {
        data = await getCustomerTransactions(
          selectedEntity.id,
          from,
          to,
          transactionTypeFilter,
        );
      } else {
        data = await getSupplierTransactions(
          selectedEntity.id,
          from,
          to,
          transactionTypeFilter,
        );
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        data = data.filter(
          (tx) =>
            tx.documentId.toLowerCase().includes(query) ||
            (tx.description && tx.description.toLowerCase().includes(query)),
        );
      }

      const sortedAsc = [...data].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      let running = 0;
      const withRunning = sortedAsc.map((tx) => {
        running = running + tx.debit - tx.credit;
        return { ...tx, runningBalance: running };
      });

      const displayData = [...withRunning].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setDisplayTransactions(displayData);
    } catch (error) {
      toast.error("فشل تحميل المعاملات");
    } finally {
      setIsLoading(false);
    }
  };

  const { summary, stats } = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let invoicesTotal = 0;
    let receiptsTotal = 0;
    let paymentsTotal = 0;

    displayTransactions.forEach((tx) => {
      totalDebit += tx.debit;
      totalCredit += tx.credit;

      if (tx.type === "فاتورة") invoicesTotal += tx.debit;
      if (tx.type === "سند قبض") receiptsTotal += tx.credit;
      if (tx.type === "سند صرف") paymentsTotal += tx.debit;
    });

    const currentBalance =
      displayTransactions.length > 0
        ? displayTransactions[0].runningBalance!
        : 0;

    return {
      summary: {
        prev: 0,
        debit: totalDebit,
        credit: totalCredit,
        current: currentBalance,
      },
      stats: {
        count: displayTransactions.length,
        invoices: invoicesTotal,
        receipts: receiptsTotal,
        payments: paymentsTotal,
      },
    };
  }, [displayTransactions]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return displayTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [displayTransactions, currentPage]);

  const totalPages = Math.ceil(displayTransactions.length / itemsPerPage);

  useEffect(() => {
    setSelectedEntity(null);
    setDisplayTransactions([]);
  }, [reportType]);

  const handleApply = () => {
    loadTransactions();
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "نقدي":
        return <Banknote className="w-4 h-4 text-emerald-600" />;
      case "بنك":
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case "شيك":
        return <CheckCircle2 className="w-4 h-4 text-purple-600" />;
      case "تحويل":
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <div
      className="p-4 md:p-8 space-y-6 bg-slate-50/30 dark:bg-transparent min-h-screen rtl text-right print:bg-white"
      dir="rtl"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            كشف حساب تفصيلي
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            تحليل الحركات المالية والأرصدة التراكمية
            {selectedEntity && (
              <span className="mr-2 font-medium text-blue-600 dark:text-blue-400">
                - {selectedEntity.name} (كود: {selectedEntity.code})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" /> طباعة
          </button>
         
        </div>
      </div>

      {/* Print View is handled by PrintableStatement below */}

      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              نوع الحساب
            </label>
            <select
              value={reportType}
              onChange={(e) =>
                setReportType(e.target.value as "customer" | "supplier")
              }
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="customer">عميل</option>
              <option value="supplier">مورد</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <CustomerSearchDropdown
              type={reportType}
              selectedCustomer={selectedEntity}
              onSelect={setSelectedEntity}
              getCustomers={
                reportType === "customer" ? getCustomers : getSuppliers
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              نوع الحركة
            </label>
            <select
              value={transactionTypeFilter}
              onChange={(e) => setTransactionTypeFilter(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="الكل">الكل</option>
              <option value="فواتير">فواتير</option>
              <option value="سند قبض">سند قبض</option>
              <option value="سند صرف">سند صرف</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              بحث
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="رقم المستند أو البيان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleApply}
            className="w-full bg-slate-900 dark:bg-blue-600 text-white p-2.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all font-medium"
          >
            <Play className="w-4 h-4 fill-current" /> عرض التقرير
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              من تاريخ
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 print:hidden">
        {[
          {
            label: "الرصيد السابق",
            value: summary.prev,
            icon: History,
            color: "text-slate-600",
            bg: "bg-slate-100",
          },
          {
            label: "إجمالي المدين",
            value: summary.debit,
            icon: ArrowUpRight,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
          },
          {
            label: "إجمالي الدائن",
            value: summary.credit,
            icon: ArrowDownLeft,
            color: "text-rose-600",
            bg: "bg-rose-100",
          },
          {
            label: "الرصيد الحالي",
            value: summary.current,
            icon: Filter,
            color: "text-blue-600",
            bg: "bg-blue-100",
          },
          {
            label: "عدد الحركات",
            value: stats.count,
            icon: Activity,
            color: "text-purple-600",
            bg: "bg-purple-100",
            isCount: true,
          },
          {
            label: "إجمالي الفواتير",
            value: stats.invoices,
            icon: Receipt,
            color: "text-amber-600",
            bg: "bg-amber-100",
          },
          {
            label: reportType === "customer" ? "المقبوضات" : "المدفوعات",
            value: reportType === "customer" ? stats.receipts : stats.payments,
            icon: TrendingUp,
            color: "text-indigo-600",
            bg: "bg-indigo-100",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`p-2 rounded-lg ${item.bg} bg-opacity-50 dark:bg-opacity-10`}
              >
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                موجز
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {item.label}
            </p>
            <p className={`text-xl font-bold mt-1 ${item.color}`}>
              {item.isCount ? item.value : item.value.toLocaleString("ar-EG")}
              {!item.isCount && (
                <span className="text-xs font-normal"> {companySettings?.currencyCode || "ج.م"}</span>
              )}
            </p>
          </div>
        ))}
      </div>

     {/* Main Table Section */}
<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none">
  {isLoading ? (
    <TableSkeleton />
  ) : (
    <>
      {/* الجدول الأساسي (مع pagination) - يظهر في الشاشة فقط */}
      <div className="overflow-x-auto print:hidden">
        <table className="w-full text-right">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">التاريخ</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">النوع</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">رقم المستند</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">البيان</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">طريقة الدفع</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap text-left">مدين (+)</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap text-left">دائن (-)</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap sticky left-0 bg-slate-50 dark:bg-slate-800/50">الرصيد</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase print:hidden">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedRows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group">
                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {new Date(row.date).toLocaleDateString('ar-EG', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                    row.type === 'فاتورة' ? 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20' : 
                    row.type === 'سند قبض' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20' :
                    row.type === 'سند صرف' ? 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20' :
                    'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-900/20'
                  }`}>
                    {row.type}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm font-mono text-slate-500 tracking-tighter whitespace-nowrap">{row.documentId}</td>
                <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-[250px] truncate" title={row.description || ''}>{row.description}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {getPaymentIcon(row.paymentMethod)}
                    <span>{row.paymentMethod}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm font-bold text-emerald-600 text-left whitespace-nowrap">
                  {row.debit > 0 ? `+${row.debit.toLocaleString('ar-EG')}` : '—'}
                </td>
                <td className="px-4 py-4 text-sm font-bold text-rose-600 text-left whitespace-nowrap">
                  {row.credit > 0 ? `-${row.credit.toLocaleString('ar-EG')}` : '—'}
                </td>
                <td className="px-4 py-4 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50/50 dark:group-hover:bg-slate-800/40">
                  <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {row.runningBalance?.toLocaleString('ar-EG')}
                  </span>
                </td>
                <td className="px-4 py-4 print:hidden">
                  <button
                    onClick={() => setSelectedTransaction(row)}
                    className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group/btn"
                    title="عرض التفاصيل"
                  >
                    <Eye className="w-4 h-4 text-slate-400 group-hover/btn:text-blue-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 dark:bg-slate-800/70 border-t-2 border-slate-300 dark:border-slate-700">
            <tr className="font-bold">
              <td colSpan={5} className="px-4 py-4 text-sm text-slate-900 dark:text-white">الإجمالي الكلي</td>
              <td className="px-4 py-4 text-sm text-emerald-700 text-left">{summary.debit.toLocaleString('ar-EG')}</td>
              <td className="px-4 py-4 text-sm text-rose-700 text-left">{summary.credit.toLocaleString('ar-EG')}</td>
              <td className="px-4 py-4 sticky left-0 bg-slate-100 dark:bg-slate-800/70">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{summary.current.toLocaleString('ar-EG')}</span>
              </td>
              <td className="print:hidden"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Print View handled by component at the bottom */}

      {/* حالة عدم وجود بيانات */}
      {displayTransactions.length === 0 && !isLoading && (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 print:hidden">
          <History className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm">لا توجد حركات مالية مسجلة لهذه الفترة</p>
          <p className="text-xs text-slate-400 mt-1">جرب تغيير الفلاتر أو البحث</p>
        </div>
      )}

      {/* شريط التنقل بين الصفحات */}
      {displayTransactions.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 print:hidden">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            عرض <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> إلى{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, displayTransactions.length)}</span> من{' '}
            <span className="font-medium">{displayTransactions.length}</span> حركة
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === idx + 1
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )}
</div>

      {/* New Printable Version using Branding */}
      {selectedEntity && (
        <PrintableStatement
          title={`كشف حساب ${reportType === "customer" ? "عميل" : "مورد"}`}
          accountName={selectedEntity.name}
          accountInfo={`كود: ${selectedEntity.code}${selectedEntity.phone ? ` | موبايل: ${selectedEntity.phone}` : ""}`}
          fromDate={fromDate ? new Date(fromDate) : undefined}
          toDate={toDate ? new Date(toDate) : undefined}
          transactions={displayTransactions}
          openingBalance={summary.prev}
          companyName={companySettings?.companyName}
          companyNameEn={companySettings?.companyNameEn}
          companyLogo={companySettings?.companyLogo}
          companyStamp={companySettings?.companyStamp}
          showLogo={companySettings?.showLogoOnPrint}
          showStamp={companySettings?.showStampOnPrint}
        />
      )}

      <TransactionModal
        transaction={selectedTransaction}
        companySettings={companySettings}
        onClose={() => setSelectedTransaction(null)}
      />

      <style jsx global>{`
        /* ================================================================
           PRINT STYLES - نسخة محسّنة ومنظّمة
        ================================================================ */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            margin: 1.2cm 1.5cm;
            size: A4 portrait;
          }

          body {
            font-family: "Segoe UI", Tahoma, Arial, sans-serif;
            background: #fff !important;
            color: #1e293b !important;
          }

          /* إخفاء العناصر غير المطلوبة */
          .print\\:hidden {
            display: none !important;
          }

          /* إظهار عناصر الطباعة */
          .print\\:block {
            display: block !important;
          }

          /* ---- رأس الصفحة ---- */
          .print-header-bar {
            display: flex !important;
            align-items: center;
            gap: 16px;
            padding: 14px 18px;
            background: #1e3a5f !important;
            color: white !important;
            border-radius: 10px;
            margin-bottom: 14px;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            direction: rtl;
            font-size: 10pt;
            font-family: "Segoe UI", Tahoma, Arial, sans-serif;
          }
          .print-table th {
            background: #1e3a5f !important;
            color: white !important;
            padding: 8px 6px;
            text-align: right;
            font-weight: 700;
            white-space: nowrap;
          }
          .print-table td {
            padding: 6px;
            border-bottom: 1px solid #e2e8f0;
            text-align: right;
          }
          .print-table tbody tr:nth-child(even) {
            background: #f8fafc !important;
          }
          .print-table tbody tr:nth-child(odd) {
            background: white !important;
          }
          .print-table tfoot tr {
            background: #f0f4f8 !important;
            border-top: 2px solid #1e3a5f !important;
            font-weight: 700;
          }
          .print-type-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 9pt;
            font-weight: 600;
          }
          .print-invoice {
            background: #dbeafe !important;
            color: #1e40af !important;
            border: 1px solid #bfdbfe;
          }
          .print-receipt {
            background: #d1fae5 !important;
            color: #065f46 !important;
            border: 1px solid #a7f3d0;
          }
          .print-payment {
            background: #fef3c7 !important;
            color: #92400e !important;
            border: 1px solid #fde68a;
          }
          .print-return {
            background: #fee2e2 !important;
            color: #b91c1c !important;
            border: 1px solid #fecaca;
          }
          .print-debit {
            color: #047857 !important;
            font-weight: 600;
          }
          .print-credit {
            color: #b91c1c !important;
            font-weight: 600;
          }
          .print-balance {
            font-weight: 700;
            color: #1e293b !important;
          }

          .print-company-logo {
            width: 44px;
            height: 44px;
            background: rgba(255, 255, 255, 0.2) !important;
            border-radius: 50%;
            display: flex !important;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .print-company-initials {
            color: white !important;
            font-size: 18px;
            font-weight: 900;
          }

          .print-company-name {
            color: white !important;
            font-size: 18px;
            font-weight: 800;
            margin: 0;
          }

          .print-report-title {
            color: rgba(255, 255, 255, 0.8) !important;
            font-size: 12px;
            margin: 2px 0 0 0;
          }

          .print-header-meta {
            margin-right: auto;
            display: flex !important;
            flex-direction: column;
            gap: 5px;
            align-items: flex-end;
          }

          .print-meta-row {
            display: flex !important;
            align-items: center;
            gap: 8px;
          }

          .print-meta-label {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7) !important;
            background: rgba(255, 255, 255, 0.15) !important;
            padding: 2px 8px;
            border-radius: 20px;
          }

          .print-meta-value {
            font-size: 11px;
            font-weight: 700;
            color: white !important;
          }

          /* ---- بطاقة العميل/المورد ---- */
          .print-entity-card {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: #f8fafc !important;
            border: 1.5px solid #e2e8f0 !important;
            border-right: 4px solid #1e3a5f !important;
            border-radius: 8px;
            margin-bottom: 14px;
          }

          .print-entity-info {
            display: flex !important;
            align-items: center;
            gap: 12px;
          }

          .print-entity-avatar {
            width: 36px;
            height: 36px;
            background: #1e3a5f !important;
            color: white !important;
            border-radius: 50%;
            display: flex !important;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 800;
            flex-shrink: 0;
          }

          .print-entity-name {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a !important;
            margin: 0 0 4px 0;
          }

          .print-entity-details {
            display: flex !important;
            gap: 14px;
            font-size: 11px;
            color: #64748b !important;
          }

          .print-entity-details strong {
            color: #1e3a5f !important;
          }

          .print-period-info {
            display: flex !important;
            gap: 14px;
            font-size: 11px;
            color: #475569 !important;
          }

          .print-period-info strong {
            color: #1e3a5f !important;
          }

          /* ---- الجدول ---- */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            table-layout: fixed !important;
          }

          thead tr {
            background: #1e3a5f !important;
          }

          thead th {
            color: white !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            padding: 10px 12px !important;
            text-align: right !important;
            border: none !important;
            white-space: nowrap !important;
            overflow: hidden !important;
          }

          tbody tr:nth-child(even) {
            background: #f8fafc !important;
          }

          tbody tr:nth-child(odd) {
            background: #ffffff !important;
          }

          tbody td {
            font-size: 11px !important;
            color: #1e293b !important;
            padding: 9px 12px !important;
            border-bottom: 1px solid #f1f5f9 !important;
            vertical-align: middle !important;
            text-align: right !important;
            overflow: hidden !important;
            word-break: break-word !important;
          }

          tfoot tr {
            background: #f0f4f8 !important;
            border-top: 2.5px solid #1e3a5f !important;
          }

          tfoot td {
            font-size: 12px !important;
            font-weight: 700 !important;
            padding: 11px 12px !important;
            color: #0f172a !important;
            text-align: right !important;
          }

          /* ---- فوتر الصفحة ---- */
          .print-footer {
            margin-top: 20px;
          }

          .print-footer-line {
            height: 2px;
            background: #1e3a5f !important;
            margin-bottom: 8px;
            border-radius: 2px;
          }

          .print-footer-content {
            display: flex !important;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b !important;
          }
        }
      `}</style>
    </div>
  );
}
