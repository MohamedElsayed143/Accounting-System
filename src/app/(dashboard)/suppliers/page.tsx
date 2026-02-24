"use client";

import { useState, useMemo, useEffect } from "react";
import { Trash2, Phone, MapPin, Hash, User, Search, Edit3, AlertTriangle, Tag, PackagePlus, Wallet } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EmptyState,
  PaginationControls,
} from "@/components/shared";
import { toast } from "sonner";

/* ✅ استيراد الـ Server Actions */
import {
  getSuppliers,
  saveSupplier,
  deleteSupplierAction,
} from "./actions";

interface Supplier {
  id: number;
  name: string;
  code: number;
  phone: string | null;
  address: string | null;
  category: string | null;
  balance: number;
}

const ITEMS_PER_PAGE = 8;

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    code: 0,
    name: "",
    phone: "",
    address: "",
    category: "",
  });

  const [codeError, setCodeError] = useState<string>("");

  /* =========================
     ✅ تحميل الموردين من DB
  ========================= */
  const loadSuppliers = async () => {
    const data = await getSuppliers();
    setSuppliers(data);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  /* ========================= */

  const generateNextCode = () => {
    if (suppliers.length === 0) return 1;
    const maxCode = Math.max(...suppliers.map((s) => s.code));
    return maxCode + 1;
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(
      (supplier) =>
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.code.toString().includes(searchQuery) ||
        (supplier.category?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );
  }, [suppliers, searchQuery]);

  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);

  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /* =========================
     فتح المودال
  ========================= */
  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      code: generateNextCode(),
      name: "",
      phone: "",
      address: "",
      category: "",
    });
    setCodeError("");
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      phone: supplier.phone || "",
      address: supplier.address || "",
      category: supplier.category || "",
    });
    setCodeError("");
    setIsModalOpen(true);
  };

  /* =========================
     ✅ الحفظ في DB مع معالجة الأخطاء
  ========================= */
  const handleSave = async () => {
    try {
      if (!formData.name || !formData.code) {
        toast.error("الاسم والكود مطلوبان", {
          description: "يرجى ملء جميع الحقول المطلوبة قبل الحفظ",
          duration: 4000,
        });
        return;
      }

      // ✅ فحص الكود المكرر محلياً
      const codeExists = suppliers.some(
        (supplier) =>
          supplier.code === Number(formData.code) &&
          supplier.id !== editingSupplier?.id
      );

      if (codeExists) {
        setCodeError(`الكود ${formData.code} مستخدم بالفعل، يرجى اختيار كود مختلف.`);
        return;
      }

      await saveSupplier({
        id: editingSupplier?.id,
        name: formData.name,
        code: Number(formData.code),
        phone: formData.phone,
        address: formData.address,
        category: formData.category,
      });

      await loadSuppliers();

      toast.success(
        editingSupplier ? "تم التحديث بنجاح" : "تمت الإضافة بنجاح",
        {
          description: editingSupplier
            ? `تم تحديث بيانات ${formData.name} بنجاح`
            : `تمت إضافة المورد ${formData.name} إلى قاعدة البيانات`,
          duration: 3000,
        }
      );

      setIsModalOpen(false);
    } catch (err) {
      // ✅ Server Actions بترمي objects مش Error instances عادية
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "حدث خطأ أثناء الحفظ";

      toast.error("فشل في حفظ البيانات", {
        description: errorMessage,
        duration: 5000,
        icon: <AlertTriangle className="h-5 w-5" />,
      });
    }
  };

  /* =========================
     ✅ الحذف من DB مع تأكيد
  ========================= */
  const handleDelete = async () => {
    if (!deleteSupplier) return;

    try {
      await deleteSupplierAction(deleteSupplier.id);
      await loadSuppliers();

      toast.success("تم الحذف بنجاح", {
        description: `تم حذف المورد "${deleteSupplier.name}" من قاعدة البيانات`,
        duration: 3000,
      });

      setDeleteSupplier(null);
    } catch (err) {
      toast.error("فشل في الحذف", {
        description: "حدث خطأ أثناء محاولة حذف المورد. يرجى المحاولة مرة أخرى.",
        duration: 4000,
      });
    }
  };

  /* ========================= */

  return (
    <>
      <Navbar title="الموردين" />

      <div className="flex-1 space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              إدارة الموردين
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              إدارة وتنظيم قاعدة بيانات الموردين
            </p>
          </div>

          <Button
            onClick={openCreateModal}
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <PackagePlus className="h-4 w-4" />
            إضافة مورد جديد
          </Button>
        </div>

        <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن مورد بالاسم أو الكود أو الفئة..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pr-10 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {paginatedSuppliers.length ? (
              <>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-850 hover:from-slate-100 hover:to-slate-150">
                        <TableHead className="font-bold">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            الكود
                          </div>
                        </TableHead>
                        <TableHead className="font-bold">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            الاسم
                          </div>
                        </TableHead>
                        <TableHead className="font-bold">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            الهاتف
                          </div>
                        </TableHead>
                        <TableHead className="font-bold">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            العنوان
                          </div>
                        </TableHead>
                        <TableHead className="font-bold">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            الفئة
                          </div>
                        </TableHead>
                        <TableHead className="font-bold">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            الرصيد المستحق
                          </div>
                        </TableHead>
                        <TableHead className="font-bold text-center">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {paginatedSuppliers.map((s) => (
                        <TableRow
                          key={s.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <TableCell className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                            #{s.code}
                          </TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {s.phone || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {s.address || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {s.category ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                <Tag className="h-3 w-3" />
                                {s.category}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="font-bold">
                            <span className={s.balance > 0 ? "text-red-600" : s.balance < 0 ? "text-green-600" : "text-slate-500"}>
                              {Math.abs(s.balance).toLocaleString("ar-EG")} ج.م
                              <span className="text-[10px] mr-1 font-normal opacity-70">
                                ({s.balance > 0 ? "علينا" : s.balance < 0 ? "لنا" : "متوازن"})
                              </span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditModal(s)}
                                className="h-9 w-9 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 transition-all"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteSupplier(s)}
                                className="h-9 w-9 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredSuppliers.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </>
            ) : (
              <EmptyState
                title="لا يوجد موردين بعد"
              />
            )}
          </CardContent>
        </Card>

        {/* ================= Modal الإضافة والتعديل ================= */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent dir="rtl" className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                {editingSupplier ? (
                  <>
                    <Edit3 className="h-5 w-5 text-blue-600" />
                    تعديل بيانات المورد
                  </>
                ) : (
                  <>
                    <PackagePlus className="h-5 w-5 text-purple-600" />
                    إضافة مورد جديد
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-base">
                {editingSupplier
                  ? "قم بتعديل المعلومات المطلوبة وحفظ التغييرات"
                  : "أدخل بيانات المورد الجديد"
                }
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 py-4">
              {/* كود المورد */}
              <div className="space-y-2">
                <Label htmlFor="code" className="flex items-center gap-2 text-sm font-medium">
                  <Hash className="h-4 w-4 text-blue-600" />
                  كود المورد
                </Label>
                <Input
                  id="code"
                  type="number"
                  value={formData.code}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, code: Number(e.target.value) }));
                    setCodeError("");
                  }}
                  placeholder="أدخل الكود"
                  className={`focus:ring-2 ${
                    codeError
                      ? "border-red-500 focus:ring-red-500 focus-visible:ring-red-500"
                      : "focus:ring-blue-500"
                  }`}
                />
                {codeError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {codeError}
                  </p>
                )}
              </div>

              {/* اسم المورد */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-purple-600" />
                  اسم المورد <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="أدخل الاسم"
                  className="focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* رقم الهاتف */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                  <Phone className="h-4 w-4 text-green-600" />
                  رقم الهاتف
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="أدخل رقم الهاتف"
                  className="focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* العنوان */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  العنوان
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, address: e.target.value }))
                  }
                  placeholder="أدخل العنوان"
                  className="focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* الفئة */}
              <div className="space-y-2">
                <Label htmlFor="category" className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="h-4 w-4 text-pink-600" />
                  الفئة
                </Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, category: e.target.value }))
                  }
                  placeholder="أدخل الفئة (مثال: مواد خام، أجهزة...)"
                  className="focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {editingSupplier ? "حفظ التعديلات" : "إضافة المورد"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ================= Modal تأكيد الحذف ================= */}
        <AlertDialog open={!!deleteSupplier} onOpenChange={() => setDeleteSupplier(null)}>
          <AlertDialogContent dir="rtl" className="sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-xl">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
                </div>
                تأكيد حذف المورد
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base pt-2">
                {deleteSupplier && (
                  <>
                    هل أنت متأكد من حذف المورد{" "}
                    <span className="font-bold text-foreground">{deleteSupplier.name}</span>
                    {" "}(الكود: #{deleteSupplier.code})؟
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-400">
                        ⚠️ هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بيانات هذا المورد نهائياً.
                      </p>
                    </div>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2">
              <AlertDialogCancel className="mt-0">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                تأكيد الحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}