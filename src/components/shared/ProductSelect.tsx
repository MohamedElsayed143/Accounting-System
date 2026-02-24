"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
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
import { searchProducts, type ProductData } from "@/app/(dashboard)/inventory/products/actions";

interface ProductSelectProps {
  onSelect: (product: ProductData) => void;
  disabled?: boolean;
  onlyInStock?: boolean;
}

export function ProductSelect({ onSelect, disabled, onlyInStock = false }: ProductSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [products, setProducts] = React.useState<ProductData[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setProducts([]);
        return;
      }
      setLoading(true);
      try {
        const results = await searchProducts(query, onlyInStock);
        setProducts(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 bg-slate-50/50 border-slate-200"
          disabled={disabled}
        >
          <span className="truncate">اختر منتج...</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start" dir="rtl">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="ابحث بالاسم أو الكود..." 
            value={query}
            onValueChange={setQuery}
            className="h-9"
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="mr-2 text-sm text-muted-foreground">جاري البحث...</span>
              </div>
            )}
            {!loading && products.length === 0 && query.trim() !== "" && (
              <CommandEmpty>لم يتم العثور على نتائج.</CommandEmpty>
            )}
            {!loading && query.trim() === "" && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                اكتب للبحث عن المنتجات...
              </div>
            )}
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id.toString()}
                  onSelect={() => {
                    onSelect(product);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex flex-col items-start gap-1 py-3"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold">{product.name}</span>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                      {product.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                    <span>السعر: {product.sellPrice.toLocaleString("ar-EG")} ج.م</span>
                    <span className={cn(
                      "font-bold",
                      product.currentStock <= 0 ? "text-red-500" : "text-green-600"
                    )}>
                      المتوفر: {product.currentStock} {product.unit}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
