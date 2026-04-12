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
  dueDate?: string | Date;
  partnerName: string;
  phone?: string;
  address?: string;
  title?: string;
  paymentStatus?: "cash" | "credit" | "pending";
  items: InvoiceItem[];
  returns?: Return[];
  subtotal: number;
  tax: number;
  total: number;
  currencyCode?: string;
  topNotes?: string[];
  topNotesTitle?: string;
  notes?: string[];
  notesTitle?: string;
  companyName?: string;
  companyNameEn?: string;
  companyLogo?: string | null;
  companyStamp?: string | null;
  companyBarcode?: string | null;
  showLogo?: boolean;
  showStamp?: boolean;
  showBarcode?: boolean;
  termsAndConditions?: string;
  isQuotation?: boolean;
  discount?: number;
  invoiceFooterNotes?: string;
}

export const PrintableInvoice = React.forwardRef<HTMLDivElement, PrintableInvoiceProps>(
  (
    {
      invoiceNumber,
      prefix,
      date,
      dueDate,
      partnerName,
      phone,
      address,
      title,
      paymentStatus = "cash",
      items,
      returns = [],
      subtotal,
      tax,
      total,
      currencyCode = "ج.م",
      topNotes,
      topNotesTitle = "ملاحظات:",
      notes,
      notesTitle = "ملاحظات إضافية",
      companyName = "شركة المحاسبة الحديثة",
      companyNameEn = "Modern Accounting Co.",
      companyLogo,
      companyStamp,
      companyBarcode,
      showLogo = true,
      showStamp = true,
      showBarcode = true,
      termsAndConditions,
      isQuotation,
      discount = 0,
      invoiceFooterNotes
    },
    ref
  ) => {
    const returnsTotal = returns.reduce((sum, ret) => sum + ret.total, 0);
    const netTotal = total - returnsTotal;

    const mainTitle = title || (isQuotation ? "عرض سعر" : "فاتورة بيع");
    const docNumberLabel = isQuotation ? "رقم العرض" : "مسلسل";

    const finalTopNotes = Array.isArray(topNotes) ? topNotes : (topNotes as any)?.items || [];
    const finalNotes = Array.isArray(notes) ? notes : (notes as any)?.items || [];

    return (
      <div ref={ref} className="hidden print:block bg-white text-slate-900 w-full p-4" dir="rtl">
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media print {
            @page { size: A4; margin: 5mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          }
          .invoice-table th { 
            background-color: #f8fafc !important; 
            color: #1e293b !important; 
            border-bottom: 2px solid #334155;
            padding: 6px;
            font-weight: 900;
            font-size: 13px;
          }
          .invoice-table td { 
            padding: 4px 10px; 
            border-bottom: 1px solid #e2e8f0;
            font-size: 13px;
            font-weight: 700;
          }
        `
          }}
        />

        <div className="max-w-full mx-auto border-2 border-slate-100 p-4 rounded-[2rem]">
          {/* ─── Header ─── */}
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-3">
            <div className="text-right">
              <h1 className="text-2xl font-black text-slate-900 mb-0.5">{companyName}</h1>
              <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">{companyNameEn}</p>
              <div className="mt-2 text-xs font-bold text-slate-600 space-y-0.5">
                <p>تاريخ الاصدار: {format(new Date(date), "yyyy/MM/dd")}</p>
                <p dir="ltr" className="text-right font-black text-base">
                   {docNumberLabel}: #{prefix ? `${prefix}-` : ""}{String(invoiceNumber).padStart(4, "0")}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              {showLogo && companyLogo && (
                <img src={companyLogo} alt="Logo" className="w-20 h-20 object-contain" />
              )}
            </div>
          </div>

          {/* ─── Title Bar ─── */}
          <div className="bg-slate-900 text-white text-center py-1.5 rounded-lg mb-4 shadow-md">
            <h2 className="text-lg font-black tracking-widest">{mainTitle}</h2>
          </div>

          {/* ─── Info Grid ─── */}
          <div className="grid grid-cols-2 gap-8 mb-4">
            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">العميل:</span>
                <div className="text-xl font-black text-slate-900 leading-none">{partnerName}</div>
              </div>
              <div className="text-xs font-bold text-slate-700 flex gap-4 italic">
                {phone && <span>هاتف: {phone}</span>}
                {address && <span>العنوان: {address}</span>}
              </div>
              {finalTopNotes.length > 0 && (
                <div className="p-2 bg-blue-50 border-r-4 border-blue-400 rounded text-[11px] font-bold text-blue-900">
                   <ul className="space-y-0.5">
                    {finalTopNotes.filter((n: string) => n.trim()).map((note: string, i: number) => (
                      <li key={i}>• {note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end justify-center space-y-2">
                {!isQuotation && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400">حالة الدفع:</span>
                    <span className={`px-4 py-0.5 rounded-full text-[10px] font-black border ${
                      paymentStatus === "cash" 
                        ? "bg-green-50 border-green-500 text-green-700" 
                        : paymentStatus === "pending"
                        ? "bg-amber-50 border-amber-500 text-amber-700"
                        : "bg-slate-50 border-slate-400 text-slate-700"
                    }`}>
                      {paymentStatus === "cash" ? "نقدي" : paymentStatus === "pending" ? "معلقة" : "آجل"}
                    </span>
                  </div>
                )}
               {(paymentStatus === "credit" || paymentStatus === "pending") && dueDate && (
                <div className="bg-slate-100 border border-slate-200 text-slate-700 px-4 py-1 rounded-lg text-center min-w-[140px]">
                  <span className="text-[9px] block font-bold opacity-70 uppercase">تاريخ الاستحقاق</span>
                  <span className="text-sm font-black">{format(new Date(dueDate), "yyyy/MM/dd")}</span>
                </div>
              )}
            </div>
          </div>

          {/* ─── Items Table ─── */}
          <div className="mb-4 border-x border-t border-slate-200 rounded-t-xl overflow-hidden">
            <table className="w-full invoice-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">م</th>
                  <th className="text-right">البيان / وصف الصنف</th>
                  <th className="w-20 text-center">الكمية</th>
                  <th className="w-28 text-center">السعر</th>
                  <th className="w-28 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="text-center text-slate-400 font-black text-xs">{index + 1}</td>
                    <td className="text-right text-[14px] text-slate-900">{item.description}</td>
                    <td className="text-center text-slate-700">{item.quantity}</td>
                    <td className="text-center text-slate-700">{item.unitPrice.toLocaleString("ar-EG")}</td>
                    <td className="text-left font-black text-slate-900">{item.total.toLocaleString("ar-EG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── Footer Section ─── */}
          <div className="flex justify-between items-start gap-8">
            {/* يمين: ملاحظات وباركود */}
            <div className="flex-1 space-y-3">
              {finalNotes.length > 0 && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-700 text-[11px]">
                  <span className="block font-black text-slate-900 mb-1 underline underline-offset-2">{notesTitle}:</span>
                  <ul className="space-y-0.5 font-bold">
                    {finalNotes.filter((n: string) => n.trim()).map((note: string, i: number) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-slate-400">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {termsAndConditions && (
                <p className="text-[9px] text-slate-400 leading-tight italic">* {termsAndConditions}</p>
              )}
              
              {showBarcode && companyBarcode && (
                <div className="flex flex-col items-start gap-1">
                   <img src={companyBarcode} alt="Verification QR" className="w-16 h-16 p-1 border rounded-lg bg-white" />
                   <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mr-1">Digital Audit</span>
                </div>
              )}
            </div>

            {/* يسار: الحسابات والختم */}
            <div className="w-64 space-y-2">
              <div className="bg-slate-50 p-3 rounded-xl space-y-1 border border-slate-200">
                <div className="flex justify-between text-[11px] font-bold text-slate-500">
                  <span>إجمالي السلع</span>
                  <span>{subtotal.toLocaleString("ar-EG")} {currencyCode}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[11px] font-bold text-red-600">
                    <span>قيمة الخصم</span>
                    <span>-{discount.toLocaleString("ar-EG")} {currencyCode}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span>الضريبة</span>
                    <span>{tax.toLocaleString("ar-EG")} {currencyCode}</span>
                  </div>
                )}
                {returnsTotal > 0 && (
                  <div className="flex justify-between text-[11px] font-bold text-red-600">
                    <span>إجمالي المرتجعات</span>
                    <span>-{returnsTotal.toLocaleString("ar-EG")} {currencyCode}</span>
                  </div>
                )}
                <div className="border-t border-slate-300 pt-1 mt-1 flex justify-between items-center">
                  <span className="text-sm font-black text-slate-900">الصافي</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-slate-900">{netTotal.toLocaleString("ar-EG")}</span>
                    <span className="text-[10px] font-black mr-1 text-slate-500">{currencyCode}</span>
                  </div>
                </div>
              </div>

              {showStamp && companyStamp && (
                <div className="flex justify-center pt-1">
                   <img src={companyStamp} alt="Official Stamp" className="w-24 h-24 object-contain opacity-80 mix-blend-multiply" />
                </div>
              )}
            </div>
          </div>

          {/* ─── Bottom Section (شكراً والملاحظات الاضافية) ─── */}
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
             <div className="flex justify-center">
                <div className="inline-flex items-center gap-3 px-6 py-0.5 border-b border-slate-200">
                    <span className="text-xs font-black text-slate-800">شكراً لثقتكم بنا</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="text-xs font-black text-slate-900 tracking-wide">{companyName}</span>
                </div>
             </div>
             
             {invoiceFooterNotes && (
                <div className="text-right px-4">
                   <p className="text-[10px] font-bold whitespace-pre-line leading-relaxed">{invoiceFooterNotes}</p>
                </div>
             )}
            
          </div>
        </div>
        {/* Branding Row */}
<div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center opacity-40 select-none grayscale">
  <p className="text-[10px] font-medium tracking-widest text-gray-500">
    POWERED BY <span className="font-bold text-black">FAST SYSTEM</span>
  </p>
  <p className="text-[10px] italic text-gray-400">
    دقة في الأداء.. سرعة في الإنجاز
  </p>
</div>
      </div>
    );
  }
);

PrintableInvoice.displayName = "PrintableInvoice";