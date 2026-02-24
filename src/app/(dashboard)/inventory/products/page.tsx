// app/(dashboard)/inventory/products/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, Package } from "lucide-react";
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
  DataTableToolbar,
  EmptyState,
  PaginationControls,
} from "@/components/shared";
import { toast } from "sonner";
import { ProductForm } from "./components/ProductForm";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductData,
} from "./actions";

const ITEMS_PER_PAGE = 10;

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(
    null,
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductData | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    getProducts()
      .then((data) => setProducts(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.category?.name ?? "").toLowerCase().includes(q),
    );
  }, [products, searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginated = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const openCreate = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };
  const openEdit = (p: ProductData) => {
    setEditingProduct(p);
    setFormOpen(true);
  };
  const openDelete = (p: ProductData) => {
    setProductToDelete(p);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: Parameters<typeof createProduct>[0]) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
      toast.success("تم تحديث الصنف بنجاح");
    } else {
      await createProduct(data);
      toast.success("تم إضافة الصنف بنجاح");
    }
    load();
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      toast.success("تم إيقاف التعامل مع الصنف بنجاح");
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء إيقاف التعامل");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Navbar title="الأصناف" />
      <div className="flex-1 space-y-6 p-6" dir="rtl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
              الأصناف
            </h2>
            <p className="text-muted-foreground font-medium">
              إدارة أصناف المخزون وأسعار الشراء والبيع
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium">إضافة صنف</span>
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <DataTableToolbar
                searchPlaceholder="ابحث عن صنف..."
                searchValue={searchQuery}
                onSearchChange={(v) => {
                  setSearchQuery(v);
                  setCurrentPage(1);
                }}
                filterOptions={[]}
                activeFilters={{}}
                onFilterChange={() => {}}
              />

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">
                      جاري تحميل الأصناف...
                    </p>
                  </div>
                </div>
              ) : paginated.length > 0 ? (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-bold text-center">
                            الكود
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            الاسم
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            التصنيف
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            الوحدة
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            سعر الشراء
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            سعر البيع
                          </TableHead>

                          <TableHead className="font-bold text-center">
                            الإجراءات
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map((product, index) => (
                          <TableRow
                            key={product.id}
                            className={
                              index % 2 === 0
                                ? "bg-muted/20 hover:bg-muted/40"
                                : "hover:bg-muted/20"
                            }
                          >
                            <TableCell className="font-mono font-bold text-primary text-center">
                              {product.code}
                            </TableCell>
                            <TableCell className="font-medium text-center">
                              {product.name}
                            </TableCell>
                            <TableCell className="text-center">
                              {product.category ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200">
                                  {product.category.name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground font-medium">
                              {product.unit ?? "—"}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {product.buyPrice.toLocaleString("ar-EG")} ج.م
                            </TableCell>
                            <TableCell className="text-center font-bold text-green-700">
                              {product.sellPrice.toLocaleString("ar-EG")} ج.م
                            </TableCell>

                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEdit(product)}
                                  className="hover:bg-primary/10 transition-all"
                                  title="تعديل"
                                >
                                  <Pencil className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDelete(product)}
                                  className="hover:bg-destructive/10 transition-all"
                                   title="إيقاف التعامل"
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
                    totalItems={filteredProducts.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                  />
                </>
              ) : (
                <EmptyState
                  title="لم يتم العثور على أصناف"
                  description="قم بإضافة صنف جديد للبدء في إدارة المخزون."
                  action={{ label: "إضافة صنف", onClick: openCreate }}
                  icon={
                    <Package className="h-12 w-12 text-muted-foreground/40" />
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Form Modal */}
      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        title={editingProduct ? "تعديل الصنف" : "إضافة صنف جديد"}
        initialValues={
          editingProduct
            ? {
                id: editingProduct.id,
                code: editingProduct.code,
                name: editingProduct.name,
                unit: editingProduct.unit ?? "",
                buyPrice: String(editingProduct.buyPrice),
                sellPrice: String(editingProduct.sellPrice),
                categoryId: editingProduct.categoryId
                  ? String(editingProduct.categoryId)
                  : "",
              }
            : undefined
        }
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-xl font-bold">
                تأكيد إيقاف التعامل
              </DialogTitle>
            </div>
            <DialogDescription className="text-base leading-relaxed pt-2">
              هل أنت متأكد من إيقاف التعامل مع الصنف{" "}
              <span className="font-bold text-foreground">
                {productToDelete?.name}
              </span>
              ؟
              <br />
              <span className="text-amber-600 font-semibold mt-2 block">
                سيتم إيقاف التعامل مع هذا الصنف ولن يمكن استخدامه في الفواتير
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="font-medium"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2 font-medium"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري التنفيذ...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  إيقاف التعامل
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
