// app/(dashboard)/inventory/categories/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, Tags } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTableToolbar, EmptyState, PaginationControls } from "@/components/shared";
import { toast } from "sonner";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryData,
} from "./actions";

const ITEMS_PER_PAGE = 10;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [formName, setFormName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    getCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.code ?? "").toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const openCreate = () => {
    setEditingCategory(null);
    setFormName("");
    setFormOpen(true);
  };

  const openEdit = (c: CategoryData) => {
    setEditingCategory(c);
    setFormName(c.name);
    setFormOpen(true);
  };

  const openDelete = (c: CategoryData) => {
    setCategoryToDelete(c);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) { toast.error("اسم التصنيف مطلوب"); return; }

    setSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name: formName });
        toast.success("تم تحديث التصنيف بنجاح");
      } else {
        await createCategory({ name: formName });
        toast.success("تم إضافة التصنيف بنجاح");
      }
      setFormOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      toast.success("تم حذف التصنيف بنجاح");
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء الحذف");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Navbar title="التصنيفات" />
      <div className="flex-1 space-y-6 p-6" dir="rtl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
              التصنيفات
            </h2>
            <p className="text-muted-foreground font-medium">
              تنظيم أصناف المخزون حسب التصنيف
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 shadow-md hover:shadow-lg transition-all">
            <Plus className="h-4 w-4" />
            <span className="font-medium">إضافة تصنيف</span>
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <DataTableToolbar
                searchPlaceholder="ابحث عن تصنيف..."
                searchValue={searchQuery}
                onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
                filterOptions={[]}
                activeFilters={{}}
                onFilterChange={() => {}}
              />

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">جاري تحميل التصنيفات...</p>
                  </div>
                </div>
              ) : paginated.length > 0 ? (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-bold text-center">الكود</TableHead>
                          <TableHead className="font-bold text-center">الاسم</TableHead>
                          <TableHead className="font-bold text-center">عدد الأصناف</TableHead>
                          <TableHead className="font-bold text-center">تاريخ الإنشاء</TableHead>
                          <TableHead className="font-bold text-center">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map((cat, index) => (
                          <TableRow
                            key={cat.id}
                            className={
                              index % 2 === 0
                                ? "bg-muted/20 hover:bg-muted/40"
                                : "hover:bg-muted/20"
                            }
                          >
                            <TableCell className="font-mono text-primary text-center font-bold">
                              {cat.code ?? "—"}
                            </TableCell>
                            <TableCell className="font-medium text-center">{cat.name}</TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200">
                                {cat._count?.products ?? 0} صنف
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-center font-medium">
                              {new Date(cat.createdAt).toLocaleDateString("ar-EG", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEdit(cat)}
                                  className="hover:bg-primary/10 transition-all"
                                  title="تعديل"
                                >
                                  <Pencil className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDelete(cat)}
                                  className="hover:bg-destructive/10 transition-all"
                                  title="حذف"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
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
                    totalItems={filtered.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                  />
                </>
              ) : (
                <EmptyState
                  title="لم يتم العثور على تصنيفات"
                  description="قم بإضافة تصنيف جديد لتنظيم أصناف المخزون."
                  action={{ label: "إضافة تصنيف", onClick: openCreate }}
                  icon={<Tags className="h-12 w-12 text-muted-foreground/40" />}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">اسم التصنيف *</Label>
                <Input
                  id="cat-name"
                  placeholder="مثال: إلكترونيات"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {submitting ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-xl font-bold">تأكيد الحذف</DialogTitle>
            </div>
            <DialogDescription className="text-base leading-relaxed pt-2">
              هل أنت متأكد من حذف التصنيف{" "}
              <span className="font-bold text-foreground">{categoryToDelete?.name}</span>؟
              <br />
              <span className="text-destructive font-semibold mt-2 block">
                لا يمكن حذف تصنيف يحتوي على أصناف.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  حذف
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
