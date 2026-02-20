"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Eye, Trash2, AlertTriangle, Search, Calendar, Filter } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getPurchaseReturns, deletePurchaseReturn } from "./actions";

export default function PurchaseReturnsPage() {
  const router = useRouter();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;
    const result = await getPurchaseReturns(undefined, from, to, statusFilter);
    if (result.success) {
      setReturns(result.data);
    } else {
      toast.error("فشل تحميل المرتجعات");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilter = () => loadData();

  const filteredReturns = returns.filter(r =>
    r.supplier.name.includes(search) ||
    r.returnNumber.toString().includes(search)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">قيد الانتظار</span>;
      case 'completed': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">مكتمل</span>;
      case 'rejected': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">مرفوض</span>;
      default: return <span>{status}</span>;
    }
  };

  const confirmDelete = async () => {
    if (!returnToDelete) return;
    setDeleting(true);
    const result = await deletePurchaseReturn(returnToDelete.id);
    if (result.success) {
      toast.success("تم حذف المرتجع");
      loadData();
    } else {
      toast.error(result.error);
    }
    setDeleting(false);
    setDeleteDialogOpen(false);
    setReturnToDelete(null);
  };

  return (
    <>
      <Navbar title="مرتجعات المشتريات" />
      <div className="p-6" dir="rtl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">إدارة مرتجعات المشتريات</h1>
          <Link href="/purchase-returns/new">
            <Button><Plus className="ml-2 h-4 w-4" /> إضافة مرتجع جديد</Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="بحث باسم المورد أو رقم المرتجع"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="الكل">جميع الحالات</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" placeholder="من تاريخ" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <Input type="date" placeholder="إلى تاريخ" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <Button onClick={handleFilter} variant="outline"><Filter className="ml-2 h-4 w-4" /> تطبيق</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>قائمة مرتجعات المشتريات</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : filteredReturns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">لا توجد مرتجعات</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-4">رقم المرتجع</th>
                      <th className="text-right py-3 px-4">المورد</th>
                      <th className="text-right py-3 px-4">الفاتورة</th>
                      <th className="text-right py-3 px-4">التاريخ</th>
                      <th className="text-right py-3 px-4">المبلغ</th>
                      <th className="text-right py-3 px-4">الحالة</th>
                      <th className="text-right py-3 px-4">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReturns.map((ret) => (
                      <tr key={ret.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{ret.returnNumber}</td>
                        <td className="py-3 px-4">{ret.supplier.name}</td>
                        <td className="py-3 px-4">{ret.invoice.invoiceNumber}</td>
                        <td className="py-3 px-4">{new Date(ret.returnDate).toLocaleDateString('ar-EG')}</td>
                        <td className="py-3 px-4 font-bold">{ret.total.toLocaleString()} ج.م</td>
                        <td className="py-3 px-4">{getStatusBadge(ret.status)}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/purchase-returns/${ret.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setReturnToDelete(ret); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              تأكيد حذف المرتجع
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف مرتجع رقم #{returnToDelete?.returnNumber} للمورد {returnToDelete?.supplier.name}؟
              <br />
              <span className="text-red-600 font-bold mt-2 block">هذا الإجراء لا يمكن التراجع عنه.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "جاري الحذف..." : "نعم، احذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}