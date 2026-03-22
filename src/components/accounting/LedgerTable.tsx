"use client";

import React from "react";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  FileText, 
  History,
  Info,
  ExternalLink,
  Calendar,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: number;
  date: Date;
  entryNumber: number;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  sourceType: string;
  sourceId?: string | null;
}

interface LedgerTableProps {
  transactions: Transaction[];
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
}

export function LedgerTable({ 
  transactions, 
  openingBalance, 
  closingBalance, 
  totalDebits, 
  totalCredits 
}: LedgerTableProps) {
  return (
    <div className="space-y-6 print:hidden" dir="rtl">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "الرصيد الافتتاحي", value: openingBalance, icon: History, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "إجمالي المدين", value: totalDebits, icon: ArrowUpRight, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "إجمالي الدائن", value: totalCredits, icon: ArrowDownRight, color: "text-rose-500", bg: "bg-rose-500/10" },
          { label: "الرصيد الختامي", value: closingBalance, icon: Wallet, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className={cn("p-2 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
            </div>
            <p className={cn("text-2xl font-black", stat.color)}>
              {stat.value.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">التاريخ</th>
                <th className="px-6 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">نوع العملية</th>
                <th className="px-6 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">البيان</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">مدين (+)</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">دائن (-)</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">الرصيد</th>
                <th className="px-6 py-5 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {/* Opening Balance Row */}
              <tr className="bg-slate-50/30 dark:bg-slate-800/20">
                <td colSpan={5} className="px-6 py-4 text-sm font-bold text-slate-500">الرصيد الافتتاحي</td>
                <td className="px-6 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-300">
                  {openingBalance.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>

              {transactions.map((tx) => (
                <tr key={tx.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {format(new Date(tx.date), "dd/MM/yyyy")}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {format(new Date(tx.date), "hh:mm a", { locale: ar })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide",
                        tx.sourceType === "MANUAL" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        {tx.sourceType === "MANUAL" ? "قيد يدوي" : "فاتورة"}
                      </span>
                      <span className="text-xs font-black text-slate-500">#{tx.entryNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 max-w-md">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 line-clamp-1">{tx.description}</p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={cn("text-sm font-black", tx.debit > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-300 dark:text-slate-700")}>
                      {tx.debit > 0 ? tx.debit.toLocaleString("ar-EG", { minimumFractionDigits: 2 }) : "0.00"}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={cn("text-sm font-black", tx.credit > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-300 dark:text-slate-700")}>
                      {tx.credit > 0 ? tx.credit.toLocaleString("ar-EG", { minimumFractionDigits: 2 }) : "0.00"}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {tx.balance.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-primary/20"
                      asChild
                    >
                      <Link href={tx.sourceType === "MANUAL" ? `/journal/${tx.id}` : `/sales-invoices/${tx.sourceId}`}>
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 dark:bg-slate-950 text-white border-t border-slate-800">
                <td colSpan={3} className="px-6 py-6 text-base font-black">الرصيد الختامي الإجمالي</td>
                <td className="px-6 py-6 text-center text-emerald-400 font-black">
                  {totalDebits.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-6 text-center text-rose-400 font-black">
                  {totalCredits.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-6 text-center text-amber-400 text-xl font-black">
                  {closingBalance.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
