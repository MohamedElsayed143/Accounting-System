"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Plus, Eye, Trash2 } from "lucide-react";
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
  DataTableToolbar,
  EmptyState,
  PaginationControls,
} from "@/components/shared";
import { getSalesInvoices, deleteSalesInvoice } from "./actions";

// ─── نوع الفاتورة ─────────────────────────────────────────────────────────────
interface InvoiceRow {
  id: number;
  invoiceNumber: number;
  customerName: string;
  invoiceDate: Date | string;
  total: number;
  status: "cash" | "credit" | "pending";
}

const ITEMS_PER_PAGE = 8;

// ─── شارة الحالة ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: InvoiceRow["status"] }) {
  const map: Record<InvoiceRow["status"], { label: string; className: string }> = {
    cash:    { label: "نقدي",  className: "bg-green-100 text-green-700 border-green-200"   },
    credit:  { label: "أجل",   className: "bg-blue-100 text-blue-700 border-blue-200"     },
    pending: { label: "معلقة", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
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

export default function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  // ─── جلب الفواتير من قاعدة البيانات ──────────────────────────────────────
  useEffect(() => {
    getSalesInvoices()
      .then((data) => setInvoices(data as InvoiceRow[]))
      .finally(() => setLoading(false));
  }, []);

  // ─── فلترة وبحث ──────────────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoiceNumber.toString().includes(searchQuery) ||
        invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        !filters.status || invoice.status === filters.status;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, filters]);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const filterOptions = [
    {
      label: "الحالة",
      value: "status",
      options: [
        { label: "نقدي",   value: "cash"    },
        { label: "أجل",    value: "credit"  },
        { label: "معلقة",  value: "pending" },
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

  // ─── حذف فاتورة ──────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) return;
    await deleteSalesInvoice(id);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <>
      <Navbar title="فواتير المبيعات" />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
              فواتير المبيعات
            </h2>
            <p className="text-muted-foreground font-medium">
              إدارة فواتير المبيعات وتتبع المدفوعات
            </p>
          </div>
          <Button asChild className="gap-2 shadow-md hover:shadow-lg transition-all">
            <Link href="/sales-invoices/create">
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
                            العميل
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            التاريخ
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            المبلغ
                          </TableHead>
                          <TableHead className="font-bold text-center">
                            الحالة
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
                              {invoice.customerName}
                            </TableCell>
                            <TableCell className="text-muted-foreground font-medium text-center">
                              {new Date(invoice.invoiceDate).toLocaleDateString(
                                "ar-EG",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </TableCell>
                            <TableCell className="font-bold text-lg text-center">
                              {invoice.total.toLocaleString("ar-EG")} ج.م
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                <StatusBadge status={invoice.status} />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:bg-primary/10 transition-all"
                                  title="عرض"
                                >
                                  <Eye className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(invoice.id)}
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
                    onClick: () => {},
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}