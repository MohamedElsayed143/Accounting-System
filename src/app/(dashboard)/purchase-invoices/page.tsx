"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Plus, Eye, Trash2, AlertTriangle } from "lucide-react";
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
import { getPurchaseInvoices, deletePurchaseInvoice, PurchaseInvoice } from "./actions";
import { useRouter } from "next/navigation";

const ITEMS_PER_PAGE = 8;

// ─── شارة الحالة ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PurchaseInvoice["status"] }) {
  const map: Record<
    PurchaseInvoice["status"],
    { label: string; className: string }
  > = {
    cash: {
      label: "نقدي",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    credit: {
      label: "أجل",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    pending: {
      label: "معلقة",
      className: "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
  };
  const { label, className } = map[status] ?? map.pending;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${className}`}
    >
      {label}
    </span>
  );
}

export default function PurchaseInvoicesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<PurchaseInvoice | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getPurchaseInvoices()
      .then((data) => setInvoices(data as PurchaseInvoice[]))
      .finally(() => setLoading(false));
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoiceNumber.toString().includes(searchQuery) ||
        invoice.supplierName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        !filters.status || invoice.status === filters.status;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, filters]);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const filterOptions = [
    {
      label: "الحالة",
      value: "status",
      options: [
        { label: "نقدي", value: "cash" },
        { label: "أجل", value: "credit" },
        { label: "معلقة", value: "pending" },
      ],
    },
  ];

  const handleFilterChange = (key: string, value: string | undefined) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value) {
        newFilters[key] = value;
      } else {
        delete newFilters[key];
      }
      return newFilters;
    });
    setCurrentPage(1);
  };

  const openDeleteDialog = (invoice: PurchaseInvoice) => {
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;

    setDeleting(true);
    try {
      await deletePurchaseInvoice(invoiceToDelete.id);
      setInvoices((prev) => prev.filter((i) => i.id !== invoiceToDelete.id));
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    } catch (error) {
      console.error("Error deleting invoice:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Navbar title="فواتير المشتريات" />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
              فواتير المشتريات
            </h2>
            <p className="text-muted-foreground font-medium">
              إدارة فواتير المشتريات وتتبع المدفوعات للموردين
            </p>
          </div>
          <Button
            asChild
            className="gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Link href="/purchase-invoices/create">
              <Plus className="h-4 w-4" />
              <span className="font-medium">إنشاء فاتورة</span>
            </Link>
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <DataTableToolbar
                searchPlaceholder="ابحث عن فاتورة..."
                searchValue={searchQuery}
                onSearchChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                filterOptions={filterOptions}
                activeFilters={filters}
                onFilterChange={handleFilterChange}
              />

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">
                      جاري تحميل الفواتير...
                    </p>
                  </div>
                </div>
              ) : paginatedInvoices.length > 0 ? (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-bold text-center">
                            رقم الفاتورة
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            المورد
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            التاريخ
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            المبلغ (الصافي)
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            الحالة
                          </TableHead>
                          {/* عمود المرتجعات */}
                          <TableHead className="font-bold text-center">
                            المرتجعات
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            الإجراءات
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedInvoices.map((invoice, index) => (
                          <TableRow
                            key={invoice.id}
                            className={
                              index % 2 === 0
                                ? "bg-muted/20 hover:bg-muted/40"
                                : "hover:bg-muted/20"
                            }
                          >
                            <TableCell className="font-bold text-primary text-center">
                              #{invoice.invoiceNumber}
                            </TableCell>
                            <TableCell className="font-medium text-center">
                              {invoice.supplierName}
                            </TableCell>
                            <TableCell className="text-muted-foreground font-medium text-center">
                              {new Date(invoice.invoiceDate).toLocaleDateString(
                                "ar-EG",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )}
                            </TableCell>
                            <TableCell className="font-bold text-lg text-center">
                              {(invoice.netTotal ?? invoice.total).toLocaleString("ar-EG")} ج.م
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                <StatusBadge status={invoice.status} />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {(invoice.returnsCount ?? 0) > 0 ? (
                                <div className="flex flex-col items-center">
                                  <span className="font-bold text-orange-600">
                                    {invoice.returnsCount}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {invoice.returnsTotal?.toLocaleString()} ج.م
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">لا يوجد</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Link
                                  href={`/purchase-invoices/create?id=${invoice.id}`}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hover:bg-primary/10 transition-all"
                                    title="تعديل"
                                  >
                                    <Eye className="h-4 w-4 text-primary" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDeleteDialog(invoice)}
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
                    totalItems={filteredInvoices.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                  />
                </>
              ) : (
                <EmptyState
                  title="لم يتم العثور على فواتير"
                  description="حاول تعديل البحث أو الفلاتر، أو قم بإنشاء فاتورة جديدة."
                  action={{
                    label: "إنشاء فاتورة",
                    onClick: () => router.push("/purchase-invoices/create"),
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-xl font-bold">
                تأكيد حذف الفاتورة
              </DialogTitle>
            </div>
            <DialogDescription className="text-base leading-relaxed pt-2">
              هل أنت متأكد من حذف الفاتورة{" "}
              <span className="font-bold text-foreground">
                #{invoiceToDelete?.invoiceNumber}
              </span>{" "}
              الخاصة بالمورد{" "}
              <span className="font-bold text-foreground">
                {invoiceToDelete?.supplierName}
              </span>
              ؟
              <br />
              <span className="text-destructive font-semibold mt-2 block">
                هذا الإجراء لا يمكن التراجع عنه.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
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
              onClick={confirmDelete}
              disabled={deleting}
              className="gap-2 font-medium"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  حذف الفاتورة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}