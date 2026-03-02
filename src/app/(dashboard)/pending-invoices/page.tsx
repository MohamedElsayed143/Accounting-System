"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  ShoppingCart, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Search,
  Filter,
  ArrowLeftRight
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getPendingInvoices } from "./actions";
import { ProcessInvoiceDialog } from "./components/ProcessInvoiceDialog";

export default function PendingInvoicesPage() {
  const [pendingData, setPendingData] = useState<{ sales: any[], purchases: any[] }>({ sales: [], purchases: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoiceType, setInvoiceType] = useState<"sales" | "purchase">("sales");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPendingInvoices();
      setPendingData(data);
    } catch (error) {
      toast.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSales = pendingData.sales.filter(inv => 
    inv.invoiceNumber.toString().includes(searchQuery) || 
    inv.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPurchases = pendingData.purchases.filter(inv => 
    inv.invoiceNumber.toString().includes(searchQuery) || 
    inv.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Navbar title="الفواتير المعلقة (المسودات)" />
      
      <div className="flex-1 space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              إدارة الفواتير المعلقة
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              مراجعة وتأكيد مسودات الفواتير قبل التأثير على المخازن والخزينة
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
              <Clock className="h-3.5 w-3.5 ml-1" />
              {pendingData.sales.length + pendingData.purchases.length} فاتورة بانتظار التأكيد
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="sales" className="w-full space-y-4" onValueChange={(v) => setInvoiceType(v as any)}>
          <div className="flex items-center justify-between gap-4">
            <TabsList className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 p-1">
              <TabsTrigger value="sales" className="gap-2 px-6">
                <FileText className="h-4 w-4" />
                مبيعات معلقة
              </TabsTrigger>
              <TabsTrigger value="purchase" className="gap-2 px-6">
                <ShoppingCart className="h-4 w-4" />
                مشتريات معلقة
              </TabsTrigger>
            </TabsList>

            <div className="relative w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث برقم الفاتورة أو الاسم..." 
                className="pr-10 bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="sales">
            <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
                    <TableHead className="w-[100px]">رقم الفاتورة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10">جاري التحميل...</TableCell></TableRow>
                  ) : filteredSales.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">لا توجد فواتير مبيعات معلقة</TableCell></TableRow>
                  ) : filteredSales.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono font-bold">#{inv.invoiceNumber}</TableCell>
                      <TableCell>{new Date(inv.invoiceDate).toLocaleDateString("ar-EG")}</TableCell>
                      <TableCell>{inv.customer.name}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {inv.total.toLocaleString("ar-EG")} ج.م
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400">
                          بانتظار التأكيد
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <Button 
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setInvoiceType("sales");
                          }}
                          className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm"
                          size="sm"
                        >
                          <CheckCircle2 className="h-4 w-4 ml-2" />
                          تأكيد وحفظ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="purchase">
            <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
                    <TableHead className="w-[100px]">رقم الفاتورة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المورد</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10">جاري التحميل...</TableCell></TableRow>
                  ) : filteredPurchases.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">لا توجد فواتير مشتريات معلقة</TableCell></TableRow>
                  ) : filteredPurchases.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono font-bold">#{inv.invoiceNumber}</TableCell>
                      <TableCell>{new Date(inv.invoiceDate).toLocaleDateString("ar-EG")}</TableCell>
                      <TableCell>{inv.supplier.name}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {inv.total.toLocaleString("ar-EG")} ج.م
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400">
                          بانتظار التأكيد
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <Button 
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setInvoiceType("purchase");
                          }}
                          className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm"
                          size="sm"
                        >
                          <CheckCircle2 className="h-4 w-4 ml-2" />
                          تأكيد وحفظ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {selectedInvoice && (
          <ProcessInvoiceDialog
            isOpen={!!selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            invoice={selectedInvoice}
            type={invoiceType}
            onSuccess={loadData}
          />
        )}
      </div>
    </>
  );
}
