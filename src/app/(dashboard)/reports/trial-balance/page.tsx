"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { TrialBalanceTable } from "@/components/accounting/TrialBalanceTable";
import { getTrialBalance } from "./actions";
import { 
  BarChart3, 
  Calendar, 
  Filter,
  RefreshCw,
  Search,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCompanySettingsAction } from "../../settings/actions";
import { cn } from "@/lib/utils";

export default function TrialBalancePage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [hideZeroBalance, setHideZeroBalance] = useState<boolean>(true);
  const [companySettings, setCompanySettings] = useState<any>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await getTrialBalance(new Date(startDate), new Date(endDate));
      setData(res);
    } catch (error) {
      console.error("Error fetching trial balance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    getCompanySettingsAction().then(setCompanySettings);
  }, []);

  return (
    <>
      <Navbar title="ميزان المراجعة" />
      <div className="flex-1 p-4 md:p-8 space-y-8 bg-slate-50/30 dark:bg-transparent min-h-screen" dir="rtl">
        
        {/* Print Header (Hidden on Screen) */}
        <div className="hidden print:block space-y-8 bg-white text-black p-8 text-center border-b-4 border-slate-900 mb-10">
          <div className="flex flex-col items-center gap-4">
             {companySettings?.companyLogo && (
               <img src={companySettings.companyLogo} alt="Logo" className="h-20 w-auto" />
             )}
             <h1 className="text-4xl font-black uppercase tracking-tighter">{companySettings?.companyName || "اسم الشركة"}</h1>
             <div className="h-1 w-20 bg-primary mx-auto" />
             <h2 className="text-2xl font-bold mt-4">تقرير ميزان المراجعة التحليلي</h2>
             <p className="text-slate-500 font-bold">للفترة من {new Date(startDate).toLocaleDateString("ar-EG")} إلى {new Date(endDate).toLocaleDateString("ar-EG")}</p>
          </div>
        </div>

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-l from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                <BarChart3 className="w-7 h-7" />
              </div>
              ميزان المراجعة (Trial Balance)
            </h1>
            <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
              <RefreshCw className="w-3 h-3 text-primary" />
              تحديث تلقائي للأرصدة بناءً على جميع قيود اليومية
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="relative group flex items-center gap-3">
              <span className="text-base font-bold text-slate-600">من:</span>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-14 pr-12 pl-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-primary/20 shadow-sm font-bold w-56 text-lg"
                />
              </div>
            </div>
            <div className="relative group flex items-center gap-3">
              <span className="text-base font-bold text-slate-600">إلى:</span>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                <Input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-14 pr-12 pl-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-primary/20 shadow-sm font-bold w-56 text-lg"
                />
              </div>
            </div>
            <Button 
              onClick={fetchData}
              className="h-12 px-6 gap-2 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-xl"
            >
              <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
              تحديث التقرير
            </Button>
          </div>
        </div>

        {data && <TrialBalanceTable 
          data={data} 
          isLoading={isLoading} 
          hideZeroBalance={hideZeroBalance}
          setHideZeroBalance={setHideZeroBalance}
          startDate={startDate}
          endDate={endDate}
        />}

        {/* Print Stamp Section (Hidden on Screen) */}
        {companySettings?.companyStamp && (
          <div className="hidden print:flex flex-col items-end mt-16 px-12">
            <p className="font-black text-lg mb-4 text-black">ختم الشركة المعتمد</p>
            <img src={companySettings.companyStamp} alt="Company Stamp" className="h-32 w-auto opacity-90 mix-blend-multiply" />
          </div>
        )}
      </div>
    </>
  );
}
