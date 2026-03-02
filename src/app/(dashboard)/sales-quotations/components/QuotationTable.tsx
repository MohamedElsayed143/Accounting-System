// components/QuotationTable.tsx
"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ProductSelect } from "@/components/shared/ProductSelect";
import type { ProductData } from "@/app/(dashboard)/inventory/products/actions";

export interface QuotationItemRow {
  id: string;
  description: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  productId: number | null;
}

interface QuotationTableProps {
  items: QuotationItemRow[];
  onAddItem: (product: ProductData) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, field: keyof QuotationItemRow, value: string | number | null) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function QuotationTable({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  disabled,
  readOnly,
}: QuotationTableProps) {
  return (
    <div className="space-y-0">
      {!readOnly && (
        <div className="flex justify-end p-4 border-b bg-white">
          <div className="w-72">
            <ProductSelect onSelect={onAddItem} disabled={disabled} onlyInStock={false} />
          </div>
        </div>
      )}
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="text-right font-bold">الصنف</TableHead>
            <TableHead className="text-right font-bold w-24">الكمية</TableHead>
            <TableHead className="text-right font-bold w-28">السعر</TableHead>
            <TableHead className="text-right font-bold w-24">خصم %</TableHead>
            <TableHead className="text-right font-bold w-32">الإجمالي</TableHead>
            {!readOnly && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={readOnly ? 5 : 6} className="text-center py-12 text-muted-foreground">
                {"لا توجد أصناف. ابحث عن منتج لإضافته."}
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-800">{item.description}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      PID: {item.productId}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    value={item.quantity || ""}
                    onChange={(e) => onUpdateItem(item.id, "quantity", e.target.value)}
                    disabled={readOnly}
                    className="bg-slate-50 h-9 font-bold text-center"
                    required={!readOnly}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    value={item.price || ""}
                    onChange={(e) => onUpdateItem(item.id, "price", e.target.value)}
                    disabled={readOnly}
                    className="bg-slate-50 h-9 font-bold text-center"
                    required={!readOnly}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    max={100}
                    value={item.discount || ""}
                    onChange={(e) => onUpdateItem(item.id, "discount", e.target.value)}
                    disabled={readOnly}
                    placeholder="%"
                    className="bg-red-50 border-red-100 h-9 font-bold text-center"
                  />
                </TableCell>
                <TableCell className="font-bold text-primary text-sm whitespace-nowrap">
                  {item.total.toLocaleString("ar-EG")} ج.م
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(item.id)}
                      disabled={items.length === 1}
                      className="text-red-400 h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
