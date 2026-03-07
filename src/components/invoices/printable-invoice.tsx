import React from "react";
import { format } from "date-fns";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ReturnItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Return {
  id: number;
  returnDate: string | Date;
  total: number;
  items: ReturnItem[];
}

interface PrintableInvoiceProps {
  invoiceNumber: string | number;
  prefix?: string;
  date: string | Date;
  partnerName: string;
  partnerLabel: string;
  title: string;
  paymentStatus?: "cash" | "credit" | "pending";
  items: InvoiceItem[];
  returns?: Return[];
  subtotal: number;
  tax: number;
  total: number;
  currencyCode?: string;
  topNotes?: string[];
  notes?: string[];
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
    paymentStatus = "cash",
    items, returns = [], subtotal, tax, total, currencyCode = "ج.م", topNotes, notes,
    companyName = "شركة المحاسبة الحديثة",
    companyNameEn = "Modern Accounting Co.",
    companyLogo,
    companyStamp,
    showLogo = true,
    showStamp = true,
    termsAndConditions
  }, ref) => {
    const returnsTotal = returns.reduce((sum, ret) => sum + ret.total, 0);
    const netTotal = total - returnsTotal;

    const getPaymentLabel = (status: string) => {
      switch (status) {
        case "cash": return "نقدي";
        case "credit": return "آجل";
        case "pending": return "قيد التأكيد";
        default: return "غير محدد";
      }
    };

    return (
      <div ref={ref} className="hidden print:block bg-white text-slate-800 p-4" dir="rtl">
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: A4;
            margin: 15mm;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            .avoid-break { break-inside: avoid; }
          }
          .custom-table th { background-color: #f8fafc !important; color: #475569 !important; border-bottom: 2px solid #e2e8f0; }
          .total-card { background-color: #f1f5f9 !important; border: 2px solid #334155 !important; }
        `}} />

        {/* ─── Header ─── */}
        <div className="flex justify-between items-center border-b-2 border-slate-100 pb-6 mb-8 avoid-break">
          <div className="flex items-center gap-5">
            {showLogo && companyLogo && (
              <img src={companyLogo} alt="Logo" className="w-20 h-20 object-contain rounded-lg" />
            )}
            <div>
              <h1 className="text-2xl font-black text-slate-900">{title}</h1>
              <p className="text-md font-bold text-slate-600">{companyName}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{companyNameEn}</p>
            </div>
          </div>

          <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">رقم الفاتورة</div>
            <div className="text-xl font-black text-slate-900" dir="ltr">
              #{prefix ? `${prefix}-` : ""}{String(invoiceNumber).padStart(4, "0")}
            </div>
            <div className="text-xs mt-2 text-slate-500 font-medium">
              تاريخ الإصدار: {format(new Date(date), "yyyy/MM/dd")}
            </div>
          </div>
        </div>

        {/* ─── Info Grid ─── */}
        <div className="grid grid-cols-2 gap-6 mb-8 avoid-break">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">مُوجه إلى:</span>
            <div className="text-lg font-bold text-slate-800">{partnerName}</div>
            <div className="text-sm text-slate-500">{partnerLabel}</div>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">طريقة الدفع:</span>
            <span className={`px-4 py-1 rounded-full text-xs font-bold ${paymentStatus === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {getPaymentLabel(paymentStatus)}
            </span>
          </div>
        </div>

        {/* ─── Top Notes ─── */}
        {topNotes && topNotes.filter(n => n.trim()).length > 0 && (
          <div className="mb-6 avoid-break bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">ملاحظات هامة:</h4>
            <ul className="space-y-1">
              {topNotes.filter(n => n.trim()).map((note, i) => (
                <li key={i} className="text-xs text-slate-600 flex gap-2">
                  <span className="text-slate-300">•</span> {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ─── Items Table ─── */}
        <div className="mb-8 avoid-break rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm custom-table">
            <thead>
              <tr>
                <th className="p-4 text-right w-12">#</th>
                <th className="p-4 text-right">وصف الصنف</th>
                <th className="p-4 text-center w-24">الكمية</th>
                <th className="p-4 text-center w-32">سعر الوحدة</th>
                <th className="p-4 text-left w-32">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50">
                  <td className="p-4 text-slate-400 font-medium text-center">{index + 1}</td>
                  <td className="p-4 font-semibold text-slate-700">{item.description}</td>
                  <td className="p-4 text-center text-slate-600">{item.quantity}</td>
                  <td className="p-4 text-center text-slate-600">{item.unitPrice.toLocaleString("ar-EG")}</td>
                  <td className="p-4 text-left font-bold text-slate-900">{item.total.toLocaleString("ar-EG")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── Returns (If any) ─── */}
        {returns && returns.length > 0 && (
          <div className="mb-8 avoid-break">
            <h3 className="text-xs font-bold text-red-500 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              المرتجعات المخصومة
            </h3>
            <div className="rounded-xl border border-red-100 overflow-hidden">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-red-50/50">
                  {returns.flatMap(ret => ret.items).map((item, index) => (
                    <tr key={index} className="bg-red-50/30">
                      <td className="p-3 text-slate-500 text-center w-12">{index + 1}</td>
                      <td className="p-3 text-slate-700">{item.description}</td>
                      <td className="p-3 text-center w-24">-{item.quantity}</td>
                      <td className="p-3 text-left font-bold text-red-600 w-32">-{item.total.toLocaleString("ar-EG")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Bottom Section ─── */}
        <div className="flex justify-between items-start gap-12 avoid-break">
          {/* Notes */}
          <div className="flex-1 space-y-4">
            {notes && notes.filter(n => n.trim()).length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">ملاحظات:</h4>
                <ul className="space-y-1">
                  {notes.filter(n => n.trim()).map((note, i) => (
                    <li key={i} className="text-xs text-slate-600 flex gap-2">
                      <span className="text-slate-300">•</span> {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {termsAndConditions && (
              <div className="mt-4 avoid-break">
                <div
                  className="p-4 rounded-xl border-r-4"
                  style={{
                    backgroundColor: "#f8fafc",
                    borderColor: "#cbd5e1",
                    borderWidth: "1px 0px 1px 4px",
                    borderStyle: "solid"
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                      الشروط والأحكام
                    </h4>
                  </div>
                  <p
                    className="text-[10px] leading-relaxed text-slate-600 font-medium whitespace-pre-wrap pr-3"
                    style={{ textAlign: "justify" }}
                  >
                    {termsAndConditions}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="w-80 space-y-2">
            <div className="flex justify-between px-2 text-sm text-slate-500">
              <span>الإجمالي الفرعي</span>
              <span className="font-semibold">{subtotal.toLocaleString("ar-EG")} {currencyCode}</span>
            </div>
            
            {tax > 0 && (
              <div className="flex justify-between px-2 text-sm text-slate-500">
                <span>الضريبة المضافة</span>
                <span className="font-semibold">{tax.toLocaleString("ar-EG")} {currencyCode}</span>
              </div>
            )}

            {returnsTotal > 0 && (
              <div className="flex justify-between px-2 text-sm text-red-500">
                <span>إجمالي المرتجعات</span>
                <span className="font-semibold">-{returnsTotal.toLocaleString("ar-EG")} {currencyCode}</span>
              </div>
            )}

            {/* الصافي النهائي */}
            <div className="total-card mt-4 p-5 rounded-2xl text-slate-900 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">الصافي النهائي المستحق</div>
                <div className="flex justify-between items-baseline">
                  <span className="text-4xl font-black tracking-tighter">
                    {netTotal.toLocaleString("ar-EG")}
                  </span>
                  <span className="text-lg font-bold mr-2">{currencyCode}</span>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 text-slate-200 opacity-20 transform -rotate-12">
                <svg width="100" height="100" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.82v-1.91c-1.54-.13-3.04-.81-4.08-1.9l1.61-1.61c.83.85 1.72 1.25 2.76 1.35.81.08 1.53-.19 1.53-.9 0-.46-.3-.79-1.29-1.22-1.39-.61-3.23-1.42-3.23-3.52 0-1.66 1.09-2.99 2.71-3.39V5h2.82v1.9c1.23.11 2.37.58 3.19 1.34l-1.6 1.59c-.48-.46-1.07-.76-1.88-.85-.56-.06-1.16.07-1.16.69 0 .5.39.75 1.55 1.25 1.73.74 2.97 1.74 2.97 3.51.01 1.83-1.26 3.14-3.08 3.47z"/></svg>
              </div>
            </div>

            {showStamp && companyStamp && (
              <div className="flex justify-center pt-4">
                <img src={companyStamp} alt="Stamp" className="w-24 h-24 object-contain opacity-80 mix-blend-multiply" />
              </div>
            )}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div className="mt-12 pt-6 border-t border-slate-100 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            شكراً لثقتكم بنا • {companyNameEn}
          </p>
        </div>
      </div>
    );
  }
);

PrintableInvoice.displayName = "PrintableInvoice";