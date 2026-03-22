"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, 
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
import { LedgerTable } from "@/components/accounting/LedgerTable";
import { LedgerPrintableStatement } from "@/components/accounting/LedgerPrintableStatement";
import { getAccountLedger } from "../../ledger/actions";
import { getCompanySettingsAction } from "../../settings/actions";

export default function TreasuryReportPage() {
  const [selectedSafe, setSelectedSafe] = useState<{ id: number; accountId: number; name: string } | null>(null);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [ledgerData, setLedgerData] = useState<{
    openingBalance: number;
    closingBalance: number;
    totalDebits: number;
    totalCredits: number;
    transactions: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const fetchTransactions = async () => {
    if (!selectedSafe) return;
    setIsLoading(true);
    try {
      const data = await getAccountLedger(
        selectedSafe.accountId,
        fromDate ? new Date(fromDate) : undefined,
        toDate ? new Date(toDate) : undefined
      );
      setLedgerData(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getCompanySettingsAction().then(setCompanySettings);
  }, []);

  useEffect(() => {
    if (selectedSafe) {
      fetchTransactions();
    }
  }, [selectedSafe, fromDate, toDate]);

  const stats = useMemo(() => {
    if (!ledgerData) return { totalDebit: 0, totalCredit: 0, currentBalance: 0 };
    return {
      totalDebit: ledgerData.totalDebits,
      totalCredit: ledgerData.totalCredits,
      currentBalance: ledgerData.closingBalance
    };
  }, [ledgerData]);

  return (
    <div className="flex flex-col gap-6 p-2 md:p-6 max-w-[1600px] mx-auto min-h-screen">
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
            تتبع الحركات المالية والتدفقات النقدية للخزائن
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

          {/* Type Filter - (Optional, can be hidden if ledger logic handles it) */}
          <div className="space-y-2 opacity-50 cursor-not-allowed">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-3 h-3" /> نوع الحركة
            </label>
            <div className="relative">
              <select
                disabled
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 appearance-none transition-all text-sm outline-none"
              >
                <option value="الكل">جميع الحركات</option>
              </select>
              <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {[
          { label: 'الرصيد السابق', value: ledgerData?.openingBalance || 0, icon: HistoryIcon, color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'إجمالي المدين', value: stats.totalDebit, icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'إجمالي الدائن', value: stats.totalCredit, icon: ArrowDownLeft, color: 'text-rose-600', bg: 'bg-rose-100' },
          { label: 'الرصيد الحالي', value: stats.currentBalance, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-100' },
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
              {item.value.toLocaleString('ar-EG')}
              <span className="text-xs font-normal"> {companySettings?.currencyCode || 'ج.م'}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Transactions Table */}
      {selectedSafe && ledgerData ? (
        <LedgerTable 
          transactions={ledgerData.transactions} 
          openingBalance={ledgerData.openingBalance}
          closingBalance={ledgerData.closingBalance}
          totalDebits={ledgerData.totalDebits}
          totalCredits={ledgerData.totalCredits}
        />
      ) : selectedSafe ? (
        <div className="py-20 text-center text-slate-400">جاري تحميل البيانات...</div>
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
      {selectedSafe && ledgerData && (
        <LedgerPrintableStatement 
          title="كشف حساب الخزنة"
          accountName={selectedSafe.name}
          accountCode="1101"
          fromDate={fromDate}
          toDate={toDate}
          openingBalance={ledgerData.openingBalance}
          closingBalance={ledgerData.closingBalance}
          totalDebits={ledgerData.totalDebits}
          totalCredits={ledgerData.totalCredits}
          transactions={ledgerData.transactions}
          companyName={companySettings?.companyName}
          companyNameEn={companySettings?.companyNameEn}
          companyLogo={companySettings?.companyLogo}
          companyStamp={companySettings?.companyStamp}
          showLogo={companySettings?.showLogoOnPrint}
          showStamp={companySettings?.showStampOnPrint}
          currency={companySettings?.currencyCode}
        />
      )}
    </div>
  );
}
