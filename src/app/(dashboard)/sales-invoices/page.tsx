"use client";

import { useState, useMemo } from "react";
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
  StatusBadge,
} from "@/components/shared";
import { salesInvoices as initialInvoices } from "@/mock-data";
import { SalesInvoice } from "@/types";

const ITEMS_PER_PAGE = 8;

export default function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>(initialInvoices);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        { label: "مدفوعة", value: "paid" },
        { label: "غير مدفوعة", value: "unpaid" },
        { label: "متأخرة", value: "overdue" },
        { label: "مدفوعة جزئياً", value: "partial" },
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

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) {
      setInvoices((prev) => prev.filter((i) => i.id !== id));
    }
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

              {paginatedInvoices.length > 0 ? (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-bold text-right">رقم الفاتورة</TableHead>
                          <TableHead className="font-bold text-right">العميل</TableHead>
                          <TableHead className="font-bold text-right">التاريخ</TableHead>
                          <TableHead className="font-bold text-right">تاريخ الاستحقاق</TableHead>
                          <TableHead className="font-bold text-right">المبلغ</TableHead>
                          <TableHead className="font-bold text-right">الحالة</TableHead>
                          <TableHead className="font-bold text-left">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedInvoices.map((invoice, index) => (
                          <TableRow 
                            key={invoice.id}
                            className={index % 2 === 0 ? "bg-muted/20 hover:bg-muted/40" : "hover:bg-muted/20"}
                          >
                            <TableCell className="font-bold text-primary">
                              {invoice.invoiceNumber}
                            </TableCell>
                            <TableCell className="font-medium">
                              {invoice.customerName}
                            </TableCell>
                            <TableCell className="text-muted-foreground font-medium">
                              {new Date(invoice.createdAt).toLocaleDateString('ar-SA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </TableCell>
                            <TableCell className="text-muted-foreground font-medium">
                              {new Date(invoice.dueDate).toLocaleDateString('ar-SA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </TableCell>
                            <TableCell className="font-bold text-lg">
                              {invoice.total.toLocaleString('ar-SA')} ر.س
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={invoice.status} />
                            </TableCell>
                            <TableCell className="text-left">
                              <div className="flex justify-start gap-2">
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