"use client";

import React, { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Search, User } from "lucide-react";
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
import { getCustomers } from "@/app/(dashboard)/customers/actions";

interface Customer {
  id: number;
  name: string;
  code: number;
}

interface CustomerSelectProps {
  onSelect: (customer: Customer) => void;
  selectedId?: number;
  error?: string;
}

export function CustomerSelect({ onSelect, selectedId, error }: CustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const data = await getCustomers();
        setCustomers(data);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  const selectedCustomer = customers.find((c) => c.id === selectedId);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">العميل</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between text-right font-normal",
              !selectedCustomer && "text-muted-foreground",
              error && "border-red-500"
            )}
            disabled={loading}
          >
            {selectedCustomer ? (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span>{selectedCustomer.name}</span>
                <span className="text-xs text-muted-foreground">({selectedCustomer.code})</span>
              </div>
            ) : (
              loading ? "جاري التحميل..." : "ابحث عن عميل..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="ابحث بالاسم أو الكود..." className="text-right" />
            <CommandList>
              <CommandEmpty>لم يتم العثور على نتائج.</CommandEmpty>
              <CommandGroup>
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={`${customer.name} ${customer.code}`}
                    onSelect={() => {
                      onSelect(customer);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between pointer-events-auto"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{customer.name}</span>
                        <span className="text-xs text-muted-foreground">كود: {customer.code}</span>
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4 text-primary",
                        selectedId === customer.id ? "opacity-100" : "opacity-0"
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
