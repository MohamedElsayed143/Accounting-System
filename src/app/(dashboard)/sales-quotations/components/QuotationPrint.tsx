// components/QuotationPrint.tsx
import React from "react";
import { format } from "date-fns";

interface QuotationItem {
  description: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

interface QuotationPrintProps {
  code: string;
  date: string | Date;
  customerName: string;
  customerCode?: number;
  customerPhone?: string;
  customerAddress?: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  total: number;
  notes?: string[];
  // Company Settings
  companyName?: string;
  companyNameEn?: string;
  companyLogo?: string | null;
  companyStamp?: string | null;
  showLogo?: boolean;
  showStamp?: boolean;
}

export const QuotationPrint = React.forwardRef<HTMLDivElement, QuotationPrintProps>(
  ({ 
    code, date, customerName, customerCode, customerPhone, customerAddress, items, subtotal, discount, total, notes,
    companyName = "شركة المحاسبة الحديثة",
    companyNameEn = "Modern Accounting Co.",
    companyLogo,
    companyStamp,
    showLogo = true,
    showStamp = true,
  }, ref) => {
    return (
      <div ref={ref} className="hidden print:block print:p-10 bg-white text-black min-h-screen" dir="rtl">
        {/* Header Section */}
        <div className="flex justify-between items-start border-b-4 border-primary pb-6 mb-8">
          <div className="flex items-start gap-4">
            {showLogo && companyLogo && (
              <img src={companyLogo} alt="Logo" className="w-20 h-20 object-contain rounded-lg" />
            )}
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-primary mb-2 tracking-tight">عرض سعر</h1>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-slate-800">{companyName}</span>
                <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">{companyNameEn}</span>
              </div>
            </div>
          </div>
          <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">رقم العرض</span>
              <span className="text-2xl font-black text-primary">{code}</span>
              <div className="mt-2 text-sm text-slate-600 font-medium">
                التاريخ: {format(new Date(date), "yyyy/MM/dd")}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50 pb-2">
              بيانات العميل
            </h3>
            <div className="space-y-2">
              <div className="flex flex-col">
                <span className="text-sm text-slate-500 mb-1">اسم العميل:</span>
                <span className="text-lg font-bold text-slate-900">{customerName || "عميل عام"}</span>
              </div>
              {customerCode && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">كود العميل:</span>
                  <span className="text-sm font-bold text-slate-700">{customerCode}</span>
                </div>
              )}
              {customerPhone && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">الهاتف:</span>
                  <span className="text-sm font-bold text-slate-700">{customerPhone}</span>
                </div>
              )}
              {customerAddress && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">العنوان:</span>
                  <span className="text-sm font-bold text-slate-700">{customerAddress}</span>
                </div>
              )}
            </div>
          </div>
          <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">نوع المستند</span>
              <span className="text-lg font-bold text-slate-800">عرض سعر</span>
              <span className="text-xs text-slate-500 mt-1">هذا العرض لأغراض إعلامية فقط</span>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8 overflow-hidden border border-slate-200 rounded-2xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-4 px-4 text-right font-bold w-12">م</th>
                <th className="py-4 px-4 text-right font-bold">المنتج / البيان</th>
                <th className="py-4 px-4 text-center font-bold w-24">الكمية</th>
                <th className="py-4 px-4 text-center font-bold w-32">السعر</th>
                <th className="py-4 px-4 text-center font-bold w-24">الخصم %</th>
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
                    {item.price.toLocaleString("ar-EG")}
                  </td>
                  <td className="py-4 px-4 text-center text-slate-700 font-medium">
                    {item.discount > 0 ? `${item.discount}%` : "-"}
                  </td>
                  <td className="py-4 px-4 text-center font-black text-slate-900">
                    {item.total.toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-between items-start gap-8">
          <div className="flex-1">
            {notes && notes.length > 0 && notes.some(n => n.trim() !== "") && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl h-full">
                <h4 className="font-bold text-sm text-slate-600 mb-2">ملاحظات:</h4>
                <div className="space-y-1">
                  {notes.filter(n => n.trim() !== "").map((note, i) => (
                    <p key={i} className="text-xs text-slate-500 leading-relaxed font-medium">• {note}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="w-80 bg-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between text-sm text-slate-400">
              <span>الإجمالي:</span>
              <span className="font-bold">{subtotal.toLocaleString("ar-EG")} ج.م</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-slate-400">
                <span>الخصم:</span>
                <span className="font-bold text-red-400">-{discount.toLocaleString("ar-EG")} ج.م</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-4 flex justify-between items-center bg-white/5 -mx-6 px-6 -mb-6 py-6 mt-4">
              <span className="text-base font-bold text-white/80">الصافي</span>
              <span className="text-2xl font-black text-green-400">{total.toLocaleString("ar-EG")} ج.م</span>
            </div>
          </div>

          {/* Company Stamp */}
          {showStamp && companyStamp && (
            <div className="w-80 flex flex-col items-center justify-center">
              <div className="relative group">
                <img src={companyStamp} alt="Stamp" className="w-32 h-32 object-contain opacity-80" />
                <div className="absolute inset-0 border-4 border-slate-200/20 rounded-full scale-110 pointer-events-none" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-2">ختم وتوقيع المعتمد</p>
            </div>
          )}
        </div>

        {/* Signature Area */}
        <div className="mt-16 grid grid-cols-2 gap-16">
          <div className="text-center">
            <p className="text-sm font-bold text-slate-600 mb-16">توقيع العميل</p>
            <div className="border-b-2 border-slate-300 mx-8" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-600 mb-16">توقيع المسؤول</p>
            <div className="border-b-2 border-slate-300 mx-8" />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 flex flex-col items-center justify-center border-t border-slate-100 pt-10">
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">شكراً لتعاملكم مع {companyName}</p>
        </div>
      </div>
    );
  }
);

QuotationPrint.displayName = "QuotationPrint";
