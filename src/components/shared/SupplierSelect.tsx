"use client";

import React, { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Search, Truck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getSuppliers } from "@/app/(dashboard)/suppliers/actions";

interface Supplier {
  id: number;
  name: string;
  code: number;
}

interface SupplierSelectProps {
  onSelect: (supplier: Supplier) => void;
  selectedId?: number;
  selectedName?: string;
  selectedCode?: string | number;
  error?: string;
  disabled?: boolean;
}

export function SupplierSelect({ onSelect, selectedId, selectedName, selectedCode, error, disabled }: SupplierSelectProps) {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const data = await getSuppliers();
        setSuppliers(data);
      } catch (err) {
        console.error("Failed to fetch suppliers:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSuppliers();
  }, []);

  const selectedSupplier = suppliers.find((s) => s.id === selectedId);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">المورد</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between text-right font-normal",
              !selectedSupplier && "text-muted-foreground",
              error && "border-red-500"
            )}
            disabled={loading || disabled}
          >
            {selectedSupplier || selectedName ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <Truck className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{selectedSupplier?.name || selectedName}</span>
                {(selectedSupplier?.code || selectedCode) && (
                  <span className="text-xs text-muted-foreground shrink-0">({selectedSupplier?.code || selectedCode})</span>
                )}
              </div>
            ) : (
              loading ? "جاري التحميل..." : "ابحث عن مورد..."
            )}
            <div className="flex items-center gap-1">
              {(selectedSupplier || selectedName) && !disabled && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(null as any);
                    setSearchValue("");
                  }}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="ابحث بالاسم أو الكود..."
              className="text-right"
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>لم يتم العثور على نتائج.</CommandEmpty>
              <CommandGroup>
                {suppliers.map((supplier) => (
                  <CommandItem
                    key={supplier.id}
                    value={`${supplier.name} ${supplier.code}`}
                    onSelect={() => {
                      onSelect(supplier);
                      setSearchValue("");
                      setOpen(false);
                    }}
                    className="flex items-center justify-between pointer-events-auto"
                  >
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{supplier.name}</span>
                        <span className="text-xs text-muted-foreground">كود: {supplier.code}</span>
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4 text-primary",
                        selectedId === supplier.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
