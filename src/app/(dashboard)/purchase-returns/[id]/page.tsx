"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Edit } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPurchaseReturnById } from "../actions";
import { toast } from "sonner";

export default function PurchaseReturnDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getPurchaseReturnById(Number(id)).then(res => {
        if (res.success) {
          setData(res.data);
        } else {
          toast.error("فشل تحميل بيانات المرتجع");
        }
        setLoading(false);
      });
    }
  }, [id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">قيد الانتظار</span>;
      case 'completed': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">مكتمل</span>;
      case 'rejected': return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">مرفوض</span>;
      default: return <span>{status}</span>;
    }
  };

  if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;
  if (!data) return <div className="p-10 text-center">لم يتم العثور على المرتجع</div>;

  return (
    <>
      <Navbar title={`مرتجع مشتريات رقم ${data.returnNumber}`} />
      <div className="p-6" dir="rtl">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="ml-2 h-4 w-4" /> رجوع
        </Button>

        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>تفاصيل المرتجع</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">رقم المرتجع</p>
                  <p className="font-bold">{data.returnNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">التاريخ</p>
                  <p>{new Date(data.returnDate).toLocaleDateString('ar-EG')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">الفاتورة الأصلية</p>
                  <p>{data.invoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">المورد</p>
                  <p>{data.supplier.name} (كود: {data.supplier.code})</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">الحالة</p>
                  <div>{getStatusBadge(data.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">طريقة الرد</p>
                  <p>{data.refundMethod === 'cash' ? 'نقدي' : data.refundMethod === 'safe' ? 'خزنة' : data.refundMethod === 'bank' ? 'بنك' : 'أجل'}</p>
                </div>
                {data.reason && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">سبب الإرجاع</p>
                    <p>{data.reason}</p>
                  </div>
                )}
                {data.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">ملاحظات</p>
                    <p>{data.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ملخص المبالغ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-bold">{data.subtotal.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span>الخصم:</span>
                <span className="font-bold">{data.discount.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span>الضريبة:</span>
                <span className="font-bold">{data.totalTax.toLocaleString()} ج.م</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg">
                <span>الإجمالي النهائي:</span>
                <span className="font-bold text-emerald-600">{data.total.toLocaleString()} ج.م</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>الأصناف المرتجعة</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-2">الوصف</th>
                  <th className="text-right py-2">الكمية</th>
                  <th className="text-right py-2">سعر الوحدة</th>
                  <th className="text-right py-2">الضريبة %</th>
                  <th className="text-right py-2">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2">{item.unitPrice.toLocaleString()}</td>
                    <td className="py-2">{item.taxRate}%</td>
                    <td className="py-2 font-bold">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-2 justify-end">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="ml-2 h-4 w-4" /> طباعة
          </Button>
          <Button onClick={() => router.push(`/purchase-returns/${id}/edit`)}>
            <Edit className="ml-2 h-4 w-4" /> تعديل
          </Button>
        </div>
      </div>
    </>
  );
}