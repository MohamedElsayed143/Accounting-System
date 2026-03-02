// app/(dashboard)/purchase-returns/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, X, FileText, User, Calendar, Hash, Tag, Percent, DollarSign, CreditCard, Landmark } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createPurchaseReturn, type PurchaseReturnInput } from "../actions";
import { getSuppliers, getSafes } from "../../reports/actions";
import { getPurchaseInvoiceWithReturns } from "../../purchase-invoices/actions";
import { getBanks } from "../../treasury/actions";
import { getProducts, ProductData } from "../../inventory/products/actions";

export default function NewPurchaseReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [safes, setSafes] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [formData, setFormData] = useState({
    returnNumber: 0,
    invoiceId: "",
    supplierId: "",
    returnDate: new Date().toISOString().split("T")[0],
    subtotal: 0,
    discount: 0,
    totalTax: 0,
    total: 0,
    reason: "",
    status: "pending",
    refundMethod: "cash",
    safeId: "",
    bankId: "",
    description: "",
  });

  useEffect(() => {
    Promise.all([
      getSuppliers(),
      getBanks(true),
      getSafes(),
      getProducts(),
    ]).then(([suppliersData, banksData, safesData, productsData]) => {
      setSuppliers(suppliersData);
      setBanks(banksData);
      setSafes(safesData);
      setProducts(productsData);

      // تعيين الخزنة الرئيسية افتراضياً إن وجدت
      const primarySafe = safesData.find((s: any) => s.isPrimary) || safesData[0];
      if (primarySafe) {
        setFormData(prev => ({ ...prev, safeId: primarySafe.id.toString() }));
      }
    });
  }, []);

  const handleSupplierChange = async (supplierId: string) => {
    setFormData(prev => ({ ...prev, supplierId, invoiceId: "" }));
    setItems([]);
    setInvoiceTotal(0);
    if (supplierId) {
      const { getPurchaseInvoicesBySupplier } = await import("../../purchase-invoices/actions");
      const fetched = await getPurchaseInvoicesBySupplier(parseInt(supplierId));
      // نجلب معها returnsTotal لعرض الرصيد المتبقي
      const invoicesWithReturns = await Promise.all(fetched.map(async (inv: any) => {
        const fullInv = await getPurchaseInvoiceWithReturns(inv.id);
        return {
          ...inv,
          returnsTotal: fullInv?.purchaseReturns?.reduce((sum: number, ret: any) => sum + ret.total, 0) || 0
        };
      }));
      // تصفية الفواتير التي لها رصيد متبقي > 0 فقط
      const filteredInvoices = invoicesWithReturns.filter(inv => (inv.total - (inv.returnsTotal || 0)) > 0);
      setInvoices(filteredInvoices);
    } else {
      setInvoices([]);
    }
  };

  const handleInvoiceSelect = async (invoiceId: string) => {
    setFormData(prev => ({ ...prev, invoiceId }));
    if (invoiceId) {
      const invoiceData = await getPurchaseInvoiceWithReturns(parseInt(invoiceId));
      if (invoiceData) {
        // التحقق من أن الفاتورة لا تزال لديها رصيد
        const totalReturns = invoiceData.purchaseReturns?.reduce((sum: number, ret: any) => sum + ret.total, 0) || 0;
        const remaining = invoiceData.total - totalReturns;
        if (remaining <= 0) {
          toast.error("لا يمكن إرجاع هذه الفاتورة لأن رصيدها بالكامل قد استُرد");
          setFormData(prev => ({ ...prev, invoiceId: "" }));
          setItems([]);
          setInvoiceTotal(0);
          return;
        }
        setInvoiceTotal(invoiceData.total);
        const initialItems = invoiceData.items.map((item: any) => {
          // حساب الكميات المرتجعة سابقاً لهذا الصنف
          const returnedQty = invoiceData.purchaseReturns?.reduce((total: number, ret: any) => {
            const retItem = ret.items.find((ri: any) => ri.invoiceItemId === item.id);
            return total + (retItem?.quantity || 0);
          }, 0) || 0;

          // العثور على اسم المنتج من قائمة المنتجات باستخدام productId
          const product = products.find(p => p.id === item.productId);
          const description = product?.name || item.description || "صنف غير معروف";

          return {
            ...item,
            description,
            returnQuantity: 0,
            originalQuantity: item.quantity,
            returnedSoFar: returnedQty,
            availableQuantity: item.quantity - returnedQty,
          };
        });
        setItems(initialItems);
      }
    } else {
      setInvoiceTotal(0);
      setItems([]);
    }
  };

  const updateReturnQuantity = (index: number, qty: number) => {
    const newItems = [...items];
    const item = newItems[index];
    if (qty > item.availableQuantity) {
      toast.error(`الكمية المتاحة للإرجاع هي ${item.availableQuantity}`);
      return;
    }
    item.returnQuantity = qty;
    item.total = qty * item.unitPrice;
    setItems(newItems);
    calculateTotals(newItems);
  };

  const calculateTotals = (itemsList: any[]) => {
    const subtotal = itemsList.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalTax = itemsList.reduce((sum, item) => sum + (item.total * (item.taxRate || 0) / 100), 0);
    const discount = parseFloat(formData.discount.toString()) || 0;
    const total = subtotal + totalTax - discount;
    setFormData(prev => ({ ...prev, subtotal, totalTax, total }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const itemsToSubmit = items
        .filter(item => (item.returnQuantity || 0) > 0)
        .map(item => ({
          description: item.description,
          quantity: item.returnQuantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 0,
          total: item.returnQuantity * item.unitPrice,
          invoiceItemId: item.id,
        }));

      if (itemsToSubmit.length === 0) {
        toast.error("يجب إدخال صنف واحد على الأقل بكمية مرتجعة");
        setLoading(false);
        return;
      }

      // التحقق من عدم تجاوز إجمالي المرتجع للرصيد المتبقي من الفاتورة
      const selectedInvoice = invoices.find(inv => inv.id.toString() === formData.invoiceId);
      const netInvoiceTotal = (selectedInvoice?.total || 0) - (selectedInvoice?.returnsTotal || 0);
      if (formData.total > netInvoiceTotal) {
        toast.error(`إجمالي المرتجع (${formData.total.toLocaleString()} ج.م) يتجاوز الرصيد المتبقي من الفاتورة (${netInvoiceTotal.toLocaleString()} ج.م)`);
        setLoading(false);
        return;
      }

      let safeId: number | undefined;
      let bankId: number | undefined;

      if (formData.refundMethod === 'cash') {
        safeId = parseInt(formData.safeId);
      } else if (formData.refundMethod === 'bank') {
        if (!formData.bankId) {
          toast.error("يرجى اختيار البنك");
          setLoading(false);
          return;
        }
        bankId = parseInt(formData.bankId);
      }

      const input: PurchaseReturnInput = {
        returnNumber: 0,
        invoiceId: parseInt(formData.invoiceId),
        supplierId: parseInt(formData.supplierId),
        returnDate: new Date(formData.returnDate),
        subtotal: formData.subtotal,
        discount: formData.discount,
        totalTax: formData.totalTax,
        total: formData.total,
        reason: formData.reason,
        status: "completed",
        refundMethod: formData.refundMethod as any,
        safeId,
        bankId,
        description: formData.description,
        items: itemsToSubmit,
      };

      const result = await createPurchaseReturn(input);
      if (result.success) {
        toast.success("تم إنشاء المرتجع بنجاح");
        router.push("/purchase-returns");
      } else {
        toast.error(result.error || "حدث خطأ");
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل في حفظ المرتجع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar title="إنشاء مرتجع مشتريات" />
      <div className="p-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 min-h-screen" dir="rtl">
        <Button variant="ghost" className="mb-6 gap-2 hover:bg-primary/10 transition-all" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> العودة
        </Button>

        <form onSubmit={handleSubmit}>
          <Card className="max-w-5xl mx-auto shadow-xl border-0 ring-1 ring-slate-200 dark:ring-slate-800">
            <CardHeader className="bg-gradient-to-l from-primary/5 via-transparent to-transparent border-b pb-6">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                إنشاء مرتجع مشتريات جديد
              </CardTitle>
              <CardDescription className="text-base">
                أدخل بيانات المرتجع والأصناف المرتجعة
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    رقم المرتجع
                  </Label>
                  <Input value={`RET-${formData.returnNumber}`} disabled className="bg-muted/30" />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4 text-muted-foreground" />
                    المورد
                  </Label>
                  <Select value={formData.supplierId} onValueChange={handleSupplierChange}>
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder="اختر المورد" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    الفاتورة الأصلية
                  </Label>
                  <Select
                    value={formData.invoiceId}
                    onValueChange={handleInvoiceSelect}
                    disabled={!formData.supplierId || invoices.length === 0}
                  >
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder={!formData.supplierId ? "اختر المورد أولاً" : "اختر الفاتورة"} />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices.map(inv => {
                        const remaining = (inv.total - (inv.returnsTotal || 0)).toLocaleString();
                        return (
                          <SelectItem key={inv.id} value={inv.id.toString()}>
                            {inv.invoiceNumber} - {inv.supplierName} - {remaining} ج.م
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    تاريخ المرتجع
                  </Label>
                  <Input
                    type="date"
                    value={formData.returnDate}
                    onChange={(e) => setFormData({...formData, returnDate: e.target.value})}
                    className="bg-muted/30"
                    required
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  الأصناف المرتجعة
                </Label>

                <div className="hidden md:grid md:grid-cols-13 gap-3 px-2 text-sm font-medium text-muted-foreground">
                  <div className="col-span-3">الوصف</div>
                  <div className="col-span-1 text-center">الكمية الأصلية</div>
                  <div className="col-span-1 text-center">المرتجع سابقاً</div>
                  <div className="col-span-1 text-center">سعر الوحدة</div>
                  <div className="col-span-1 text-center">الضريبة %</div>
                  <div className="col-span-2 text-center">كمية المرتجع</div>
                  <div className="col-span-2 text-center">إجمالي المرتجع</div>
                  <div className="col-span-2"></div>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-13 gap-3 items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                    <div className="md:col-span-3">
                      <Input value={item.description} readOnly className="bg-gray-100" />
                    </div>
                    <div className="md:col-span-1">
                      <Input value={item.originalQuantity || 0} readOnly className="bg-gray-100 text-center" />
                    </div>
                    <div className="md:col-span-1">
                      <Input value={item.returnedSoFar} readOnly className="bg-gray-100 text-center text-orange-600 font-bold" />
                    </div>
                    <div className="md:col-span-1">
                      <Input value={item.unitPrice} readOnly className="bg-gray-100 text-center" />
                    </div>
                    <div className="md:col-span-1">
                      <Input value={item.taxRate} readOnly className="bg-gray-100 text-center" />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        max={item.availableQuantity}
                        value={item.returnQuantity}
                        onChange={(e) => updateReturnQuantity(idx, parseFloat(e.target.value) || 0)}
                        className="text-center"
                      />
                    </div>
                    <div className="md:col-span-2 font-semibold text-primary text-center">
                      {(item.returnQuantity * item.unitPrice).toLocaleString()} ج.م
                    </div>
                    <div className="md:col-span-2"></div>
                  </div>
                ))}

                {items.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">اختر الفاتورة لعرض الأصناف</p>
                )}
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    المجموع الفرعي
                  </Label>
                  <Input type="number" value={formData.subtotal} readOnly className="bg-slate-100 dark:bg-slate-800 font-bold text-lg" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    الخصم
                  </Label>
                  <Input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => {
                      const discount = parseFloat(e.target.value) || 0;
                      const total = formData.subtotal + formData.totalTax - discount;
                      setFormData(prev => ({ ...prev, discount, total }));
                    }}
                    className="bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    إجمالي الضريبة
                  </Label>
                  <Input type="number" value={formData.totalTax} readOnly className="bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">الإجمالي النهائي:</span>
                  <span className="text-2xl font-bold text-primary">{formData.total.toLocaleString()} ج.م</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>سبب الإرجاع</Label>
                  <Input value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <Label>طريقة الرد</Label>
                  <Select value={formData.refundMethod} onValueChange={(v) => setFormData({...formData, refundMethod: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💰 نقدي (خزنة)</SelectItem>
                      <SelectItem value="bank">🏛️ بنك</SelectItem>
                      <SelectItem value="credit">📄 أجل (بدون تأثير على الرصيد)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.refundMethod === 'cash' && (
                  <div className="space-y-2">
                    <Label>اختر الخزنة</Label>
                    <Select value={formData.safeId} onValueChange={(v) => setFormData({...formData, safeId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الخزنة" />
                      </SelectTrigger>
                      <SelectContent>
                        {safes.length > 0 ? (
                          safes.map(safe => (
                            <SelectItem key={safe.id} value={safe.id.toString()}>
                              {safe.name} {safe.isPrimary ? "(الرئيسية)" : ""}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-sm text-muted-foreground">لا يوجد خزائن نشطة</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.refundMethod === 'bank' && (
                  <div className="space-y-2">
                    <Label>اختر البنك</Label>
                    <Select value={formData.bankId} onValueChange={(v) => setFormData({...formData, bankId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر البنك" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.length > 0 ? (
                          banks.map(bank => (
                            <SelectItem key={bank.id} value={bank.id.toString()}>{bank.name}</SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-sm text-muted-foreground">لا يوجد بنوك نشطة</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="md:col-span-2 space-y-2">
                  <Label>ملاحظات إضافية</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>إلغاء</Button>
                <Button type="submit" size="lg" disabled={loading} className="gap-2 bg-primary hover:bg-primary/90">
                  <Save className="h-4 w-4" />
                  {loading ? "جاري الحفظ..." : "حفظ المرتجع"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </>
  );
}