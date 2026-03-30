"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Printer, 
  Calendar, 
  Filter,
  Search,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  History as HistoryIcon,
  Activity,
  Receipt,
  TrendingUp
} from "lucide-react";
import { AccountSearchDropdown } from "../components/AccountSearchDropdown";
import { LedgerTable } from "../components/LedgerTable";
import { PrintableStatement } from "../components/PrintableStatement";
import { TransactionModal } from "../components/TransactionModal";
import { getAccountLedger } from "../../ledger/actions";
import { getCompanySettingsAction } from "../../settings/actions";
import type { TransactionType } from "../actions";
import { useSearchParams } from "next/navigation";

export default function TreasuryReportPage() {
  const searchParams = useSearchParams();
  const [selectedSafe, setSelectedSafe] = useState<{ id: number; accountId: number; name: string } | null>(null);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [transactionType, setTransactionType] = useState<string>("الكل");
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionType | null>(null);

  const fetchTransactions = async () => {
    if (!selectedSafe) return;
    setIsLoading(true);
    try {
      const data = await getAccountLedger(
        selectedSafe.accountId,
        fromDate ? new Date(fromDate) : undefined,
        toDate ? new Date(toDate) : undefined,
        true
      );
      setTransactions(data.transactions.map(t => ({
        id: String(t.id),
        date: t.date,
        createdAt: t.createdAt || t.date, 
        type: t.sourceType === 'MANUAL' ? 'قيد يدوي' : (t.sourceType || 'قيد'),
        documentId: t.entryNumber ? `JE-${String(t.entryNumber).padStart(4, "0")}` : '',
        description: t.description || '',
        paymentMethod: 'نقدي',
        debit: t.debit,
        credit: t.credit,
        runningBalance: t.balance
      })));
      setOpeningBalance(data.openingBalance);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getCompanySettingsAction().then(setCompanySettings);

    const safeId = searchParams.get("safeId");
    const accountId = searchParams.get("accountId");
    const name = searchParams.get("name");

    if (safeId && accountId && name) {
      setSelectedSafe({
        id: Number(safeId),
        accountId: Number(accountId),
        name: decodeURIComponent(name),
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedSafe) {
      fetchTransactions();
    }
  }, [selectedSafe, fromDate, toDate, transactionType]);

  const { totalDebit, totalCredit, currentBalance, receiptsTotal, paymentsTotal } = useMemo(() => {
    let totalDebit = 0, totalCredit = 0, receiptsTotal = 0, paymentsTotal = 0;
    transactions.forEach(t => {
      totalDebit += t.debit;
      totalCredit += t.credit;
      if (t.type === 'سند قبض') receiptsTotal += t.debit;
      if (t.type === 'سند صرف') paymentsTotal += t.credit;
    });
    return { totalDebit, totalCredit, currentBalance: openingBalance + totalDebit - totalCredit, receiptsTotal, paymentsTotal };
  }, [transactions, openingBalance]);

  return (
    <div className="flex flex-col gap-6 p-2 md:p-6 max-w-[1600px] mx-auto min-h-screen rtl lg:text-right" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            كشف حساب الخزنة
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            متابعة حركات الحسابات النقدية والتدفقات المالية
          </p>
        </div>

        <button
          onClick={() => window.print()}
          disabled={!selectedSafe}
          className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-4 h-4" /> طباعة التقرير
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Safe Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Search className="w-3 h-3" /> الخزنة
            </label>
            <AccountSearchDropdown 
              type="safe" 
              onSelect={(acc) => {
                if (acc && acc.accountId) {
                  setSelectedSafe({ id: acc.id, accountId: acc.accountId, name: acc.name });
                } else {
                  setSelectedSafe(null);
                }
              }} 
            />
          </div>

          {/* Date Filters */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3 h-3" /> من تاريخ
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3 h-3" /> إلى تاريخ
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none"
            />
          </div>

          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-3 h-3" /> نوع الحركة
            </label>
            <div className="relative">
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 appearance-none transition-all text-sm outline-none"
              >
                <option value="الكل">جميع الحركات</option>
                <option value="سند قبض">إيداعات (قبض)</option>
                <option value="سند صرف">سحوبات (صرف)</option>
                <option value="تحويل صادر">تحويلات صادرة</option>
                <option value="تحويل وارد">تحويلات واردة</option>
                <option value="مرتجع">مرتجعات</option>
              </select>
              <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 print:hidden">
        {[
          { label: 'الرصيد السابق', value: openingBalance, icon: HistoryIcon, color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'إجمالي المدين', value: totalDebit, icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'إجمالي الدائن', value: totalCredit, icon: ArrowDownLeft, color: 'text-rose-600', bg: 'bg-rose-100' },
          { label: 'الرصيد الحالي', value: currentBalance, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'عدد الحركات', value: transactions.length, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100', isCount: true },
          { label: 'إيداعات (قبض)', value: receiptsTotal, icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'سحوبات (صرف)', value: paymentsTotal, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${item.bg} bg-opacity-50 dark:bg-opacity-10`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">موجز</span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className={`text-xl font-bold mt-1 ${item.color}`}>
              {item.isCount ? item.value : item.value.toLocaleString('ar-EG')}
              {!item.isCount && <span className="text-xs font-normal"> {companySettings?.currencyCode || 'ج.م'}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Transactions Table */}
      {selectedSafe ? (
        <LedgerTable 
          transactions={transactions} 
          openingBalance={openingBalance} 
          isLoading={isLoading}
          onViewDetails={setSelectedTransaction}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 py-32 flex flex-col items-center justify-center gap-4 text-center print:hidden">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300">
            <Wallet className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">بانتظار اختيار الخزنة</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">قم باختيار الخزنة وتحديد الفترة الزمنية لعرض كشف الحساب التفصيلي</p>
          </div>
        </div>
      )}

      {/* Printable Version */}
      {selectedSafe && (
        <PrintableStatement
          title="كشف حساب خزنة"
          accountName={selectedSafe.name}
          accountInfo={undefined}
          fromDate={fromDate ? new Date(fromDate) : undefined}
          toDate={toDate ? new Date(toDate) : undefined}
          transactions={transactions}
          openingBalance={openingBalance}
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
    </div>
  );
}
