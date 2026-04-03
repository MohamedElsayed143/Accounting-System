// app/(dashboard)/sales-quotations/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Eye, Trash2, AlertTriangle, Pencil, FileOutput } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DataTableToolbar, EmptyState, PaginationControls,
} from "@/components/shared";
import { getQuotations, deleteQuotation } from "./actions";
import { getCompanySettingsAction } from "@/app/(dashboard)/settings/actions";
import { DateFilterButtons } from "@/components/shared";
import { isDateInFilter } from "@/lib/date-filters";

// ─── أنواع ───
interface QuotationRow {
  id: number;
  code: string;
  customerName: string;
  customerId?: number | null;
  date: Date | string;
  total: number;
  status: string;
}

const ITEMS_PER_PAGE = 8;

const statusMap: Record<string, { label: string; className: string }> = {
  Draft: { label: "مسودة", className: "bg-gray-100 text-gray-700 border-gray-200" },
  Sent: { label: "مُرسل", className: "bg-blue-100 text-blue-700 border-blue-200" },
  Approved: { label: "مقبول", className: "bg-green-100 text-green-700 border-green-200" },
  Rejected: { label: "مرفوض", className: "bg-red-100 text-red-700 border-red-200" },
};

function StatusBadge({ status }: { status: string }) {
  const { label, className } = statusMap[status] ?? statusMap.Draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${className}`}>
      {label}
    </span>
  );
}

export default function SalesQuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<QuotationRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [prefix, setPrefix] = useState<string>("QUO");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "year" | "all">("all");
  const router = useRouter();

  useEffect(() => {
    getQuotations()
      .then((data) => setQuotations(data as QuotationRow[]))
      .finally(() => setLoading(false));

    getCompanySettingsAction().then(data => {
      if (data?.quotationPrefix) setPrefix(data.quotationPrefix);
    });
  }, []);

  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch =
        q.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !filters.status || q.status === filters.status;
      const matchesDate = isDateInFilter(q.date, dateFilter);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [quotations, searchQuery, filters, dateFilter]);

  const totalPages = Math.ceil(filteredQuotations.length / ITEMS_PER_PAGE);
  const paginatedQuotations = filteredQuotations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const filterOptions = [
    {
      label: "الحالة",
      value: "status",
      options: [
        { label: "مسودة", value: "Draft" },
        { label: "مُرسل", value: "Sent" },
        { label: "مقبول", value: "Approved" },
        { label: "مرفوض", value: "Rejected" },
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

  const openDeleteDialog = (q: QuotationRow) => {
    setQuotationToDelete(q);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!quotationToDelete) return;
    setDeleting(true);
    try {
      await deleteQuotation(quotationToDelete.id);
      setQuotations((prev) => prev.filter((q) => q.id !== quotationToDelete.id));
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
      toast.success("تم حذف عرض السعر بنجاح");
    } catch (error) {
      console.error("Error deleting quotation:", error);
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setDeleting(false);
    }
  };


  return (
    <>
      <Navbar title="عروض الأسعار" />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
              عروض الأسعار
            </h2>
            <p className="text-muted-foreground font-medium">
              إدارة عروض الأسعار وتتبع حالتها
            </p>
          </div>
          <Button asChild className="gap-2 shadow-md hover:shadow-lg transition-all">
            <Link href="/sales-quotations/create">
              <Plus className="h-4 w-4" />
              <span className="font-medium">إنشاء عرض سعر</span>
            </Link>
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <DataTableToolbar
                    searchPlaceholder="ابحث عن عرض سعر..."
                    searchValue={searchQuery}
                    onSearchChange={(value) => {
                      setSearchQuery(value);
                      setCurrentPage(1);
                    }}
                    filterOptions={filterOptions}
                    activeFilters={filters}
                    onFilterChange={handleFilterChange}
                  />
                </div>
                <DateFilterButtons filter={dateFilter} onFilterChange={setDateFilter} />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">
                      جاري تحميل العروض...
                    </p>
                  </div>
                </div>
              ) : paginatedQuotations.length > 0 ? (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-bold text-center">رقم العرض</TableHead>
                          <TableHead className="font-bold text-center">العميل</TableHead>
                          <TableHead className="font-bold text-center">التاريخ</TableHead>
                          <TableHead className="font-bold text-center">الإجمالي</TableHead>
                          <TableHead className="font-bold text-center">الحالة</TableHead>
                          <TableHead className="font-bold text-center">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedQuotations.map((q, index) => (
                          <TableRow
                            key={q.id}
                            className={
                              index % 2 === 0
                                ? "bg-muted/20 hover:bg-muted/40"
                                : "hover:bg-muted/20"
                            }
                          >
                            <TableCell className="font-bold text-primary text-center" dir="ltr">
                              {prefix}-{String(q.code).padStart(4, "0")}
                            </TableCell>
                            <TableCell className="font-medium text-center">
                              {q.customerName}
                            </TableCell>
                            <TableCell className="text-muted-foreground font-medium text-center">
                              {new Date(q.date).toLocaleDateString("ar-EG", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="font-bold text-lg text-center">
                              {q.total.toLocaleString("ar-EG")} ج.م
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                <StatusBadge status={q.status} />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-1">
                                <Link href={`/sales-quotations/${q.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hover:bg-primary/10 transition-all"
                                    title="عرض"
                                  >
                                    <Eye className="h-4 w-4 text-primary" />
                                  </Button>
                                </Link>
                                <Link href={`/sales-quotations/create?id=${q.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hover:bg-blue-500/10 transition-all"
                                    title="تعديل"
                                  >
                                    <Pencil className="h-4 w-4 text-blue-500" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDeleteDialog(q)}
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
                    totalItems={filteredQuotations.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                  />
                </>
              ) : (
                <EmptyState
                  title="لم يتم العثور على عروض أسعار"
                  description="حاول تعديل البحث أو الفلاتر، أو قم بإنشاء عرض سعر جديد."
                  action={{
                    label: "إنشاء عرض سعر",
                    onClick: () => router.push("/sales-quotations/create"),
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── حوار تأكيد الحذف ─── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-xl font-bold">
                تأكيد حذف عرض السعر
              </DialogTitle>
            </div>
            <DialogDescription className="text-base leading-relaxed pt-2">
              هل أنت متأكد من حذف عرض السعر{" "}
              <span className="font-bold text-foreground" dir="ltr">
                {prefix}-{String(quotationToDelete?.code).padStart(4, "0")}
              </span>{" "}
              {quotationToDelete?.customerId ? (
                <>
                  الخاص بالعميل{" "}
                  <span className="font-bold text-foreground">
                    {quotationToDelete.customerName}
                  </span>
                </>
              ) : (
                "(عرض سعر عام)"
              )}
              ؟
              <br />
              <span className="text-destructive font-semibold mt-2 block">
                هذا الإجراء لا يمكن التراجع عنه.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting} className="font-medium">
              إلغاء
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting} className="gap-2 font-medium">
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  حذف العرض
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
