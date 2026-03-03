"use client";

import React, { useState, useEffect } from "react";
import { 
  Printer, 
  Calendar, 
  Filter,
  Search,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  History as HistoryIcon,
  Navigation
} from "lucide-react";
import { AccountSearchDropdown } from "../components/AccountSearchDropdown";
import { LedgerTable } from "../components/LedgerTable";
import { PrintableStatement } from "../components/PrintableStatement";
import { getAccountTransactions } from "../actions";
import { getCompanySettingsAction } from "../../settings/actions";
import type { TransactionType } from "../actions";

export default function BankReportPage() {
  const [selectedBank, setSelectedBank] = useState<{ id: number; name: string; accountNumber?: string | null } | null>(null);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [transactionType, setTransactionType] = useState<string>("الكل");
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);

  const fetchTransactions = async () => {
    if (!selectedBank) return;
    setIsLoading(true);
    try {
      const data = await getAccountTransactions(
        selectedBank.id,
        "bank",
        fromDate ? new Date(fromDate) : undefined,
        toDate ? new Date(toDate) : undefined,
        transactionType
      );
      setTransactions(data.transactions);
      setOpeningBalance(data.openingBalance);
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
    if (selectedBank) {
      fetchTransactions();
    }
  }, [selectedBank, fromDate, toDate, transactionType]);

  const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
  const currentBalance = openingBalance + totalDebit - totalCredit;

  return (
    <div className="flex flex-col gap-6 p-2 md:p-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            كشف حساب البنوك
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            متابعة حركات الحسابات البنكية والإيداعات والتحويلات
          </p>
        </div>

        <button
          onClick={() => window.print()}
          disabled={!selectedBank}
          className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-4 h-4" /> طباعة التقرير
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Bank Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Search className="w-3 h-3" /> البنك
            </label>
            <AccountSearchDropdown 
              type="bank" 
              onSelect={(acc) => setSelectedBank(acc ? { id: acc.id, name: acc.name, accountNumber: acc.accountNumber } : null)} 
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
      {selectedBank && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
              <HistoryIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">الرصيد الافتتاحي</p>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{openingBalance.toLocaleString('ar-EG')}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">إجمالي الإيداعات</p>
              <h3 className="text-lg font-black text-emerald-600">{totalDebit.toLocaleString('ar-EG')}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/10 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">إجمالي السحوبات</p>
              <h3 className="text-lg font-black text-rose-600">{totalCredit.toLocaleString('ar-EG')}</h3>
            </div>
          </div>

          <div className="bg-indigo-600 p-5 rounded-2xl flex items-center gap-4 shadow-xl shadow-indigo-500/10 transition-transform hover:scale-[1.02]">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">الرصيد الحالي</p>
              <h3 className="text-lg font-black text-white">{currentBalance.toLocaleString('ar-EG')}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {selectedBank ? (
        <LedgerTable 
          transactions={transactions} 
          openingBalance={openingBalance} 
          isLoading={isLoading} 
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 py-32 flex flex-col items-center justify-center gap-4 text-center print:hidden">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300">
            <Landmark className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">بانتظار اختيار البنك</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">قم باختيار البنك وتحديد الفترة الزمنية لعرض كشف الحساب التفصيلي</p>
          </div>
        </div>
      )}

      {/* Printable Version */}
      {selectedBank && (
        <PrintableStatement
          title="كشف حساب بنك"
          accountName={selectedBank.name}
          accountInfo={selectedBank.accountNumber ? `رقم الحساب: ${selectedBank.accountNumber}` : undefined}
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
    </div>
  );
}
