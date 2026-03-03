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
  // Company Settings
  companyName?: string;
  companyNameEn?: string;
  companyLogo?: string | null;
  companyStamp?: string | null;
  showLogo?: boolean;
  showStamp?: boolean;
}

export function PrintableStatement({
  title,
  accountName,
  accountInfo,
  fromDate,
  toDate,
  transactions,
  openingBalance,
  companyName = "نظام المحاسبة الحديثة",
  companyNameEn = "Modern Accounting System",
  companyLogo,
  companyStamp,
  showLogo = true,
  showStamp = true,
}: PrintableStatementProps) {
  const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
  const finalBalance = openingBalance + totalDebit - totalCredit;

  return (
    <div className="hidden print:block print:bg-white print:text-black p-0 m-0 w-full rtl">
      {/* Header Section */}
      <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
        <div className="flex items-start gap-4">
          {showLogo && companyLogo && (
            <img src={companyLogo} alt="Logo" className="w-20 h-20 object-contain rounded-lg" />
          )}
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-slate-800">{companyName}</span>
              <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">{companyNameEn}</span>
            </div>
          </div>
        </div>
        <div className="text-left space-y-1">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">تاريخ الطباعة</div>
          <div className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* Account Details & Period */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-slate-900" />
          <div className="text-xs text-slate-400 font-black mb-2 uppercase tracking-widest">بيانات الحساب</div>
          <div className="text-2xl font-black text-slate-900 mb-1">{accountName}</div>
          {accountInfo && <div className="text-sm text-slate-600 font-bold">{accountInfo}</div>}
        </div>
        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex flex-col justify-center relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500" />
          <div className="text-xs text-blue-400 font-black mb-2 uppercase tracking-widest">الفترة الزمنية للتقرير</div>
          <div className="flex items-center gap-4 text-slate-900">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-black uppercase">من تاريخ</span>
              <span className="font-black text-lg">{fromDate ? fromDate.toLocaleDateString('ar-EG') : 'بداية النشاط'}</span>
            </div>
            <div className="w-10 h-[2px] bg-blue-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-black uppercase">إلى تاريخ</span>
              <span className="font-black text-lg">{toDate ? toDate.toLocaleDateString('ar-EG') : 'اليوم'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="mb-8 overflow-hidden border border-slate-200 rounded-3xl shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-4 text-right text-xs font-black uppercase tracking-widest border border-slate-900">التاريخ</th>
              <th className="p-4 text-right text-xs font-black uppercase tracking-widest border border-slate-900">النوع</th>
              <th className="p-4 text-right text-xs font-black uppercase tracking-widest border border-slate-900">رقم المرجع</th>
              <th className="p-4 text-right text-xs font-black uppercase tracking-widest border border-slate-900">البيان</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-widest border border-slate-900">مدين (+)</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-widest border border-slate-900">دائن (-)</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-widest border border-slate-900">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50 italic">
              <td colSpan={6} className="p-4 text-xs font-black border border-slate-200 text-slate-500">رصيد افتتاحي سابق للفترة المحددة</td>
              <td className="p-4 text-xs font-black border border-slate-200 text-left bg-slate-100/50 text-slate-900">
                {openingBalance.toLocaleString('ar-EG')}
              </td>
            </tr>
            {transactions.map((t, idx) => (
              <tr key={t.id} className={cn(idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                <td className="p-4 text-xs border border-slate-200 font-bold text-slate-600">
                  {new Date(t.date).toLocaleDateString('ar-EG')}
                </td>
                <td className="p-4 text-xs border border-slate-200">
                  <span className="font-black text-slate-900">{t.type}</span>
                </td>
                <td className="p-4 text-xs border border-slate-200 font-black text-blue-600" dir="ltr">{t.documentId}</td>
                <td className="p-4 text-xs border border-slate-200 text-slate-700 min-w-[200px] font-medium">{t.description}</td>
                <td className="p-4 text-xs border border-slate-200 font-black text-emerald-700 text-left">
                  {t.debit > 0 ? t.debit.toLocaleString('ar-EG') : '—'}
                </td>
                <td className="p-4 text-xs border border-slate-200 font-black text-rose-700 text-left">
                  {t.credit > 0 ? t.credit.toLocaleString('ar-EG') : '—'}
                </td>
                <td className="p-4 text-xs border border-slate-200 font-black text-slate-900 text-left bg-slate-50/50">
                  {t.runningBalance?.toLocaleString('ar-EG')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-black">
              <td colSpan={4} className="p-5 text-sm font-black text-right tracking-widest uppercase">إجماليات الحركة للفترة</td>
              <td className="p-5 text-sm text-left border-l border-white/10">{totalDebit.toLocaleString('ar-EG')}</td>
              <td className="p-5 text-sm text-left border-l border-white/10">{totalCredit.toLocaleString('ar-EG')}</td>
              <td className="p-5 text-lg text-left bg-blue-600 text-white">{finalBalance.toLocaleString('ar-EG')}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary Legend */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        <div className="bg-white border-2 border-slate-100 p-5 rounded-3xl shadow-sm">
          <div className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">الرصيد السابق</div>
          <div className="text-xl font-black text-slate-700">{openingBalance.toLocaleString('ar-EG')}</div>
        </div>
        <div className="bg-emerald-50/30 border-2 border-emerald-100 p-5 rounded-3xl shadow-sm">
          <div className="text-[10px] font-black text-emerald-500 mb-2 uppercase tracking-widest">إجمالي مدين (+)</div>
          <div className="text-xl font-black text-emerald-700">{totalDebit.toLocaleString('ar-EG')}</div>
        </div>
        <div className="bg-rose-50/30 border-2 border-rose-100 p-5 rounded-3xl shadow-sm">
          <div className="text-[10px] font-black text-rose-500 mb-2 uppercase tracking-widest">إجمالي دائن (-)</div>
          <div className="text-xl font-black text-rose-700">{totalCredit.toLocaleString('ar-EG')}</div>
        </div>
        <div className="bg-slate-900 p-5 rounded-3xl shadow-xl">
          <div className="text-[10px] font-black text-blue-400 mb-2 uppercase tracking-widest">الصافي الختامي</div>
          <div className="text-xl font-black text-white">{finalBalance.toLocaleString('ar-EG')}</div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-3 gap-12 mt-20 px-8 relative">
        <div className="text-center space-y-12">
          <div className="font-black text-xs text-slate-400 border-b-2 border-dashed border-slate-200 pb-3 uppercase tracking-widest">ختم إدارة الحسابات</div>
          <div className="h-24"></div>
        </div>
        <div className="text-center space-y-12">
          <div className="font-black text-xs text-slate-400 border-b-2 border-dashed border-slate-200 pb-3 uppercase tracking-widest">توقيع المراجع المالي</div>
          <div className="h-24"></div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4">
          {showStamp && companyStamp && (
            <img src={companyStamp} alt="Stamp" className="w-32 h-32 object-contain opacity-80" />
          )}
          <span className="font-black text-sm text-slate-900 italic tracking-tighter">
            تَمَّ الإِصْدَارُ عَبْرَ {companyName}
          </span>
        </div>
      </div>

      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
