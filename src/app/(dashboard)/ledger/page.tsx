"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FolderTree, 
  Printer, 
  Calendar, 
  Search,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Activity,
  ChevronLeft,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { COASelector } from "./components/COASelector";
import { LedgerTable } from "./components/LedgerTable";
import { getAccountLedger } from "./actions";
import { getCompanySettingsAction } from "../settings/actions";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";
import { getSelectableAccounts } from "./actions";
import { LedgerPrintableStatement } from "@/components/accounting/LedgerPrintableStatement";

export default function LedgerExplorerPage() {
  const searchParams = useSearchParams();
  const queryAccountId = searchParams.get("accountId");
  
  const [selectedAccount, setSelectedAccount] = useState<{ 
    id: number; 
    name: string; 
    code: string;
    customer?: { id: number } | null;
    supplier?: { id: number } | null;
  } | null>(null);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    getCompanySettingsAction().then(setCompanySettings);
    
    // Auto-select account if provided in query
    if (queryAccountId) {
      getSelectableAccounts().then(accounts => {
        const found = accounts.find(a => a.id === parseInt(queryAccountId));
        if (found) setSelectedAccount(found);
      });
    }
  }, [queryAccountId]);

  const fetchLedger = async () => {
    if (!selectedAccount) return;
    setIsLoading(true);
    try {
      const res = await getAccountLedger(
        selectedAccount.id,
        fromDate ? new Date(fromDate) : undefined,
        toDate ? new Date(toDate) : undefined
      );
      setData(res);
    } catch (error) {
      console.error("Error fetching ledger:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      fetchLedger();
    }
  }, [selectedAccount, fromDate, toDate]);

  const router = useRouter();
  const currency = companySettings?.currencyCode || "ج.م";

  const summaryItems = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'رصيد أول المدة', value: data.openingBalance, icon: History, color: 'text-amber-600', bg: 'bg-amber-100' },
      { label: 'إجمالي المدين', value: data.totalDebits, icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-100' },
      { label: 'إجمالي الدائن', value: data.totalCredits, icon: ArrowDownLeft, color: 'text-rose-600', bg: 'bg-rose-100' },
      { label: 'رصيد الإقفال', value: data.closingBalance, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-100' },
    ];
  }, [data]);

  const isSpecializedAccount = selectedAccount?.code.startsWith('1101') || selectedAccount?.code.startsWith('1102');
  const isEntityAccount = selectedAccount?.customer || selectedAccount?.supplier;

  const specializedUrl = selectedAccount?.code.startsWith('1101') ? '/reports/treasury' : '/reports/banks';
  const entityUrl = selectedAccount?.customer 
    ? `/reports?customerId=${selectedAccount.customer.id}` 
    : `/reports?supplierId=${selectedAccount?.supplier?.id}`;

  return (
    <>
      <Navbar title="سجل المعاملات التفصيلي" />
      <div className="flex-1 p-4 md:p-8 space-y-8 bg-slate-50/30 dark:bg-transparent min-h-screen" dir="rtl">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-l from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                <FolderTree className="w-7 h-7" />
              </div>
              مستعرض دفتر الأستاذ
            </h1>
            <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary/60" />
              تتبع الحركة التفصيلية وميزان المراجعة لكل حساب
            </p>
          </div>

          <div className="flex items-center gap-4">
            {isSpecializedAccount && (
              <Button 
                onClick={() => router.push(specializedUrl)} 
                variant="outline"
                className="h-12 px-6 gap-2 font-bold border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 transition-all rounded-xl shadow-sm"
              >
                <ArrowUpRight className="w-5 h-5" />
                فتح الكشف المخصص
              </Button>
            )}
            {isEntityAccount && (
              <Button 
                onClick={() => router.push(entityUrl)} 
                variant="outline"
                className="h-12 px-6 gap-2 font-bold border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-all rounded-xl shadow-sm"
              >
                <ArrowUpRight className="w-5 h-5" />
                فتح كشف الحساب التفصيلي
              </Button>
            )}
            <Button 
              onClick={() => window.print()} 
              disabled={!selectedAccount || isLoading}
              className="h-12 px-6 gap-2 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-xl"
            >
              <Printer className="w-5 h-5" />
              طباعة كشف الحساب
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Account Selector */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Search className="w-3 h-3" /> الحساب المحاسبي
              </label>
              <COASelector 
                onSelect={(acc) => setSelectedAccount(acc)} 
                selectedId={selectedAccount?.id} 
              />
            </div>

            {/* From Date */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" /> من تاريخ
              </label>
              <div className="relative group">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm outline-none font-medium"
                />
              </div>
            </div>

            {/* To Date */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" /> إلى تاريخ
              </label>
              <div className="relative group">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm outline-none font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Bar */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            {summaryItems.map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("p-2.5 rounded-xl bg-opacity-10 dark:bg-opacity-20", item.bg)}>
                    <item.icon className={cn("w-5 h-5", item.color)} />
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-100" />
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">{item.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn("text-2xl font-black", item.color)}>
                    {item.value.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{currency}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Content (Table) */}
        {selectedAccount ? (
          <LedgerTable 
            transactions={data?.transactions || []} 
            openingBalance={data?.openingBalance || 0} 
            isLoading={isLoading} 
          />
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 py-32 flex flex-col items-center justify-center gap-6 text-center shadow-inner print:hidden">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-3xl flex items-center justify-center text-slate-200 dark:text-slate-700 animate-pulse">
              <FolderTree className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">بانتظار اختيار الحساب</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto font-medium">قم باختيار حساب من شجرة الحسابات لعرض دفتر الأستاذ التفصيلي والحركات المالية</p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <div className="w-2 h-2 rounded-full bg-primary/20" />
              <div className="w-2 h-2 rounded-full bg-primary/40" />
              <div className="w-2 h-2 rounded-full bg-primary/60" />
            </div>
          </div>
        )}

        {/* Print Only Header (Simple & Professional) */}
        {selectedAccount && data && (
          <LedgerPrintableStatement
            title="كشف دفتر الأستاذ"
            accountName={selectedAccount.name}
            accountCode={selectedAccount.code}
            fromDate={fromDate}
            toDate={toDate}
            openingBalance={data.openingBalance}
            closingBalance={data.closingBalance}
            totalDebits={data.totalDebits}
            totalCredits={data.totalCredits}
            transactions={data.transactions}
            companyName={companySettings?.companyName}
            companyNameEn={companySettings?.companyNameEn}
            companyLogo={companySettings?.companyLogo}
            companyStamp={companySettings?.companyStamp}
            showLogo={companySettings?.showLogoOnPrint}
            showStamp={companySettings?.showStampOnPrint}
            currency={currency}
          />
        )}

      </div>
    </>
  );
}
