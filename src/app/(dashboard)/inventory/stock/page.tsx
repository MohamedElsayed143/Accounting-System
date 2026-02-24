// app/(dashboard)/inventory/stock/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { AlertTriangle, TrendingDown, Package, RefreshCw } from "lucide-react";
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
import { DataTableToolbar, EmptyState, PaginationControls } from "@/components/shared";
import { toast } from "sonner";
import { getStockLevels, type StockRow } from "./actions";

const ITEMS_PER_PAGE = 10;

export default function StockPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showLowOnly, setShowLowOnly] = useState(false);

  const load = () => {
    setLoading(true);
    getStockLevels()
      .then(setRows)
      .catch(() => toast.error("فشل تحميل المخزون"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.category ?? "").toLowerCase().includes(q);
      const matchesLow = !showLowOnly || r.isLow;
      return matchesSearch && matchesLow;
    });
  }, [rows, searchQuery, showLowOnly]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalValue = rows.reduce((s, r) => s + r.totalValue, 0);
  const lowCount = rows.filter((r) => r.isLow).length;

  return (
    <>
      <Navbar title="المخزون الحالي" />
      <div className="flex-1 space-y-6 p-6" dir="rtl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
              المخزون الحالي
            </h2>
            <p className="text-muted-foreground font-medium">
              الكميات والقيم لجميع الأصناف
            </p>
          </div>
          <Button
            variant="outline"
            onClick={load}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>

        {/* Summary Chips */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-card border rounded-lg px-4 py-2 shadow-sm">
            <Package className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-muted-foreground">إجمالي الأصناف:</span>
            <span className="font-bold text-blue-600">{rows.length}</span>
          </div>
          <div className="flex items-center gap-2 bg-card border rounded-lg px-4 py-2 shadow-sm">
            <TrendingDown className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-muted-foreground">إجمالي القيمة:</span>
            <span className="font-bold text-green-600">{totalValue.toLocaleString("ar-EG")} ج.م</span>
          </div>
          {lowCount > 0 && (
            <button
              onClick={() => setShowLowOnly(!showLowOnly)}
              className={`flex items-center gap-2 border rounded-lg px-4 py-2 shadow-sm transition-all ${
                showLowOnly
                  ? "bg-amber-100 border-amber-300 text-amber-800"
                  : "bg-card border-amber-200 hover:bg-amber-50"
              }`}
            >
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">
                {showLowOnly ? "عرض الكل" : `منخفض المخزون: ${lowCount} صنف`}
              </span>
            </button>
          )}
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <DataTableToolbar
                searchPlaceholder="ابحث عن صنف..."
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
                    <p className="text-sm text-muted-foreground font-medium">جاري تحميل المخزون...</p>
                  </div>
                </div>
              ) : paginated.length > 0 ? (
                <>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-bold text-center">الكود</TableHead>
                          <TableHead className="font-bold text-center">الصنف</TableHead>
                          <TableHead className="font-bold text-center">التصنيف</TableHead>
                          <TableHead className="font-bold text-center">الوحدة</TableHead>
                          <TableHead className="font-bold text-center">الكمية</TableHead>
                          <TableHead className="font-bold text-center">سعر الشراء</TableHead>
                          <TableHead className="font-bold text-center">سعر البيع</TableHead>
                          <TableHead className="font-bold text-center">إجمالي القيمة</TableHead>
                          <TableHead className="font-bold text-center">الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map((row, index) => (
                          <TableRow
                            key={row.productId}
                            className={
                              row.isLow
                                ? "bg-amber-50/60 hover:bg-amber-100/60"
                                : index % 2 === 0
                                ? "bg-muted/20 hover:bg-muted/40"
                                : "hover:bg-muted/20"
                            }
                          >
                            <TableCell className="font-mono text-primary text-center font-bold">
                              {row.code}
                            </TableCell>
                            <TableCell className="font-medium text-center">{row.name}</TableCell>
                            <TableCell className="text-center">
                              {row.category ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200">
                                  {row.category}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground font-medium">
                              {row.unit ?? "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`text-lg font-bold ${
                                  row.isLow ? "text-amber-600" : "text-foreground"
                                }`}
                              >
                                {row.qty.toLocaleString("ar-EG")}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-medium text-muted-foreground">
                              {row.buyPrice.toLocaleString("ar-EG")} ج.م
                            </TableCell>
                            <TableCell className="text-center font-bold text-green-700">
                              {row.sellPrice.toLocaleString("ar-EG")} ج.م
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {row.totalValue.toLocaleString("ar-EG")} ج.م
                            </TableCell>
                            <TableCell className="text-center">
                              {row.isLow ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-amber-100 text-amber-700 border-amber-300">
                                  <AlertTriangle className="h-3 w-3" />
                                  منخفض
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border bg-green-100 text-green-700 border-green-200">
                                  جيد
                                </span>
                              )}
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
                  title="لا توجد بيانات مخزون"
                  description="قم بإضافة أصناف وإنشاء فواتير لبدء تتبع المخزون."
                  icon={<Package className="h-12 w-12 text-muted-foreground/40" />}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
