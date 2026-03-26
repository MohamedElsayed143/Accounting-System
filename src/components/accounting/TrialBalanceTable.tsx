"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Printer, 
  ArrowRightLeft, 
  ChevronRight, 
  ChevronDown,
  LayoutGrid,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { TrialBalanceRow } from "@/app/(dashboard)/reports/trial-balance/actions";

interface TrialBalanceTableProps {
  data: {
    rows: TrialBalanceRow[];
    totals: { 
      totalOpeningDebit: number; totalOpeningCredit: number;
      totalPeriodDebit: number; totalPeriodCredit: number;
      totalClosingDebit: number; totalClosingCredit: number;
    };
    isBalanced: boolean;
  };
  isLoading: boolean;
  hideZeroBalance: boolean;
  setHideZeroBalance: (val: boolean) => void;
  startDate: string;
  endDate: string;
}

export function TrialBalanceTable({ data, isLoading, hideZeroBalance, setHideZeroBalance, startDate, endDate }: TrialBalanceTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const renderRows = (rows: TrialBalanceRow[], level = 0) => {
    return rows.map((row) => {
      // Logic to hide zero balances
      if (hideZeroBalance && 
          Math.abs(row.openingBalance) < 0.001 && 
          Math.abs(row.periodDebit) < 0.001 && 
          Math.abs(row.periodCredit) < 0.001 && 
          Math.abs(row.closingBalance) < 0.001) {
        return null;
      }

      const hasChildren = row.children && row.children.length > 0;
      const isExpanded = expandedRows.has(row.id);

      return (
        <React.Fragment key={row.id}>
          <tr className={cn(
            "group transition-colors",
            level === 0 ? "bg-slate-50/50 dark:bg-slate-800/20 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
            row.parentId === null && "border-t-2 border-slate-200 dark:border-slate-800"
          )}>
            <td className="py-4 px-6 text-right">
              <div className="flex items-center gap-2" style={{ marginRight: `${level * 24}px` }}>
                {hasChildren ? (
                  <button 
                    onClick={() => toggleRow(row.id)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors print:hidden"
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <div className="w-6 print:hidden" />
                )}
                <span className="font-mono text-slate-500 dark:text-slate-400 text-xs">{row.code}</span>
              </div>
            </td>
            <td className="py-4 px-6 text-right">
              {row.isSelectable ? (
                <Link 
                  href={`/ledger?accountId=${row.id}`}
                  className="hover:text-primary hover:underline flex items-center gap-2 transition-all group/link"
                >
                  {row.name}
                  <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity print:hidden" />
                </Link>
              ) : (
                <span>{row.name}</span>
              )}
            </td>
            <td className="py-4 px-6 text-left font-black text-emerald-600 dark:text-emerald-400 text-xl tracking-tight">
              {row.periodDebit > 0 ? row.periodDebit.toLocaleString("ar-EG", { minimumFractionDigits: 2 }) : "-"}
            </td>
            <td className="py-4 px-6 text-left font-black text-rose-600 dark:text-rose-400 text-xl tracking-tight">
              {row.periodCredit > 0 ? row.periodCredit.toLocaleString("ar-EG", { minimumFractionDigits: 2 }) : "-"}
            </td>
            <td className="py-4 px-6 text-left font-black text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 text-xl tracking-tight">
              {Math.abs(row.closingBalance).toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
              <span className="text-xs mr-2 text-slate-400 font-bold">
                {row.closingBalance > 0 ? "مدين" : row.closingBalance < 0 ? "دائن" : ""}
              </span>
            </td>
          </tr>
          {hasChildren && isExpanded && renderRows(row.children!, level + 1)}
        </React.Fragment>
      );
    });
  };

  const exportToCSV = () => {
    let csv = "\uFEFF"; // BOM for UTF-8 Excel support
    csv += "كود الحساب,اسم الحساب,حركة مدين,حركة دائن,رصيد الإقفال,نوع رصيد الإقفال\n";
    
    const serializeRows = (rows: TrialBalanceRow[]) => {
      rows.forEach(row => {
        if (hideZeroBalance && Math.abs(row.openingBalance) < 0.001 && Math.abs(row.periodDebit) < 0.001 && Math.abs(row.periodCredit) < 0.001 && Math.abs(row.closingBalance) < 0.001) {
          return;
        }
        const closingType = row.closingBalance > 0 ? "مدين" : row.closingBalance < 0 ? "دائن" : "صفر";
        csv += `${row.code},"${row.name.replace(/"/g, '""')}",${row.periodDebit},${row.periodCredit},${Math.abs(row.closingBalance)},${closingType}\n`;
        if (row.children) serializeRows(row.children);
      });
    };
    
    serializeRows(data.rows);
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `trial_balance_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold">جاري تحضير ميزان المراجعة...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex items-center justify-between mb-4 print:hidden px-4">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Switch 
            id="hide-zero" 
            checked={hideZeroBalance} 
            onCheckedChange={setHideZeroBalance} 
          />
          <Label htmlFor="hide-zero" className="font-bold text-slate-700 dark:text-slate-300">
            إخفاء الحسابات الصفرية
          </Label>
        </div>
        <Button 
          variant="outline" 
          onClick={exportToCSV}
          className="gap-2 rounded-xl text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-900/30"
        >
          <Download size={16} />
          تصدير لملف Excel
        </Button>
      </div>

      <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden print:ring-0 print:shadow-none">
        <div className="overflow-x-auto print:overflow-visible print:w-full">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-900 text-white uppercase text-[11px] font-black tracking-widest border-b border-slate-800">
              <tr>
                <th className="py-5 px-6">كود الحساب</th>
                <th className="py-5 px-6">اسم الحساب</th>
                <th className="py-5 px-6 text-left">حركة مدين</th>
                <th className="py-5 px-6 text-left">حركة دائن</th>
                <th className="py-5 px-6 text-left">رصيد الإقفال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {renderRows(data.rows)}
            </tbody>
            <tfoot className="bg-slate-900 text-white border-t-4 border-primary/50">
              <tr className="font-black">
                <td colSpan={2} className="py-6 px-6 text-lg">إجمالي الأرصدة</td>
                <td className="py-6 px-6 text-left text-xl text-emerald-400">
                  {data.totals.totalPeriodDebit.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-6 px-6 text-left text-xl text-rose-400">
                  {data.totals.totalPeriodCredit.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-6 px-6 text-left text-2xl text-primary">
                  {Math.abs(data.totals.totalClosingDebit - data.totals.totalClosingCredit).toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Status Badge Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl print:hidden">
        <div className="flex items-center gap-6">
          <div className={cn(
            "p-5 rounded-[2rem] flex items-center justify-center transition-all duration-700",
            data.isBalanced ? "bg-emerald-500/10 text-emerald-500 ring-4 ring-emerald-500/5 scale-110" : "bg-rose-500/10 text-rose-500 ring-4 ring-rose-500/5 animate-pulse"
          )}>
            {data.isBalanced ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
          </div>
          <div className="space-y-1">
            <h3 className={cn(
              "text-3xl font-black",
              data.isBalanced ? "text-emerald-500" : "text-rose-500"
            )}>
              {data.isBalanced ? "الميزان متزن" : "الميزان غير متزن"}
            </h3>
            <p className="text-slate-500 font-bold">
              {data.isBalanced 
                ? "جميع الحسابات المحاسبية متوازنة وفقاً لنظام القيد المزدوج" 
                : "يوجد فرق في إجمالي الأرصدة المدينة والدائنة، يرجى مراجعة القيود اليدوية"
              }
            </p>
          </div>
        </div>

        <Button 
          onClick={() => window.print()}
          className="h-16 px-10 gap-3 font-black text-lg bg-slate-900 hover:bg-black text-white rounded-2xl transition-all shadow-2xl shadow-slate-900/20"
        >
          <Printer size={24} />
          تصدير وطباعة الميزان
        </Button>
      </div>

      {/* Print-Only Layout (Formal Style) */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          table {
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #e2e8f0 !important;
            color: black !important;
          }
          thead th {
            background-color: #f8fafc !important;
            color: black !important;
          }
          tfoot {
            background-color: #f8fafc !important;
            color: black !important;
          }
          tfoot td {
            font-size: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
}
