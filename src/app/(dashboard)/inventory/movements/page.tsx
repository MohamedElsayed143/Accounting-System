// app/(dashboard)/inventory/movements/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Activity, RefreshCw } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableToolbar, EmptyState, PaginationControls } from "@/components/shared";
import { toast } from "sonner";
import { getMovements, type MovementRow } from "./actions";

const ITEMS_PER_PAGE = 12;

const MOVEMENT_LABELS: Record<string, { label: string; className: string }> = {
  PURCHASE: { label: "شراء", className: "bg-green-100 text-green-700 border-green-200" },
  SALE: { label: "بيع", className: "bg-blue-100 text-blue-700 border-blue-200" },
  PURCHASE_RETURN: { label: "مرتجع شراء", className: "bg-orange-100 text-orange-700 border-orange-200" },
  SALE_RETURN: { label: "مرتجع بيع", className: "bg-purple-100 text-purple-700 border-purple-200" },
  ADJUSTMENT: { label: "تسوية", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

export default function MovementsPage() {
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const load = () => {
    setLoading(true);
    getMovements()
      .then(setMovements)
      .catch(() => toast.error("فشل تحميل الحركات"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return movements.filter((m) => {
      const matchesSearch =
        m.productName.toLowerCase().includes(q) ||
        m.productCode.toLowerCase().includes(q) ||
        (m.reference ?? "").toLowerCase().includes(q);
      const matchesType = typeFilter === "ALL" || m.movementType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [movements, searchQuery, typeFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <Navbar title="حركات المخزون" />
      <div className="flex-1 space-y-6 p-6" dir="rtl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
              حركات المخزون
            </h2>
            <p className="text-muted-foreground font-medium">
              سجل جميع حركات الدخول والخروج للمخزون
            </p>
          </div>
          <Button variant="outline" onClick={load} className="gap-2" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <DataTableToolbar
                    searchPlaceholder="ابحث عن صنف أو مرجع..."
                    searchValue={searchQuery}
                    onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
                    filterOptions={[]}
                    activeFilters={{}}
                    onFilterChange={() => {}}
                  />
                </div>
                <Select
                  value={typeFilter}
                  onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="نوع الحركة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">جميع الأنواع</SelectItem>
                    <SelectItem value="PURCHASE">شراء</SelectItem>
                    <SelectItem value="SALE">بيع</SelectItem>
                    <SelectItem value="PURCHASE_RETURN">مرتجع شراء</SelectItem>
                    <SelectItem value="SALE_RETURN">مرتجع بيع</SelectItem>
                    <SelectItem value="ADJUSTMENT">تسوية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">جاري تحميل الحركات...</p>
                  </div>
                </div>
              ) : paginated.length > 0 ? (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-bold text-center">التاريخ</TableHead>
                          <TableHead className="font-bold text-center">الصنف</TableHead>
                          <TableHead className="font-bold text-center">نوع الحركة</TableHead>
                          <TableHead className="font-bold text-center">الكمية</TableHead>
                          <TableHead className="font-bold text-center">سعر الوحدة</TableHead>
                          <TableHead className="font-bold text-center">المرجع</TableHead>
                          <TableHead className="font-bold text-center">ملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map((mv, index) => {
                          const type = MOVEMENT_LABELS[mv.movementType] ?? { label: mv.movementType, className: "" };
                          return (
                            <TableRow
                              key={mv.id}
                              className={
                                index % 2 === 0
                                  ? "bg-muted/20 hover:bg-muted/40"
                                  : "hover:bg-muted/20"
                              }
                            >
                              <TableCell className="text-muted-foreground text-center font-medium">
                                {new Date(mv.createdAt).toLocaleDateString("ar-EG", {
                                  year: "numeric", month: "short", day: "numeric",
                                })}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center">
                                  <span className="font-medium">{mv.productName}</span>
                                  <span className="text-xs text-muted-foreground font-mono">{mv.productCode}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${type.className}`}>
                                  {type.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={`text-lg font-bold ${
                                    mv.quantity > 0 ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {mv.quantity > 0 ? "+" : ""}
                                  {mv.quantity.toLocaleString("ar-EG")}
                                </span>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {mv.unitPrice.toLocaleString("ar-EG")} ج.م
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm text-muted-foreground">
                                {mv.reference ?? "—"}
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground text-sm">
                                {mv.notes ?? "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
                  title="لا توجد حركات مخزون"
                  description="ستظهر هنا حركات المخزون عند إنشاء فواتير أو تسويات."
                  icon={<Activity className="h-12 w-12 text-muted-foreground/40" />}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
