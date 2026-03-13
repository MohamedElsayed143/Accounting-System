"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductSelect } from "@/components/shared/ProductSelect";
import { ProductData } from "@/app/(dashboard)/inventory/products/actions";

export interface QuotationItemRow {
  id: string;
  description: string;
  quantity: number;
  price: number;
  taxRate: number;
  discount: number;
  total: number;
  productId: number | null;
}

interface QuotationTableProps {
  items: QuotationItemRow[];
  onAddItem: (product: ProductData) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, field: keyof QuotationItemRow, value: string | number | null) => void;
  readOnly?: boolean;
}

export function QuotationTable({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  readOnly,
}: QuotationTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="text-right font-bold w-[40%]">البند</TableHead>
            <TableHead className="text-right font-bold w-24">الكمية *</TableHead>
            <TableHead className="text-right font-bold w-24">السعر *</TableHead>
            <TableHead className="text-right font-bold w-24">الخصم (%)</TableHead>
            <TableHead className="text-right font-bold w-24 text-orange-600">الضريبة %</TableHead>
            <TableHead className="text-right font-bold w-32">الإجمالي</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="p-3">
                <div className="flex flex-col gap-1">
                  <Input
                    value={item.description}
                    onChange={(e) => onUpdateItem(item.id, "description", e.target.value)}
                    disabled={readOnly}
                    placeholder="اسم البند..."
                    className="bg-transparent border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 h-auto p-1 font-bold text-slate-800"
                  />
                  {!!item.productId && (
                    <span className="text-[10px] text-muted-foreground font-mono mr-1">
                      PID: {item.productId}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="any"
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
                  value={item.discount || ""}
                  onChange={(e) => onUpdateItem(item.id, "discount", e.target.value)}
                  disabled={readOnly}
                  placeholder="%"
                  className="bg-red-50 border-red-100 h-9 font-bold text-center"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="any"
                  value={item.taxRate}
                  onChange={(e) => onUpdateItem(item.id, "taxRate", e.target.value)}
                  disabled={readOnly}
                  className="bg-orange-50 border-orange-200 h-9 font-bold text-center"
                />
              </TableCell>
              <TableCell className="font-bold text-primary text-sm whitespace-nowrap">
                {item.total.toLocaleString("ar-EG")} ج.م
              </TableCell>
              <TableCell>
                {!readOnly && (
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
                )}
              </TableCell>
            </TableRow>
          ))}
          {!readOnly && (
            <TableRow>
              <TableCell colSpan={7} className="p-3">
                <div className="max-w-md flex items-center gap-2">
                  <Input 
                    placeholder="اكتب اسم البند الجديد واضغط إضافة..." 
                    id="new-item-name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.currentTarget.value;
                        if (val) {
                          onAddItem({ 
                            name: val, 
                            sellPrice: 0, 
                            taxRate: 0, 
                            id: 0, 
                            code: "MANUAL",
                            currentStock: 0,
                            unit: "بند",
                            isActive: true,
                            buyPrice: 0,
                            profitMargin: 0,
                            minStock: 0,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            categoryId: null,
                            category: null
                          });
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                    className="flex-1 bg-slate-50 border-slate-200"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('new-item-name') as HTMLInputElement;
                      if (input.value) {
                        onAddItem({ 
                          name: input.value, 
                          sellPrice: 0, 
                          taxRate: 0, 
                          id: 0, 
                          code: "MANUAL",
                          currentStock: 0,
                          unit: "بند",
                          isActive: true,
                          buyPrice: 0,
                          profitMargin: 0,
                          minStock: 0,
                          createdAt: new Date(),
                          updatedAt: new Date(),
                          categoryId: null,
                          category: null
                        });
                        input.value = "";
                      }
                    }}
                  >
                    إضافة بند
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
