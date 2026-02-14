'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, Printer, FileSpreadsheet, 
  Play, Filter, ArrowUpRight, 
  ArrowDownLeft, History, FileText,
  Eye, X, Receipt, CreditCard,
  Banknote, Building2, CheckCircle2,
  TrendingUp, TrendingDown, Activity,
  ChevronLeft, ChevronRight
} from 'lucide-react';

// --- Types ---
type TransactionType = 'فاتورة' | 'سند قبض' | 'سند صرف' | 'مرتجع';
type PaymentMethod = 'نقدي' | 'بنك' | 'شيك' | 'تحويل';

interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  type: 'customer' | 'supplier';
}

interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  documentId: string;
  referenceId?: string;
  description: string;
  paymentMethod: PaymentMethod;
  debit: number;
  credit: number;
}

// --- Mock Data ---
const MOCK_CUSTOMERS: Customer[] = [
  { id: '1', code: 'C-001', name: 'أحمد محمد علي', phone: '01012345678', type: 'customer' },
  { id: '2', code: 'C-002', name: 'شركة النور للتجارة', phone: '01023456789', type: 'customer' },
  { id: '3', code: 'C-003', name: 'محمود حسن إبراهيم', phone: '01034567890', type: 'customer' },
  { id: '4', code: 'S-001', name: 'شركة الأمل للمقاولات', phone: '01045678901', type: 'supplier' },
  { id: '5', code: 'S-002', name: 'مؤسسة الفجر التجارية', phone: '01056789012', type: 'supplier' },
  { id: '6', code: 'C-004', name: 'سارة أحمد محمد', phone: '01067890123', type: 'customer' },
  { id: '7', code: 'S-003', name: 'علي حسين للتوريدات', phone: '01078901234', type: 'supplier' },
];

const MOCK_DATA: Transaction[] = [
  { id: '1', date: '2026-02-01', type: 'فاتورة', documentId: 'INV-5501', referenceId: 'REF-001', description: 'تقديم خدمات استشارية تقنية', paymentMethod: 'تحويل', debit: 15000, credit: 0 },
  { id: '2', date: '2026-02-05', type: 'سند قبض', documentId: 'REC-202', description: 'دفعة نقدية من الحساب', paymentMethod: 'نقدي', debit: 0, credit: 5000 },
  { id: '3', date: '2026-02-10', type: 'سند صرف', documentId: 'PAY-110', referenceId: 'REF-002', description: 'رد مبالغ تأمين للمشروع', paymentMethod: 'بنك', debit: 2000, credit: 0 },
  { id: '4', date: '2026-02-12', type: 'مرتجع', documentId: 'RET-09', description: 'مرتجع خدمات غير مكتملة', paymentMethod: 'نقدي', debit: 0, credit: 1500 },
  { id: '5', date: '2026-02-14', type: 'فاتورة', documentId: 'INV-5502', description: 'خدمات صيانة دورية', paymentMethod: 'شيك', debit: 8000, credit: 0 },
  { id: '6', date: '2026-02-15', type: 'سند قبض', documentId: 'REC-203', description: 'تحصيل مستحقات', paymentMethod: 'بنك', debit: 0, credit: 3000 },
];

