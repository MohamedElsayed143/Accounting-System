import React from "react";
import { format } from "date-fns";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PrintableInvoiceProps {
  invoiceNumber: string | number;
  prefix?: string;
  date: string | Date;
  partnerName: string;
  partnerLabel: string; // "العميل" or "المورد"
  title: string; // "فاتورة مبيعات" or "فاتورة مشتريات"
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currencyCode?: string;
  topNotes?: string[];
  notes?: string[];
  // Company Settings
  companyName?: string;
  companyNameEn?: string;
  companyLogo?: string | null;
  companyStamp?: string | null;
  showLogo?: boolean;
  showStamp?: boolean;
  termsAndConditions?: string;
}

export const PrintableInvoice = React.forwardRef<HTMLDivElement, PrintableInvoiceProps>(
  ({ 
    invoiceNumber, prefix, date, partnerName, partnerLabel, title, 
    items, subtotal, tax, total, currencyCode = "ج.م", topNotes, notes,
    companyName = "شركة المحاسبة الحديثة",
    companyNameEn = "Modern Accounting Co.",
    companyLogo,
    companyStamp,
    showLogo = true,
    showStamp = true,
    termsAndConditions
  }, ref) => {
    return (
      <div ref={ref} className="hidden print:block print:p-10 bg-white text-black min-h-screen relative" dir="rtl">
        {/* Header Section */}
        <div className="flex justify-between items-start border-b-4 border-primary pb-6 mb-8">
          <div className="flex items-start gap-4">
            {showLogo && companyLogo && (
              <img src={companyLogo} alt="Logo" className="w-20 h-20 object-contain rounded-lg" />
            )}
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-primary mb-2 tracking-tight">{title}</h1>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-slate-800">{companyName}</span>
                <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">{companyNameEn}</span>
              </div>
            </div>
          </div>
          <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[200px]">
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">رقم الفاتورة</span>
              <span className="text-2xl font-black text-primary" dir="ltr">
                {prefix ? `${prefix}-` : ""}{String(invoiceNumber).padStart(4, "0")}
              </span>
              <div className="mt-2 text-sm text-slate-600 font-medium">
                التاريخ: {format(new Date(date), "yyyy/MM/dd")}
              </div>
            </div>
          </div>
        </div>

        {/* Top Notes Section */}
        {topNotes && topNotes.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
             <div className="flex items-center gap-2 mb-2 text-blue-800">
               <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
               <h4 className="font-bold text-sm">ملاحظات هامة:</h4>
             </div>
             <ul className="list-inside space-y-1">
               {topNotes.filter(n => n.trim() !== "").map((note, i) => (
                 <li key={i} className="text-sm text-slate-700 leading-relaxed font-medium">• {note}</li>
               ))}
             </ul>
          </div>
        )}

        {/* Partner Info & Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50 pb-2">
              بيانات {partnerLabel}
            </h3>
            <div className="flex flex-col">
              <span className="text-sm text-slate-500 mb-1">{partnerLabel}:</span>
              <span className="text-lg font-bold text-slate-900">{partnerName}</span>
            </div>
          </div>
          <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">طريقة الدفع</span>
              <span className="text-lg font-bold text-slate-800">نقدي / كاش</span>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-green-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8 overflow-hidden border border-slate-200 rounded-2xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-4 px-4 text-right font-bold w-12">م</th>
                <th className="py-4 px-4 text-right font-bold">وصف الصنف / البيان</th>
                <th className="py-4 px-4 text-center font-bold w-24">الكمية</th>
                <th className="py-4 px-4 text-center font-bold w-32">السعر</th>
                <th className="py-4 px-4 text-center font-bold w-32">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                  <td className="py-4 px-4 text-center text-slate-500 font-bold">{index + 1}</td>
                  <td className="py-4 px-4 text-slate-800 font-bold">{item.description}</td>
                  <td className="py-4 px-4 text-center text-slate-700 font-medium">{item.quantity}</td>
                  <td className="py-4 px-4 text-center text-slate-700 font-medium">
                    {item.unitPrice.toLocaleString("ar-EG")}
                  </td>
                  <td className="py-4 px-4 text-center font-black text-slate-900">
                    {item.total.toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Terms Section */}
        <div className="flex justify-between items-stretch gap-8 min-h-[150px]">
          <div className="flex-1 flex flex-col gap-4">
             {/* Bottom Notes */}
            {notes && notes.length > 0 && notes.some(n => n.trim() !== "") && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-bold text-sm text-slate-600 mb-2">ملاحظات الفاتورة:</h4>
                <div className="space-y-1">
                  {notes.filter(n => n.trim() !== "").map((note, i) => (
                    <p key={i} className="text-xs text-slate-500 leading-relaxed font-medium">• {note}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Terms and Conditions */}
            {termsAndConditions && (
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl mt-auto">
                <h4 className="font-bold text-xs text-slate-400 uppercase mb-2">الشروط والأحكام:</h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{termsAndConditions}</p>
              </div>
            )}
          </div>
          
          <div className="w-80 flex flex-col gap-4">
            <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-xl flex-1">
              <div className="flex justify-between text-sm text-slate-400">
                <span>الإجمالي الفرعي:</span>
                <span className="font-bold">{subtotal.toLocaleString("ar-EG")} {currencyCode}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>قيمة الضريبة:</span>
                <span className="font-bold">{tax.toLocaleString("ar-EG")} {currencyCode}</span>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between items-center bg-white/5 -mx-6 px-6 -mb-6 py-6 mt-4">
                <span className="text-base font-bold text-white/80">المبلغ الإجمالي</span>
                <span className="text-2xl font-black text-green-400">{total.toLocaleString("ar-EG")} {currencyCode}</span>
              </div>
            </div>

            {/* Company Stamp */}
            {showStamp && companyStamp && (
              <div className="flex justify-center items-center py-4">
                <div className="relative group">
                  <img src={companyStamp} alt="Stamp" className="w-32 h-32 object-contain opacity-80" />
                  <div className="absolute inset-0 border-4 border-slate-200/20 rounded-full scale-110 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 flex flex-col items-center justify-center border-t border-slate-100 pt-8">
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">شكراً لتعاملكم مع {companyName}</p>
        </div>
      </div>
    );
  }
);

PrintableInvoice.displayName = "PrintableInvoice";
