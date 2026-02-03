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
      label: "Status",
      value: "status",
      options: [
        { label: "Paid", value: "paid" },
        { label: "Unpaid", value: "unpaid" },
        { label: "Overdue", value: "overdue" },
        { label: "Partial", value: "partial" },
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
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <>
      <Navbar title="Sales Invoices" />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Sales Invoices
            </h2>
            <p className="text-muted-foreground">
              Manage your sales invoices and track payments
            </p>
          </div>
          <Button asChild>
            <Link href="/sales-invoices/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <DataTableToolbar
                searchPlaceholder="Search invoices..."
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell>{invoice.customerName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(invoice.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            ${invoice.total.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={invoice.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(invoice.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

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
                  title="No invoices found"
                  description="Try adjusting your search or filters, or create a new invoice."
                  action={{
                    label: "Create Invoice",
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
