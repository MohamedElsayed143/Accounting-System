"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string | number;
  date: Date;
  entryNumber?: number;
  documentId?: string;
  description: string;
  debit: number;
  credit: number;
  balance?: number;
  runningBalance?: number;
  sourceType?: string;
  type?: string;
}

interface LedgerPrintableStatementProps {
  title: string;
  accountName: string;
  accountCode?: string;
  fromDate?: Date | string;
  toDate?: Date | string;
  transactions: Transaction[];
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  companyName?: string;
  companyNameEn?: string;
  companyLogo?: string | null;
  companyStamp?: string | null;
  currency?: string;
  showLogo?: boolean;
  showStamp?: boolean;
}

export function LedgerPrintableStatement({
  title,
  accountName,
  accountCode,
  fromDate,
  toDate,
  transactions,
  openingBalance,
  closingBalance,
  totalDebits,
  totalCredits,
  companyName = "نظام المحاسبة الحديثة",
  companyNameEn = "Modern Accounting System",
  companyLogo,
  companyStamp,
  currency = "ج.م",
  showLogo = true,
  showStamp = true,
}: LedgerPrintableStatementProps) {

  const displayFromDate = fromDate instanceof Date ? fromDate.toLocaleDateString('ar-EG') : (fromDate ? new Date(fromDate).toLocaleDateString('ar-EG') : 'بداية النشاط');
  const displayToDate = toDate instanceof Date ? toDate.toLocaleDateString('ar-EG') : (toDate ? new Date(toDate).toLocaleDateString('ar-EG') : 'اليوم');

  return (
    <div className="hidden print:block bg-white text-slate-800 w-full" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .print\\:block {
            width: 100% !important;
            max-width: 100% !important;
            position: absolute;
            top: 0;
            left: 0;
            margin: 0;
            padding: 0;
          }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .print-compact { font-size: 95%; }
        }
        .stmt-table th {
          background-color: #1e293b !important;
          color: #fff !important;
          font-size: 10px;
          padding: 9px 10px;
          text-align: right;
          font-weight: 700;
          white-space: nowrap;
        }
        .stmt-table td {
          font-size: 10px;
          padding: 8px 10px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .stmt-table tbody tr:nth-child(even) { background: #f8fafc !important; }
        .stmt-table tbody tr:nth-child(odd)  { background: #ffffff !important; }
        .total-card { background-color: #f1f5f9 !important; border: 2px solid #334155 !important; }
      `}} />

      <div className="p-[10mm] max-w-full mx-auto print-compact">

        {/* ─── Header (same style as PrintableInvoice) ─── */}
        <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4 mb-5 avoid-break">
          <div className="flex items-start gap-4">
            {showLogo && companyLogo && (
              <img src={companyLogo} alt="Logo" className="w-16 h-16 object-contain rounded-lg shrink-0" />
            )}

            <div className="pt-1">
              <p className="text-base font-extrabold text-slate-800 leading-tight">{companyName}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">
                {companyNameEn}
              </p>

              <div className="mt-2 space-y-0.5">
                <p className="text-sm font-bold text-slate-700">كشف حساب</p>
                <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                  الحساب: {accountName} {accountCode && `(${accountCode})`}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>
          </div>

          <div className="text-left bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 min-w-[120px]">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">نوع التقرير</div>
            <div className="text-sm font-black text-slate-900">{title}</div>
          </div>
        </div>

        {/* ─── Info Grid ─── */}
        <div className="grid grid-cols-2 gap-5 mb-6 avoid-break">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-slate-800 rounded-r-xl" />
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 pr-3">بيانات الحساب</div>
            <div className="text-lg font-black text-slate-900 pr-3">{accountName}</div>
            {accountCode && <div className="text-xs text-slate-500 font-medium pr-3 mt-0.5">رقم الحساب المحاسبي: {accountCode}</div>}
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-slate-400 rounded-r-xl" />
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pr-3">الفترة الزمنية</div>
            <div className="flex items-center gap-3 pr-3">
              <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase">من</div>
                <div className="text-sm font-black text-slate-800">{displayFromDate}</div>
              </div>
              <div className="w-6 h-px bg-slate-300" />
              <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase">إلى</div>
                <div className="text-sm font-black text-slate-800">{displayToDate}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main Table ─── */}
        <div className="mb-6 rounded-xl border border-slate-200 overflow-hidden avoid-break">
          <table className="w-full border-collapse stmt-table">
            <thead>
              <tr>
                <th style={{ width: "10%" }}>التاريخ</th>
                <th style={{ width: "10%" }}>النوع</th>
                <th style={{ width: "10%" }}>المرجع</th>
                <th style={{ width: "34%" }}>البيان</th>
                <th style={{ width: "12%", textAlign: "left" }}>مدين (+)</th>
                <th style={{ width: "12%", textAlign: "left" }}>دائن (-)</th>
                <th style={{ width: "12%", textAlign: "left" }}>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "#f8fafc" }}>
                <td colSpan={6} style={{ color: "#64748b", fontStyle: "italic", fontWeight: "700", fontSize: "10px" }}>
                  رصيد افتتاحي سابق للفترة
                </td>
                <td style={{ textAlign: "left", fontWeight: "900", color: "#0f172a", background: "#f1f5f9" }}>
                  {openingBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {transactions.map((t, idx) => {
                const bal = t.balance ?? t.runningBalance ?? 0;
                const ref = t.documentId || t.entryNumber?.toString() || '-';
                const txType = t.type || (t.sourceType === 'MANUAL' ? 'قيد يدوي' : 'عملية');

                return (
                  <tr key={idx} className={cn(idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                    <td style={{ color: "#475569", fontWeight: "600" }}>
                      {new Date(t.date).toLocaleDateString('ar-EG')}
                    </td>
                    <td>
                      <span style={{ fontWeight: "800", color: "#1e293b" }}>{txType}</span>
                    </td>
                    <td style={{ color: "#2563eb", fontWeight: "700" }} dir="ltr">{ref}</td>
                    <td style={{ color: "#475569" }}>{t.description}</td>
                    <td style={{ textAlign: "left", fontWeight: "700", color: t.debit > 0 ? "#047857" : "#94a3b8" }}>
                      {t.debit > 0 ? t.debit.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td style={{ textAlign: "left", fontWeight: "700", color: t.credit > 0 ? "#b91c1c" : "#94a3b8" }}>
                      {t.credit > 0 ? t.credit.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td style={{ textAlign: "left", fontWeight: "900", color: "#0f172a", background: "#f8fafc" }}>
                      {bal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#1e293b", color: "#fff" }}>
                <td colSpan={4} style={{ padding: "12px 10px", fontSize: "11px", fontWeight: "800", color: "#fff", textAlign: "right" }}>
                  إجماليات الحركة للفترة
                </td>
                <td style={{ padding: "12px 10px", textAlign: "left", fontSize: "12px", fontWeight: "900", color: "#6ee7b7" }}>
                  {totalDebits.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: "12px 10px", textAlign: "left", fontSize: "12px", fontWeight: "900", color: "#fca5a5" }}>
                  {totalCredits.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: "12px 10px", textAlign: "left", fontSize: "14px", fontWeight: "900", color: "#fff", background: "#334155" }}>
                  {closingBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ─── Bottom Section (same layout as PrintableInvoice) ─── */}
        <div className="flex justify-between items-start gap-6 avoid-break">

          {/* Summary Cards — left side */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
              <div style={{ fontSize: "9px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>الرصيد السابق</div>
              <div style={{ fontSize: "18px", fontWeight: "900", color: "#334155" }}>{openingBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{currency}</div>
            </div>
            <div style={{ border: "1px solid #d1fae5", borderRadius: "10px", padding: "14px", background: "#f0fdf4" }}>
              <div style={{ fontSize: "9px", fontWeight: "800", color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>إجمالي مدين (+)</div>
              <div style={{ fontSize: "18px", fontWeight: "900", color: "#047857" }}>{totalDebits.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: "10px", color: "#059669", marginTop: "2px" }}>{currency}</div>
            </div>
            <div style={{ border: "1px solid #fee2e2", borderRadius: "10px", padding: "14px", background: "#fff5f5" }}>
              <div style={{ fontSize: "9px", fontWeight: "800", color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>إجمالي دائن (-)</div>
              <div style={{ fontSize: "18px", fontWeight: "900", color: "#b91c1c" }}>{totalCredits.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "2px" }}>{currency}</div>
            </div>
          </div>

          {/* Total Card + Stamp — right side (mirrors PrintableInvoice) */}
          <div className="w-64 space-y-2 shrink-0">
            <div className="total-card mt-1 p-4 rounded-2xl text-slate-900 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] mb-1 opacity-70">
                  الصافي الختامي
                </div>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tighter">
                    {closingBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-base font-bold">{currency}</span>
                </div>
              </div>

              <div className="absolute -right-4 -bottom-4 text-slate-200 opacity-20 transform -rotate-12">
                <svg width="90" height="90" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.82v-1.91c-1.54-.13-3.04-.81-4.08-1.9l1.61-1.61c.83.85 1.72 1.25 2.76 1.35.81.08 1.53-.19 1.53-.9 0-.46-.3-.79-1.29-1.22-1.39-.61-3.23-1.42-3.23-3.52 0-1.66 1.09-2.99 2.71-3.39V5h2.82v1.9c1.23.11 2.37.58 3.19 1.34l-1.6 1.59c-.48-.46-1.07-.76-1.88-.85-.56-.06-1.16.07-1.16.69 0 .5.39.75 1.55 1.25 1.73.74 2.97 1.74 2.97 3.51.01 1.83-1.26 3.14-3.08 3.47z" />
                </svg>
              </div>
            </div>

            {showStamp && companyStamp && (
              <div className="flex justify-center pt-2">
                <img
                  src={companyStamp}
                  alt="Stamp"
                  className="w-20 h-20 object-contain opacity-80 mix-blend-multiply"
                />
              </div>
            )}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center avoid-break">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            شكراً لثقتكم بنا • {companyNameEn}
          </p>
        </div>
      </div>
    </div>
  );
}