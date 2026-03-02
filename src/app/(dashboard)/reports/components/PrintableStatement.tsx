"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { TransactionType } from "../actions";

interface PrintableStatementProps {
  title: string;
  accountName: string;
  accountInfo?: string;
  fromDate?: Date;
  toDate?: Date;
  transactions: TransactionType[];
  openingBalance: number;
}

export function PrintableStatement({
  title,
  accountName,
  accountInfo,
  fromDate,
  toDate,
  transactions,
  openingBalance
}: PrintableStatementProps) {
  const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
  const finalBalance = openingBalance + totalDebit - totalCredit;

  return (
    <div className="hidden print:block print:bg-white print:text-black p-0 m-0 w-full rtl">
      {/* Header Bar */}
      <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="text-slate-500 font-medium">نظام المحاسبة الحديثة — تقرير كشف حساب</p>
        </div>
        <div className="text-left space-y-1">
          <div className="text-xl font-bold text-blue-600">شركة أوركيد للبرمجيات</div>
          <div className="text-xs text-slate-400">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
        </div>
      </div>

      {/* Account Details & Period */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div className="text-xs text-slate-400 font-bold mb-2 uppercase tracking-wider">بيانات الحساب</div>
          <div className="text-xl font-black text-slate-900 mb-1">{accountName}</div>
          {accountInfo && <div className="text-sm text-slate-600 font-medium">{accountInfo}</div>}
        </div>
        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex flex-col justify-center">
          <div className="text-xs text-blue-400 font-bold mb-2 uppercase tracking-wider">الفترة الزمنية</div>
          <div className="flex items-center gap-4 text-slate-900">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold">من تاريخ</span>
              <span className="font-bold">{fromDate ? fromDate.toLocaleDateString('ar-EG') : 'بداية النشاط'}</span>
            </div>
            <div className="w-8 h-[2px] bg-blue-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold">إلى تاريخ</span>
              <span className="font-bold">{toDate ? toDate.toLocaleDateString('ar-EG') : 'اليوم'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-3 text-right text-xs font-bold border border-slate-900 first:rounded-tr-xl">التاريخ</th>
              <th className="p-3 text-right text-xs font-bold border border-slate-900">النوع</th>
              <th className="p-3 text-right text-xs font-bold border border-slate-900">رقم المرجع</th>
              <th className="p-3 text-right text-xs font-bold border border-slate-900">البيان</th>
              <th className="p-3 text-left text-xs font-bold border border-slate-900">مدين (+)</th>
              <th className="p-3 text-left text-xs font-bold border border-slate-900">دائن (-)</th>
              <th className="p-3 text-left text-xs font-bold border border-slate-900 last:rounded-tl-xl">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50 italic">
              <td colSpan={6} className="p-3 text-xs font-bold border border-slate-200">رصيد افتتاحي سابق للفترة</td>
              <td className="p-3 text-xs font-black border border-slate-200 text-left bg-slate-100 italic">
                {openingBalance.toLocaleString('ar-EG')}
              </td>
            </tr>
            {transactions.map((t, idx) => (
              <tr key={t.id} className={cn(idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                <td className="p-3 text-xs border border-slate-200 font-medium">
                  {new Date(t.date).toLocaleDateString('ar-EG')}
                </td>
                <td className="p-3 text-xs border border-slate-200">
                  <span className="font-bold">{t.type}</span>
                </td>
                <td className="p-3 text-xs border border-slate-200 font-mono text-slate-500">{t.documentId}</td>
                <td className="p-3 text-xs border border-slate-200 text-slate-700 min-w-[200px]">{t.description}</td>
                <td className="p-3 text-xs border border-slate-200 font-bold text-emerald-700 text-left">
                  {t.debit > 0 ? t.debit.toLocaleString('ar-EG') : '—'}
                </td>
                <td className="p-3 text-xs border border-slate-200 font-bold text-rose-700 text-left">
                  {t.credit > 0 ? t.credit.toLocaleString('ar-EG') : '—'}
                </td>
                <td className="p-3 text-xs border border-slate-200 font-black text-slate-900 text-left bg-slate-50/50">
                  {t.runningBalance?.toLocaleString('ar-EG')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-black">
              <td colSpan={4} className="p-4 text-sm text-right rounded-br-xl">الإجماليات الكلية</td>
              <td className="p-4 text-sm text-left border-l border-slate-800">{totalDebit.toLocaleString('ar-EG')}</td>
              <td className="p-4 text-sm text-left border-l border-slate-800">{totalCredit.toLocaleString('ar-EG')}</td>
              <td className="p-4 text-sm text-left bg-blue-600 rounded-bl-xl">{finalBalance.toLocaleString('ar-EG')}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary Legend */}
      <div className="grid grid-cols-4 gap-4 mb-12">
        <div className="border border-slate-200 p-4 rounded-xl">
          <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">الرصيد السابق</div>
          <div className="text-lg font-black text-slate-600">{openingBalance.toLocaleString('ar-EG')}</div>
        </div>
        <div className="border border-slate-200 p-4 rounded-xl">
          <div className="text-[10px] font-bold text-emerald-500 mb-1 uppercase tracking-tighter">إجمالي الحركات المدينة (+)</div>
          <div className="text-lg font-black text-emerald-600">{totalDebit.toLocaleString('ar-EG')}</div>
        </div>
        <div className="border border-slate-200 p-4 rounded-xl">
          <div className="text-[10px] font-bold text-rose-500 mb-1 uppercase tracking-tighter">إجمالي الحركات الدائنة (-)</div>
          <div className="text-lg font-black text-rose-600">{totalCredit.toLocaleString('ar-EG')}</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl">
          <div className="text-[10px] font-bold text-blue-400 mb-1 uppercase tracking-tighter">الرصيد الختامي</div>
          <div className="text-lg font-black text-white">{finalBalance.toLocaleString('ar-EG')}</div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-3 gap-12 mt-20 px-8">
        <div className="text-center space-y-12">
          <div className="font-bold text-slate-400 border-b border-dashed border-slate-300 pb-2">ختم الحسابات</div>
          <div className="h-20"></div>
        </div>
        <div className="text-center space-y-12">
          <div className="font-bold text-slate-400 border-b border-dashed border-slate-300 pb-2">توقيع المراجع</div>
          <div className="h-20"></div>
        </div>
        <div className="text-center space-y-12 text-slate-900 font-black italic">
           نظام أوركيد المحاسبي
        </div>
      </div>

      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm 15mm;
          }
          body {
            -webkit-print-color-adjust: exact;
          }
          th { border-color: #000 !important; }
        }
      `}</style>
    </div>
  );
}
