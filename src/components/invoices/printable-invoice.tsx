import React from "react";
import { format } from "date-fns";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PrintableInvoiceProps {
  invoiceNumber: number;
  date: string | Date;
  partnerName: string;
  partnerLabel: string; // "العميل" or "المورد"
  title: string; // "فاتورة مبيعات" or "فاتورة مشتريات"
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export const PrintableInvoice = React.forwardRef<HTMLDivElement, PrintableInvoiceProps>(
  ({ invoiceNumber, date, partnerName, partnerLabel, title, items, subtotal, tax, total }, ref) => {
    return (
      <div ref={ref} className="hidden print:block print:p-8 bg-white text-black" dir="rtl">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            <p className="text-lg font-medium">مصنع الطوب</p>
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold mb-1">فاتورة #{invoiceNumber}</h2>
            <p className="text-sm text-gray-600">
              التاريخ: {format(new Date(date), "yyyy-MM-dd")}
            </p>
          </div>
        </div>

        {/* Partner Info */}
        <div className="mb-8 p-4 border border-gray-300 rounded-lg">
          <h3 className="text-lg font-bold mb-2 border-b border-gray-200 pb-2">
            بيانات {partnerLabel}
          </h3>
          <p className="text-lg">
            <span className="font-semibold">{partnerLabel}:</span> {partnerName}
          </p>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-right">م</th>
                <th className="border border-gray-300 p-2 text-right">البيان</th>
                <th className="border border-gray-300 p-2 text-center w-24">الكمية</th>
                <th className="border border-gray-300 p-2 text-center w-32">السعر</th>
                <th className="border border-gray-300 p-2 text-center w-32">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                  <td className="border border-gray-300 p-2">{item.description}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    {item.unitPrice.toLocaleString("ar-EG")}
                  </td>
                  <td className="border border-gray-300 p-2 text-center font-bold">
                    {item.total.toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-1/2 border border-gray-300 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>الإجمالي قبل الضريبة:</span>
              <span className="font-mono">{subtotal.toLocaleString("ar-EG")} ج.م</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>الضريبة:</span>
              <span className="font-mono">{tax.toLocaleString("ar-EG")} ج.م</span>
            </div>
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>الإجمالي النهائي:</span>
                <span>{total.toLocaleString("ar-EG")} ج.م</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-gray-500 border-t border-gray-200 pt-4">
          <p>شكراً لتعاملكم معنا</p>
        </div>
      </div>
    );
  }
);

PrintableInvoice.displayName = "PrintableInvoice";
