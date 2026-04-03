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
  dueDate?: string | Date; // تاريخ الاستحقاق
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
  companyBarcode?: string | null; // باركود الشركة
  showLogo?: boolean;
  showStamp?: boolean;
  showBarcode?: boolean;
  termsAndConditions?: string;
  isQuotation?: boolean;
  discount?: number;
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
      discount = 0
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
      <div ref={ref} className="hidden print:block bg-white text-slate-900 w-full p-6" dir="rtl">
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media print {
            @page { size: A4; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          }
          .invoice-table th { 
            background-color: #f8fafc !important; 
            color: #1e293b !important; 
            border-bottom: 2px solid #334155;
            padding: 10px;
            font-weight: 900;
            font-size: 15px;
          }
          .invoice-table td { 
            padding: 8px 10px; 
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
            font-weight: 700;
          }
        `
          }}
        />

        <div className="max-w-full mx-auto border-2 border-slate-100 p-6 rounded-3xl">
          {/* ─── Header: لوجو في طرف واسم الشركة في طرف ─── */}
          <div className="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-6">
            <div className="text-right">
              <h1 className="text-4xl font-black text-slate-900 mb-1">{companyName}</h1>
              <p className="text-sm font-bold text-slate-400 tracking-[0.3em] uppercase">{companyNameEn}</p>
              <div className="mt-4 text-sm font-bold text-slate-600 space-y-1">
                <p>تاريخ الاصدار: {format(new Date(date), "yyyy/MM/dd")}</p>
                <p dir="ltr" className="text-right font-black text-lg">
                   {docNumberLabel}: #{prefix ? `${prefix}-` : ""}{String(invoiceNumber).padStart(4, "0")}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              {showLogo && companyLogo && (
                <img src={companyLogo} alt="Logo" className="w-32 h-32 object-contain" />
              )}
            </div>
          </div>

          {/* ─── Title Bar ─── */}
          <div className="bg-slate-900 text-white text-center py-3 rounded-xl mb-8 shadow-lg">
            <h2 className="text-2xl font-black tracking-widest">{mainTitle}</h2>
          </div>

          {/* ─── Info Grid: بيانات العميل والدفع ─── */}
          <div className="grid grid-cols-2 gap-12 mb-8">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">العميل:</span>
                <div className="text-3xl font-black text-slate-900 leading-none">{partnerName}</div>
              </div>
              <div className="text-base font-bold text-slate-700 flex gap-6 italic">
                {phone && <span>هاتف: {phone}</span>}
                {address && <span>العنوان: {address}</span>}
              </div>
              {finalTopNotes.length > 0 && (
                <div className="p-3 bg-blue-50 border-r-4 border-blue-500 rounded text-sm font-bold text-blue-900">
                  {finalTopNotes.filter((n: string) => n.trim()).join(" | ")}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end justify-center space-y-3">
               <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-400">حالة الدفع:</span>
                  <span className={`px-6 py-1 rounded-full text-sm font-black border-2 ${paymentStatus === "cash" ? "bg-green-50 border-green-500 text-green-700" : "bg-orange-50 border-orange-500 text-orange-700"}`}>
                    {paymentStatus === "cash" ? "نقدي" : "آجل"}
                  </span>
               </div>
               {paymentStatus === "credit" && dueDate && (
                <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-md text-center min-w-[180px]">
                  <span className="text-[10px] block font-bold opacity-80 uppercase">تاريخ الاستحقاق</span>
                  <span className="text-lg font-black">{format(new Date(dueDate), "yyyy/MM/dd")}</span>
                </div>
              )}
            </div>
          </div>

          {/* ─── Items Table ─── */}
          <div className="mb-8 border-x border-t border-slate-200 rounded-t-2xl overflow-hidden shadow-sm">
            <table className="w-full invoice-table">
              <thead>
                <tr>
                  <th className="w-16 text-center">م</th>
                  <th className="text-right">البيان / وصف الصنف</th>
                  <th className="w-24 text-center">الكمية</th>
                  <th className="w-32 text-center">السعر</th>
                  <th className="w-32 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="text-center text-slate-400 font-black">{index + 1}</td>
                    <td className="text-right text-lg text-slate-900">{item.description}</td>
                    <td className="text-center text-slate-700">{item.quantity}</td>
                    <td className="text-center text-slate-700">{item.unitPrice.toLocaleString("ar-EG")}</td>
                    <td className="text-left font-black text-slate-900">{item.total.toLocaleString("ar-EG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── Footer Section: باركود يقابله ختم ─── */}
          <div className="flex justify-between items-start gap-10">
            {/* يمين: ملاحظات وباركود */}
            <div className="flex-1 space-y-6">
              {finalNotes.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic font-bold text-slate-600 text-sm">
                  <span className="block font-black text-slate-900 not-italic mb-2 underline tracking-tighter">{notesTitle}:</span>
                  {finalNotes.filter((n: string) => n.trim()).join(" - ")}
                </div>
              )}
              {termsAndConditions && (
                <p className="text-[11px] text-slate-400 leading-tight">* {termsAndConditions}</p>
              )}
              
              {showBarcode && companyBarcode && (
                <div className="flex flex-col items-start gap-1">
                   <img src={companyBarcode} alt="Verification QR" className="w-24 h-24 p-1 border rounded-xl" />
                   <span className="text-[10px] font-black text-slate-300 uppercase mr-2 tracking-widest">Digital Audit</span>
                </div>
              )}
            </div>

            {/* يسار: الحسابات والختم */}
            <div className="w-80 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-200">
                <div className="flex justify-between text-sm font-bold text-slate-500">
                  <span>إجمالي السلع</span>
                  <span>{subtotal.toLocaleString("ar-EG")} {currencyCode}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm font-bold text-red-600">
                    <span>الخصم</span>
                    <span>-{discount.toLocaleString("ar-EG")} {currencyCode}</span>
                  </div>
                )}
                <div className="border-t border-slate-300 pt-2 flex justify-between items-center">
                  <span className="text-lg font-black text-slate-900">الصافي</span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-900">{netTotal.toLocaleString("ar-EG")}</span>
                    <span className="text-sm font-black mr-1">{currencyCode}</span>
                  </div>
                </div>
              </div>

              {showStamp && companyStamp && (
                <div className="flex justify-center pt-4">
                   <img src={companyStamp} alt="Official Stamp" className="w-32 h-32 object-contain opacity-80 mix-blend-multiply drop-shadow-sm" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 pt-4 border-t border-slate-100 text-center text-[10px] font-bold text-slate-300 tracking-[0.5em] uppercase">
             {companyNameEn} • All Rights Reserved 2026
          </div>
        </div>
      </div>
    );
  }
);

PrintableInvoice.displayName = "PrintableInvoice";