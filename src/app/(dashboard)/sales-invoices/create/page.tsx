"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Trash2, UserPlus, Save, Calculator } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner"; 
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

// يتم استيراد البيانات، وفي حالة عدم وجود داتا بيز حالياً ستكون المصفوفة فارغة
import { customers } from "@/mock-data"; 

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // خانة الضريبة المضافة لكل صنف
  total: number;
}

export default function CreateSalesInvoicePage() {
  const router = useRouter();

  // 1. حالات الحالة (States)
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customerQuery, setCustomerQuery] = useState<string>(""); 
  const [customerInfo, setCustomerInfo] = useState({ name: "لم يحدد", address: "غير معروف", phone: "-" });
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", description: "", quantity: 0, unitPrice: 0, taxRate: 14, total: 0 },
  ]);

  // 2. منطق البحث عن العميل (بالكود أو الاسم)
  useEffect(() => {
    if (!customerQuery.trim()) {
      setCustomerInfo({ name: "لم يحدد", address: "غير معروف", phone: "-" });
      return;
    }

    const found = customers.find(c => 
      c.id.toString() === customerQuery || 
      c.name.includes(customerQuery)
    );

    if (found) {
      setCustomerInfo({
        name: found.name,
        address: found.address || "غير محدد",
        phone: found.phone || "غير محدد"
      });
    } else {
      setCustomerInfo({ name: "عميل جديد / غير مسجل", address: "-", phone: "-" });
    }
  }, [customerQuery]);

  // 3. إدارة العناصر
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: "", quantity: 0, unitPrice: 0, taxRate: 0, total: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // التأكد من أن القيم الرقمية لا تقل عن 0
          let finalValue = value;
          if (field === "quantity" || field === "unitPrice" || field === "taxRate") {
            finalValue = Math.max(0, Number(value));
          }

          const updated = { ...item, [field]: finalValue };
          
          const basePrice = Number(updated.quantity) * Number(updated.unitPrice);
          const taxValue = basePrice * (Number(updated.taxRate) / 100);
          updated.total = basePrice + taxValue;
          
          return updated;
        }
        return item;
      })
    );
  };

  // 4. الحسابات الإجمالية للفاتورة
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0), [items]);
  const totalTax = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice) * (Number(item.taxRate) / 100)), 0), [items]);
  const grandTotal = subtotal + totalTax;

  // دالة تفريغ الفاتورة (Reset)
  const handleReset = () => {
    setCustomerQuery("");
    setCustomerInfo({ name: "لم يحدد", address: "غير معروف", phone: "-" });
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setItems([{ id: "1", description: "", quantity: 0, unitPrice: 0, taxRate: 0, total: 0 }]);
    toast.info("تم إلغاء الفاتورة وتفريغ البيانات");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (grandTotal === 0) {
      toast.error("لا يمكن حفظ فاتورة فارغة");
      return;
    }
    toast.success("تم حفظ فاتورة البيع بنجاح");
    router.push("/sales-invoices");
  };

  return (
    <>
      <Navbar title="فاتورة مبيعات جديدة" />
      <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen" dir="rtl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="rounded-full shadow-sm">
              <Link href="/sales-invoices"><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">إنشاء فاتورة مبيعات</h2>
              <p className="text-muted-foreground font-medium">نظام إدارة مبيعات مصنع الطوب</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5 shadow-sm" asChild>
            <Link href="/customers/new"><UserPlus className="h-4 w-4" /> تعريف عميل جديد</Link>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-4">
          
          <div className="lg:col-span-3 space-y-6">
            {/* Customer Details */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="w-2 h-6 bg-primary rounded-full" /> بيانات العميل الأساسية
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-4 pt-6 bg-white">
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-slate-600 font-semibold">بحث (كود / اسم)</Label>
                  <Input 
                    placeholder="اكتب الكود أو الاسم..."
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    className="bg-slate-50 border-slate-200 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">اسم العميل</Label>
                  <Input value={customerInfo.name} disabled className="bg-muted/30 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">رقم الهاتف</Label>
                  <Input value={customerInfo.phone} disabled className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">تاريخ الفاتورة</Label>
                  <Input 
                    type="date" 
                    value={invoiceDate} 
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-white border-b py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="w-2 h-6 bg-orange-500 rounded-full" /> تفاصيل الأصناف والضريبة
                </CardTitle>
                <Button type="button" onClick={addItem} size="sm" className="bg-orange-600 hover:bg-orange-700 gap-2 shadow-md">
                  <Plus className="h-4 w-4" /> إضافة صنف
                </Button>
              </CardHeader>
              <CardContent className="p-0 bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-right font-bold text-slate-700">الصنف</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 w-24">الكمية</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 w-28">السعر</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 w-24">الضريبة %</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 w-32">الإجمالي</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <Input
                            placeholder="مثال: طوب أحمر مفرغ"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                            className="border-none focus-visible:ring-1 shadow-none bg-transparent"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                            className="bg-slate-50 border-slate-200"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))}
                            className="bg-slate-50 border-slate-200"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) => updateItem(item.id, "taxRate", Number(e.target.value))}
                            className="bg-orange-50 border-orange-200 text-orange-700 font-bold"
                          />
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          {item.total.toLocaleString()} ج.م
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden">
              <CardHeader className="border-b border-white/10 py-4">
                <CardTitle className="text-lg flex items-center gap-2 font-bold">
                  <Calculator className="h-5 w-5 text-orange-400" /> ملخص الفاتورة
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-sm">الإجمالي (قبل الضريبة):</span>
                  <span className="font-mono text-white">{subtotal.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-sm">إجمالي الضرائب:</span>
                  <span className="font-mono text-orange-400">+{totalTax.toLocaleString()} ج.م</span>
                </div>
                <Separator className="bg-white/10" />
                <div className="flex flex-col gap-1 pt-2">
                  <span className="text-xs text-slate-400 font-medium">صافي المطلوب سداده:</span>
                  <span className="text-3xl font-black text-green-400 leading-none">
                    {grandTotal.toLocaleString()} <span className="text-sm">ج.م</span>
                  </span>
                </div>

                {/* أزرار التحكم */}
                <div className="space-y-3 pt-6">
                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg gap-2 font-bold py-6 text-lg transition-all active:scale-95"
                  >
                    <Save className="h-5 w-5" /> حفظ الفاتورة
                  </Button>
                  
                  <Button 
                    type="button" 
                    onClick={handleReset}
                    variant="ghost"
                    className="w-full text-slate-400 hover:text-red-400 hover:bg-red-400/10 gap-2 font-medium transition-colors"
                  >
                    <Trash2 className="h-4 w-4" /> إلغاء وتفريغ الفاتورة
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white p-4">
              <p className="text-xs text-muted-foreground text-center italic leading-relaxed">
                * جميع الحسابات تتم تلقائياً بناءً على الكمية وسعر الوحدة المضاف لكل صنف.
              </p>
            </Card>
          </div>
        </form>
      </div>
    </>
  );
}