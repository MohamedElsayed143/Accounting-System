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

      <div className="p-[10mm] max-w-full mx-auto">
        {/* ─── Header: Branding First ─── */}
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
                <p className="text-[11px] text-slate-500 font-medium">
                  بيان حركة: {accountName}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
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
        {/* Account */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-slate-800 rounded-r-xl" />
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 pr-3">بيانات الحساب</div>
          <div className="text-lg font-black text-slate-900 pr-3">{accountName}</div>
          {accountInfo && <div className="text-xs text-slate-500 font-medium pr-3 mt-0.5">{accountInfo}</div>}
        </div>

        {/* Period */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-slate-400 rounded-r-xl" />
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pr-3">الفترة الزمنية</div>
          <div className="flex items-center gap-3 pr-3">
            <div>
              <div className="text-[9px] text-slate-400 font-bold uppercase">من</div>
              <div className="text-sm font-black text-slate-800">
                {fromDate ? fromDate.toLocaleDateString('ar-EG') : 'بداية النشاط'}
              </div>
            </div>
            <div className="w-6 h-px bg-slate-300" />
            <div>
              <div className="text-[9px] text-slate-400 font-bold uppercase">إلى</div>
              <div className="text-sm font-black text-slate-800">
                {toDate ? toDate.toLocaleDateString('ar-EG') : 'اليوم'}
              </div>
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
            {/* Opening Balance Row */}
            <tr style={{ background: "#f8fafc" }}>
              <td colSpan={6} style={{ color: "#64748b", fontStyle: "italic", fontWeight: "700", fontSize: "10px" }}>
                رصيد افتتاحي سابق للفترة
              </td>
              <td style={{ textAlign: "left", fontWeight: "900", color: "#0f172a", background: "#f1f5f9" }}>
                {openingBalance.toLocaleString('ar-EG')}
              </td>
            </tr>

            {transactions.map((t, idx) => (
              <tr key={t.id} className={cn(idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                <td style={{ color: "#475569", fontWeight: "600" }}>
                  {new Date(t.date).toLocaleDateString('ar-EG')}
                </td>
                <td>
                  <span style={{ fontWeight: "800", color: "#1e293b" }}>{t.type}</span>
                </td>
                <td style={{ color: "#2563eb", fontWeight: "700" }} dir="ltr">{t.documentId}</td>
                <td style={{ color: "#475569" }}>{t.description}</td>
                <td style={{ textAlign: "left", fontWeight: "700", color: t.debit > 0 ? "#047857" : "#94a3b8" }}>
                  {t.debit > 0 ? t.debit.toLocaleString('ar-EG') : '—'}
                </td>
                <td style={{ textAlign: "left", fontWeight: "700", color: t.credit > 0 ? "#b91c1c" : "#94a3b8" }}>
                  {t.credit > 0 ? t.credit.toLocaleString('ar-EG') : '—'}
                </td>
                <td style={{ textAlign: "left", fontWeight: "900", color: "#0f172a", background: "#f8fafc" }}>
                  {t.runningBalance?.toLocaleString('ar-EG')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: "#1e293b", color: "#fff" }}>
              <td colSpan={4} style={{ padding: "12px 10px", fontSize: "11px", fontWeight: "800", color: "#fff", textAlign: "right" }}>
                إجماليات الحركة للفترة
              </td>
              <td style={{ padding: "12px 10px", textAlign: "left", fontSize: "12px", fontWeight: "900", color: "#6ee7b7" }}>
                {totalDebit.toLocaleString('ar-EG')}
              </td>
              <td style={{ padding: "12px 10px", textAlign: "left", fontSize: "12px", fontWeight: "900", color: "#fca5a5" }}>
                {totalCredit.toLocaleString('ar-EG')}
              </td>
              <td style={{ padding: "12px 10px", textAlign: "left", fontSize: "14px", fontWeight: "900", color: "#fff", background: "#334155" }}>
                {finalBalance.toLocaleString('ar-EG')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-4 gap-4 mb-8 avoid-break">
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
          <div style={{ fontSize: "9px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>الرصيد السابق</div>
          <div style={{ fontSize: "18px", fontWeight: "900", color: "#334155" }}>{openingBalance.toLocaleString('ar-EG')}</div>
        </div>
        <div style={{ border: "1px solid #d1fae5", borderRadius: "10px", padding: "14px", background: "#f0fdf4" }}>
          <div style={{ fontSize: "9px", fontWeight: "800", color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>إجمالي مدين (+)</div>
          <div style={{ fontSize: "18px", fontWeight: "900", color: "#047857" }}>{totalDebit.toLocaleString('ar-EG')}</div>
        </div>
        <div style={{ border: "1px solid #fee2e2", borderRadius: "10px", padding: "14px", background: "#fff5f5" }}>
          <div style={{ fontSize: "9px", fontWeight: "800", color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>إجمالي دائن (-)</div>
          <div style={{ fontSize: "18px", fontWeight: "900", color: "#b91c1c" }}>{totalCredit.toLocaleString('ar-EG')}</div>
        </div>
        {/* Final Balance — same total-card style as invoices */}
        <div className="total-card" style={{ borderRadius: "10px", padding: "14px", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: "9px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>الصافي الختامي</div>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a" }}>{finalBalance.toLocaleString('ar-EG')}</div>
        </div>
      </div>

      {/* ─── Signatures + Stamp ─── */}
      <div className="grid grid-cols-3 gap-10 avoid-break">
        <div className="text-center">
          <p style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "40px" }}>ختم إدارة الحسابات</p>
          <div style={{ borderBottom: "2px dashed #cbd5e1" }} />
        </div>
        <div className="text-center">
          <p style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "40px" }}>توقيع المراجع المالي</p>
          <div style={{ borderBottom: "2px dashed #cbd5e1" }} />
        </div>
        <div className="flex flex-col items-center gap-2">
          {showStamp && companyStamp && (
            <img src={companyStamp} alt="Stamp" className="w-24 h-24 object-contain opacity-80 mix-blend-multiply" />
          )}
          <p style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8" }}>ختم وتوقيع المعتمد</p>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div className="mt-8 pt-5 border-t border-slate-100 text-center">
        <p style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.25em" }}>
          تَمَّ الإِصْدَارُ عَبْرَ {companyName} • {companyNameEn}
        </p>
      </div>
      </div>
    </div>
  );
}