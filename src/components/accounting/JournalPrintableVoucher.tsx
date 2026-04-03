import React from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface JournalItem {
  id: number;
  description?: string;
  debit: number;
  credit: number;
  account: {
    code: string;
    name: string;
  };
}

interface JournalEntry {
  id: number;
  entryNumber: number;
  date: Date | string;
  description: string;
  reference?: string;
  items: JournalItem[];
}

interface JournalPrintableVoucherProps {
  entry: JournalEntry;
  companySettings?: any;
}

export const JournalPrintableVoucher = React.forwardRef<HTMLDivElement, JournalPrintableVoucherProps>(
  ({ entry, companySettings }, ref) => {
    const totalDebit = entry.items.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = entry.items.reduce((sum, item) => sum + item.credit, 0);

    return (
      <div ref={ref} className="hidden print:block bg-white text-slate-800 w-full p-[10mm]" dir="rtl">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-only { display: block !important; }
          }
          .voucher-table th { background-color: #f8fafc !important; color: #475569 !important; border-bottom: 2px solid #e2e8f0; }
          .voucher-border { border: 1px solid #e2e8f0; }
        `}} />

        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div className="flex items-center gap-4">
            {companySettings?.companyLogo && (
              <img src={companySettings.companyLogo} alt="Logo" className="w-20 h-20 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-black text-slate-900">{companySettings?.companyName || "شركة المحاسبة الحديثة"}</h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest">{companySettings?.companyNameEn || "Modern Accounting Co."}</p>
            </div>
          </div>
          <div className="text-left py-2 px-6 bg-slate-900 text-white rounded-2xl">
            <h2 className="text-xl font-black">سند قيد يومية</h2>
            <p className="text-[10px] opacity-70 uppercase tracking-widest">Journal Voucher</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-8 mb-8 bg-slate-50 p-6 rounded-3xl border voucher-border">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">رقم القيد</p>
            <p className="text-lg font-black text-slate-800">#{entry.entryNumber}</p>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تاريخ القيد</p>
            <p className="text-lg font-bold text-slate-800">{format(new Date(entry.date), "dd MMMM yyyy", { locale: ar })}</p>
          </div>
          <div className="space-y-1 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المرجع</p>
            <p className="text-lg font-bold text-slate-800">{entry.reference || "---"}</p>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-4">البيان العام</p>
          <div className="p-4 bg-white rounded-2xl border voucher-border min-h-[60px] text-lg font-bold text-slate-700">
            {entry.description || "---"}
          </div>
        </div>

        {/* Items Table */}
        <div className="rounded-3xl border voucher-border overflow-hidden mb-12 shadow-sm">
          <table className="w-full text-sm voucher-table">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="p-4 text-right w-24">كود الحساب</th>
                <th className="p-4 text-right">اسم الحساب / الشرح</th>
                <th className="p-4 text-center w-28">مدين (Debit)</th>
                <th className="p-4 text-center w-28">دائن (Credit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic-text-none">
              {entry.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-4 font-mono text-xs text-slate-500">{item.account.code}</td>
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{item.account.name}</p>
                    {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                  </td>
                  <td className="p-4 text-center font-black text-slate-900 bg-emerald-50/20">
                    {item.debit > 0 ? item.debit.toLocaleString("ar-EG", { minimumFractionDigits: 2 }) : "-"}
                  </td>
                  <td className="p-4 text-center font-black text-slate-900 bg-rose-50/20">
                    {item.credit > 0 ? item.credit.toLocaleString("ar-EG", { minimumFractionDigits: 2 }) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-black">
              <tr>
                <td colSpan={2} className="p-5 text-left text-base">الإجمالي الكلي</td>
                <td className="p-5 text-center text-base">{totalDebit.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
                <td className="p-5 text-center text-base">{totalCredit.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-12 text-center text-lg font-black text-slate-400">
          شكراً لثقتكم بنا - {companySettings?.companyName || "فل كود لاستشارات المحاسبيه"}
        </div>
      </div>
    );
  }
);

JournalPrintableVoucher.displayName = "JournalPrintableVoucher";