// --- Loading Skeleton Component ---
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
  onSelect 
}: { 
  type: 'customer' | 'supplier';
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Filter customers based on type and search query
  const filteredCustomers = useMemo(() => {
    return MOCK_CUSTOMERS
      .filter(c => c.type === type)
      .filter(c => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          c.code.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          c.phone.includes(query)
        );
      });
  }, [type, searchQuery]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
        {type === 'customer' ? 'اختر العميل' : 'اختر المورد'}
      </label>
      
      {/* Selected Customer Display / Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder={`ابحث بالكود أو الاسم أو رقم الموبايل...`}
          value={selectedCustomer ? `${selectedCustomer.code} - ${selectedCustomer.name}` : searchQuery}
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

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-y-auto">
          {filteredCustomers.length > 0 ? (
            <div className="py-2">
              {filteredCustomers.map((customer) => (
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
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          📱 {customer.phone}
                        </span>
                      </div>
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

      {/* Selected Customer Info Card */}
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
                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedCustomer.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500">
                    <span className="font-mono font-medium">{selectedCustomer.code}</span>
                  </span>
                  <span className="text-xs text-slate-500">📱 {selectedCustomer.phone}</span>
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
const TransactionModal = ({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) => {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">تفاصيل المعاملة</h3>
              <p className="text-sm text-slate-500">{transaction.documentId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">التاريخ</label>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{transaction.date}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">نوع الحركة</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                transaction.type === 'فاتورة' ? 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20' : 
                transaction.type === 'سند قبض' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20' :
                transaction.type === 'سند صرف' ? 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20' :
                'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-900/20'
              }`}>
                {transaction.type}
              </span>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">رقم المستند</label>
              <p className="text-sm font-mono text-slate-900 dark:text-white">{transaction.documentId}</p>
            </div>
            {transaction.referenceId && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">الرقم المرجعي</label>
                <p className="text-sm font-mono text-slate-900 dark:text-white">{transaction.referenceId}</p>
              </div>
            )}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">البيان</label>
              <p className="text-sm text-slate-700 dark:text-slate-300">{transaction.description}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">طريقة الدفع</label>
              <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                {transaction.paymentMethod === 'نقدي' && <Banknote className="w-4 h-4 text-emerald-600" />}
                {transaction.paymentMethod === 'بنك' && <Building2 className="w-4 h-4 text-blue-600" />}
                {transaction.paymentMethod === 'شيك' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                {transaction.paymentMethod === 'تحويل' && <CreditCard className="w-4 h-4 text-amber-600" />}
                {transaction.paymentMethod}
              </p>
            </div>
          </div>

          {/* Amount Details */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">تفاصيل المبلغ</h4>
            <div className="grid grid-cols-2 gap-4">
              {transaction.debit > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">مدين</span>
                  <span className="text-lg font-bold text-emerald-600">
                    +{transaction.debit.toLocaleString('ar-EG')} <span className="text-xs">ج.م</span>
                  </span>
                </div>
              )}
              {transaction.credit > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">دائن</span>
                  <span className="text-lg font-bold text-rose-600">
                    -{transaction.credit.toLocaleString('ar-EG')} <span className="text-xs">ج.م</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-6 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
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
  const [reportType, setReportType] = useState<'customer' | 'supplier'>('customer');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const initialBalance = 25000;

  // Reset selected customer when report type changes
  React.useEffect(() => {
    setSelectedCustomer(null);
  }, [reportType]);

  // Filter and calculate data
  const { filteredData, tableRows, summary, stats } = useMemo(() => {
    let filtered = MOCK_DATA;

    // Filter by transaction type
    if (transactionTypeFilter !== 'الكل') {
      const typeMap: Record<string, TransactionType> = {
        'فواتير': 'فاتورة',
        'سند قبض': 'سند قبض',
        'سند صرف': 'سند صرف',
        'مرتجعات': 'مرتجع'
      };
      filtered = filtered.filter(tx => tx.type === typeMap[transactionTypeFilter]);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.documentId.toLowerCase().includes(query) ||
        tx.description.toLowerCase().includes(query) ||
        (tx.referenceId && tx.referenceId.toLowerCase().includes(query))
      );
    }

    // Calculate running balances and totals
    let currentRunning = initialBalance;
    let totalDebit = 0;
    let totalCredit = 0;
    let invoicesTotal = 0;
    let receiptsTotal = 0;
    let paymentsTotal = 0;

    const rows = filtered.map((tx) => {
      currentRunning = currentRunning + tx.debit - tx.credit;
      totalDebit += tx.debit;
      totalCredit += tx.credit;
      
      if (tx.type === 'فاتورة') invoicesTotal += tx.debit;
      if (tx.type === 'سند قبض') receiptsTotal += tx.credit;
      if (tx.type === 'سند صرف') paymentsTotal += tx.debit;

      return { ...tx, runningBalance: currentRunning };
    });

    return {
      filteredData: filtered,
      tableRows: rows,
      summary: {
        prev: initialBalance,
        debit: totalDebit,
        credit: totalCredit,
        current: currentRunning
      },
      stats: {
        count: filtered.length,
        invoices: invoicesTotal,
        receipts: receiptsTotal,
        payments: paymentsTotal
      }
    };
  }, [transactionTypeFilter, searchQuery]);

  // Pagination
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return tableRows.slice(startIndex, startIndex + itemsPerPage);
  }, [tableRows, currentPage]);

  const totalPages = Math.ceil(tableRows.length / itemsPerPage);

  // Payment method icon helper
  const getPaymentIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'نقدي': return <Banknote className="w-4 h-4 text-emerald-600" />;
      case 'بنك': return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'شيك': return <CheckCircle2 className="w-4 h-4 text-purple-600" />;
      case 'تحويل': return <CreditCard className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50/30 dark:bg-transparent min-h-screen rtl text-right print:bg-white" dir="rtl">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 print:border-slate-400">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 print:text-black">
            <FileText className="w-7 h-7 text-blue-600 print:hidden" />
            كشف حساب تفصيلي
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm print:text-slate-700">
            تحليل الحركات المالية والأرصدة التراكمية
            {selectedCustomer && (
              <span className="mr-2 font-medium text-blue-600 dark:text-blue-400">
                - {selectedCustomer.name} ({selectedCustomer.code})
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2 print:hidden">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" /> طباعة
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 dark:shadow-none">
            <FileSpreadsheet className="w-4 h-4" /> تصدير Excel
          </button>
        </div>
      </div>

      {/* Print Header (Hidden on screen) */}
      <div className="hidden print:block border-b border-slate-300 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">شركة المحاسبة الحديثة</h2>
            <p className="text-sm text-slate-600">كشف حساب تفصيلي</p>
            {selectedCustomer && (
              <p className="text-sm font-medium mt-1">
                {reportType === 'customer' ? 'العميل' : 'المورد'}: {selectedCustomer.name} - {selectedCustomer.code}
              </p>
            )}
          </div>
          <div className="text-left text-sm">
            <p><strong>التاريخ:</strong> {new Date().toLocaleDateString('ar-EG')}</p>
            <p><strong>نوع الحساب:</strong> {reportType === 'customer' ? 'عميل' : 'مورد'}</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">نوع الحساب</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'customer' | 'supplier')}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="customer">عميل</option>
              <option value="supplier">مورد</option>
            </select>
          </div>

          {/* Customer/Supplier Search Dropdown */}
          <div className="lg:col-span-2">
            <CustomerSearchDropdown 
              type={reportType}
              selectedCustomer={selectedCustomer}
              onSelect={setSelectedCustomer}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">نوع الحركة</label>
            <select 
              value={transactionTypeFilter}
              onChange={(e) => setTransactionTypeFilter(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="الكل">الكل</option>
              <option value="فواتير">فواتير</option>
              <option value="سند قبض">سند قبض</option>
              <option value="سند صرف">سند صرف</option>
              <option value="مرتجعات">مرتجعات</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">بحث</label>
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

          <button className="w-full bg-slate-900 dark:bg-blue-600 text-white p-2.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all font-medium">
            <Play className="w-4 h-4 fill-current" /> عرض التقرير
          </button>
        </div>

        {/* Date Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">من تاريخ</label>
            <input type="date" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">إلى تاريخ</label>
            <input type="date" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 print:grid-cols-7">
        {[
          { label: 'الرصيد السابق', value: summary.prev, icon: History, color: 'text-slate-600', bg: 'bg-slate-100', darkBg: 'dark:bg-slate-800' },
          { label: 'إجمالي المدين', value: summary.debit, icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-900/20' },
          { label: 'إجمالي الدائن', value: summary.credit, icon: ArrowDownLeft, color: 'text-rose-600', bg: 'bg-rose-100', darkBg: 'dark:bg-rose-900/20' },
          { label: 'الرصيد الحالي', value: summary.current, icon: Filter, color: 'text-blue-600', bg: 'bg-blue-100', darkBg: 'dark:bg-blue-900/20' },
          { label: 'عدد الحركات', value: stats.count, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100', darkBg: 'dark:bg-purple-900/20', isCount: true },
          { label: 'إجمالي الفواتير', value: stats.invoices, icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/20' },
          { label: 'المقبوضات/المدفوعات', value: stats.receipts + stats.payments, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100', darkBg: 'dark:bg-indigo-900/20' },
        ].map((item, idx) => (
          <div key={idx} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow print:shadow-none print:border-slate-300`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${item.bg} ${item.darkBg} bg-opacity-50 dark:bg-opacity-10 print:bg-opacity-20`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest print:hidden">موجز</span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 print:text-slate-600">{item.label}</p>
            <p className={`text-xl font-bold mt-1 ${item.color} print:text-black`}>
              {item.isCount ? item.value : item.value.toLocaleString('ar-EG')} 
              {!item.isCount && <span className="text-xs font-normal"> ج.م</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Main Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden print:shadow-none print:border-slate-300">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 print:bg-slate-100">
                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">التاريخ</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">النوع</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">رقم المستند</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">رقم مرجعي</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase">البيان</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">طريقة الدفع</th>
                    <th className="px-4 py-4 text-xs font-bold text-emerald-600 uppercase whitespace-nowrap">مدين (+)</th>
                    <th className="px-4 py-4 text-xs font-bold text-rose-600 uppercase whitespace-nowrap">دائن (-)</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-900 dark:text-white uppercase whitespace-nowrap sticky left-0 bg-slate-50 dark:bg-slate-800/50 print:bg-slate-100">الرصيد التراكمي</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase print:hidden">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                  {paginatedRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group print:hover:bg-transparent">
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap print:text-black">{row.date}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                          row.type === 'فاتورة' ? 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 print:bg-blue-100' : 
                          row.type === 'سند قبض' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 print:bg-emerald-100' :
                          row.type === 'سند صرف' ? 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20 print:bg-amber-100' :
                          'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-900/20 print:bg-rose-100'
                        }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-mono text-slate-500 tracking-tighter whitespace-nowrap print:text-black">{row.documentId}</td>
                      <td className="px-4 py-4 text-sm font-mono text-slate-400 tracking-tighter whitespace-nowrap print:text-slate-600">{row.referenceId || '—'}</td>
                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-[250px] truncate print:text-black" title={row.description}>{row.description}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap print:text-black">
                          {getPaymentIcon(row.paymentMethod)}
                          <span className="print:inline">{row.paymentMethod}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-emerald-600 text-left whitespace-nowrap print:text-emerald-700">
                        {row.debit > 0 ? `+${row.debit.toLocaleString('ar-EG')}` : '—'}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-rose-600 text-left whitespace-nowrap print:text-rose-700">
                        {row.credit > 0 ? `-${row.credit.toLocaleString('ar-EG')}` : '—'}
                      </td>
                      <td className="px-4 py-4 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50/50 dark:group-hover:bg-slate-800/40 print:bg-white print:group-hover:bg-transparent">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap print:text-black">
                            {row.runningBalance.toLocaleString('ar-EG')}
                          </span>
                          <span className="text-[10px] text-slate-400 print:hidden">الرصيد الصافي</span>
                        </div>
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
                {/* Footer Row */}
                <tfoot className="bg-slate-100 dark:bg-slate-800/70 border-t-2 border-slate-300 dark:border-slate-700 print:bg-slate-100">
                  <tr className="font-bold">
                    <td colSpan={6} className="px-4 py-4 text-sm text-slate-900 dark:text-white print:text-black">
                      الإجمالي
                    </td>
                    <td className="px-4 py-4 text-sm text-emerald-700 text-left print:text-emerald-800">
                      +{summary.debit.toLocaleString('ar-EG')}
                    </td>
                    <td className="px-4 py-4 text-sm text-rose-700 text-left print:text-rose-800">
                      -{summary.credit.toLocaleString('ar-EG')}
                    </td>
                    <td className="px-4 py-4 sticky left-0 bg-slate-100 dark:bg-slate-800/70 print:bg-slate-100">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-white print:text-black">
                          {summary.current.toLocaleString('ar-EG')}
                        </span>
                        <span className="text-[10px] text-slate-500 print:hidden">الرصيد النهائي</span>
                      </div>
                    </td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Empty State */}
            {tableRows.length === 0 && (
              <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                <History className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">لا توجد حركات مالية مسجلة لهذه الفترة</p>
                <p className="text-xs text-slate-400 mt-1">جرب تغيير الفلاتر أو البحث</p>
              </div>
            )}

            {/* Pagination */}
            {tableRows.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 print:hidden">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  عرض <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> إلى{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, tableRows.length)}</span> من{' '}
                  <span className="font-medium">{tableRows.length}</span> حركة
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

      {/* Transaction Details Modal */}
      <TransactionModal transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 1cm;
            size: A4 landscape;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:grid-cols-7 {
            grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
    </div>
  );
}