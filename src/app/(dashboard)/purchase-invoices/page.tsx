"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, AlertTriangle, ShieldCheck, ShieldAlert, Eye, Edit } from "lucide-react";

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
import { getCompanySettingsAction } from "@/app/(dashboard)/settings/actions";
import { ProcessInvoiceDialog } from "../pending-invoices/components/ProcessInvoiceDialog";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import { PasswordProtectionGate } from "@/components/shared/PasswordProtectionGate";
import { useManagementMode } from "@/hooks/use-management-mode";
import { DateFilterButtons } from "@/components/shared";
import { isDateInFilter } from "@/lib/date-filters";

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
  const [prefix, setPrefix] = useState<string>("PUR");
  const { isManagementActive, toggleManagementMode, isUserAdmin } = useManagementMode();
  const [isPassGateOpen, setIsPassGateOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "year" | "all">("all");

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const router = useRouter();
  const { hasPermission, isAdmin, loading: permsLoading } = usePermissions();

  useEffect(() => {
    getPurchaseInvoices()
      .then((data) => setInvoices(data as PurchaseInvoice[]))
      .finally(() => setLoading(false));

    getCompanySettingsAction().then(data => {
      if (data?.purchasePrefix) setPrefix(data.purchasePrefix);
    });
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoiceNumber.toString().includes(searchQuery) ||
        invoice.supplierName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        !filters.status || invoice.status === filters.status;

      const matchesDate = isDateInFilter(invoice.invoiceDate, dateFilter);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [invoices, searchQuery, filters, dateFilter]);

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
      <div className="flex-1 space-y-6 p-6" dir="rtl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
              فواتير المشتريات
            </h2>
            <p className="text-muted-foreground font-medium">
              إدارة فواتير المشتريات وتتبع المدفوعات للموردين
            </p>
          </div>
          <div className="flex gap-2 items-center">
          {isUserAdmin && (
            <Button
              variant={isManagementActive ? "destructive" : "outline"}
              onClick={() => {
                if (isManagementActive) {
                  toggleManagementMode(false);
                  toast.info("تم إغلاق وضع الإدارة");
                } else {
                  setIsPassGateOpen(true);
                }
              }}
              className="gap-2 border-dashed border-2 transition-all"
            >
              {isManagementActive ? (
                <>
                  <ShieldAlert className="h-4 w-4" />
                  إغلاق وضع الإدارة
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  قائمة الحذف والتعديل
                </>
              )}
            </Button>
          )}

            {isManagementActive && hasPermission("purchase_create") && (
              <Button
                asChild
                className="gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Link href="/purchase-invoices/create">
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">إنشاء فاتورة</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
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
                </div>
                <DateFilterButtons filter={dateFilter} onFilterChange={setDateFilter} />
              </div>

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
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-bold text-center whitespace-nowrap">
                            رقم الفاتورة
                          </TableHead>
                          <TableHead className="font-bold text-center whitespace-nowrap">
                            المورد
                          </TableHead>
                          <TableHead className="font-bold text-center whitespace-nowrap">
                            التاريخ
                          </TableHead>
                          <TableHead className="font-bold text-center whitespace-nowrap">
                            المبلغ (الصافي)
                          </TableHead>
                          <TableHead className="font-bold text-center whitespace-nowrap">
                            الحالة
                          </TableHead>
                          {/* عمود المرتجعات */}
                          <TableHead className="font-bold text-center whitespace-nowrap">
                            المرتجعات
                          </TableHead>
                          <TableHead className="font-bold text-center whitespace-nowrap">
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
                            <TableCell className="font-bold text-primary text-center whitespace-nowrap" dir="ltr">
                              {prefix}-{String(invoice.invoiceNumber).padStart(4, "0")}
                            </TableCell>
                            <TableCell className="font-medium text-center whitespace-nowrap text-ellipsis overflow-hidden max-w-[200px]">
                              {invoice.supplierName}
                            </TableCell>
                            <TableCell className="text-muted-foreground font-medium text-center whitespace-nowrap">
                              {new Date(invoice.invoiceDate).toLocaleDateString(
                                "ar-EG",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )}
                            </TableCell>
                            <TableCell className="font-bold text-lg text-center whitespace-nowrap">
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
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {invoice.returnsTotal?.toLocaleString()} ج.م
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">لا يوجد</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  asChild
                                >
                                  <Link href={`/purchase-invoices/create?id=${invoice.id}&mode=view`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                
                                {isManagementActive && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                      asChild
                                    >
                                      <Link href={`/purchase-invoices/create?id=${invoice.id}`}>
                                        <Edit className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                      onClick={() => openDeleteDialog(invoice)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
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
              <span className="font-bold text-foreground" dir="ltr">
                {prefix}-{String(invoiceToDelete?.invoiceNumber).padStart(4, "0")}
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

      {selectedInvoice && (
        <ProcessInvoiceDialog
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          type="purchase"
          onSuccess={() => {
            getPurchaseInvoices().then((data) => setInvoices(data as PurchaseInvoice[]));
          }}
        />
      )}

      <PasswordProtectionGate
        isOpen={isPassGateOpen}
        onClose={() => setIsPassGateOpen(false)}
        onSuccess={() => toggleManagementMode(true)}
      />

    </>
  );
}