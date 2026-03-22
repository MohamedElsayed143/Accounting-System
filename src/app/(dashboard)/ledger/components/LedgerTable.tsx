"use client";

import React from "react";
import { 
  Eye, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Transaction {
  id: number;
  date: Date | string;
  entryNumber: number;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
  sourceType: string;
  sourceId: number | null;
}

interface LedgerTableProps {
  transactions: Transaction[];
  openingBalance: number;
  isLoading: boolean;
}

const sourceLinks: Record<string, string> = {
  SALES_INVOICE: "/sales-invoices",
  PURCHASE_INVOICE: "/purchase-invoices",
  RECEIPT_VOUCHER: "/treasury/vouchers/receipt", // Adjust paths as per project
  PAYMENT_VOUCHER: "/treasury/vouchers/payment",
  SALES_RETURN: "/sales-returns",
  PURCHASE_RETURN: "/purchase-returns",
  TRANSFER: "/treasury/transfers",
};

export function LedgerTable({ transactions, openingBalance, isLoading }: LedgerTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 transition-all">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">جاري تحميل حركات الحساب...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">التاريخ</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">رقم القيد</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">البيان</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">مدين</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">دائن</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">الرصيد</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center print:hidden">المصدر</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {/* Opening Balance Row */}
            <tr className="bg-amber-50/30 dark:bg-amber-900/10 italic">
              <td className="px-6 py-4 text-sm text-slate-400">-</td>
              <td className="px-6 py-4 text-sm text-slate-400">-</td>
              <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">رصيد أول المدة</td>
              <td className="px-6 py-4 text-sm text-center">-</td>
              <td className="px-6 py-4 text-sm text-center">-</td>
              <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400 text-center">
                {openingBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 text-sm text-center print:hidden"></td>
            </tr>

            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                  لا توجد حركات مسجلة خلال هذه الفترة
                </td>
              </tr>
            ) : (
              transactions.map((t, idx) => (
                <tr 
                  key={t.id} 
                  className={cn(
                    "hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors",
                    idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/20 dark:bg-slate-800/10"
                  )}
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">#{t.entryNumber}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-md truncate">
                    {t.description || "قيد محاسبي"}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-center">
                    {t.debit > 0 ? t.debit.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-rose-600 dark:text-rose-400 text-center">
                    {t.credit > 0 ? t.credit.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white text-center bg-slate-50/30 dark:bg-slate-800/30">
                    {t.balance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm text-center print:hidden">
                    {t.sourceId && (
                      <Link href={`${sourceLinks[t.sourceType]}/${t.sourceId}`} target="_blank">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 transition-all">
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
