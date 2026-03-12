"use client";

import React, { useState } from "react";
import { 
  ChevronRight, 
  ChevronLeft, 
  Eye, 
  History as HistoryIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCcw,
  FileText,
  CreditCard,
  Banknote,
  Navigation
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionType } from "../actions";

interface LedgerTableProps {
  transactions: TransactionType[];
  openingBalance: number;
  isLoading?: boolean;
  onViewDetails?: (transaction: TransactionType) => void;
}

export function LedgerTable({ transactions, openingBalance, isLoading, onViewDetails }: LedgerTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const displayTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'فاتورة': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'سند قبض': return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
      case 'سند صرف': return <ArrowUpRight className="w-4 h-4 text-rose-500" />;
      case 'تحويل صادر': 
      case 'تحويل وارد': return <RefreshCcw className="w-4 h-4 text-orange-500" />;
      case 'مرتجع': return <HistoryIcon className="w-4 h-4 text-purple-500" />;
      default: return <Navigation className="w-4 h-4 text-slate-400" />;
    }
  };

  const getPaymentIcon = (method: string) => {
    if (method.includes('بنك')) return <CreditCard className="w-4 h-4 text-blue-600" />;
    if (method.includes('نقدي')) return <Banknote className="w-4 h-4 text-emerald-600" />;
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 animate-pulse">جاري جلب المعاملات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      {/* Table Body */}
      <div className="overflow-x-auto print:hidden">
        <table className="w-full text-right">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">التاريخ</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">النوع</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">المرجع</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">البيان</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase text-left whitespace-nowrap">طريقة الدفع</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase text-left whitespace-nowrap">مدين (+)</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase text-left whitespace-nowrap">دائن (-)</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 dark:bg-slate-800/50">الرصيد</th>
              <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase print:hidden">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Opening Balance Row */}
            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
              <td colSpan={7} className="px-4 py-4 text-sm text-slate-500 font-medium italic">رصيد افتتاحي (سابق)</td>
              <td className="px-4 py-4 text-sm font-bold text-slate-900 dark:text-white sticky left-0 bg-slate-50/50 dark:bg-slate-800/30">
                {openingBalance.toLocaleString('ar-EG')}
              </td>
              <td className="print:hidden"></td>
            </tr>

            {displayTransactions.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group">
                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {new Date(row.date).toLocaleDateString("ar-EG", { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </td>
                <td className="px-4 py-4">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
                    row.type.includes('تحويل') ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/10 dark:text-orange-400 dark:border-orange-800" :
                    row.type === 'فاتورة' ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-800" :
                    row.type === 'سند قبض' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-800" :
                    row.type === 'سند صرف' ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-800" :
                    row.type === 'فاتورة مشتريات' ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/10 dark:text-rose-400 dark:border-rose-800" :
                    row.type === 'فاتورة مبيعات' ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-800" :
                    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                  )}>
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
                  {onViewDetails && (
                    <button
                      onClick={() => onViewDetails(row)}
                      className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group/btn"
                      title="عرض التفاصيل"
                    >
                      <Eye className="w-4 h-4 text-slate-400 group-hover/btn:text-blue-600" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 dark:bg-slate-800/70 border-t-2 border-slate-300 dark:border-slate-700">
            <tr className="font-bold">
              <td colSpan={5} className="px-4 py-4 text-sm text-slate-900 dark:text-white">الإجمالي الكلي</td>
              <td className="px-4 py-4 text-sm text-emerald-700 text-left">
                {transactions.reduce((sum, t) => sum + t.debit, 0).toLocaleString('ar-EG')}
              </td>
              <td className="px-4 py-4 text-sm text-rose-700 text-left">
                {transactions.reduce((sum, t) => sum + t.credit, 0).toLocaleString('ar-EG')}
              </td>
              <td className="px-4 py-4 sticky left-0 bg-slate-100 dark:bg-slate-800/70">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {(
                    openingBalance + 
                    transactions.reduce((sum, t) => sum + t.debit, 0) - 
                    transactions.reduce((sum, t) => sum + t.credit, 0)
                  ).toLocaleString('ar-EG')}
                </span>
              </td>
              <td className="print:hidden"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Empty State */}
      {transactions.length === 0 && !isLoading && (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <HistoryIcon className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm">لا توجد حركات مالية مسجلة لهذه الفترة</p>
        </div>
      )}

      {/* Pagination */}
      {transactions.length > itemsPerPage && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            عرض <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> إلى{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, transactions.length)}</span> من{' '}
            <span className="font-medium">{transactions.length}</span> حركة
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
              {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors",
                      currentPage === pageNum 
                        ? "bg-blue-600 text-white" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="text-slate-400 px-1">...</span>}
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
    </div>
  );
}
