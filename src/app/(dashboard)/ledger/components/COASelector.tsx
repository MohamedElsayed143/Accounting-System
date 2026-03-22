"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search, FolderTree } from "lucide-react";
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
import { getSelectableAccounts } from "../actions";

interface Account {
  id: number;
  code: string;
  name: string;
  customer?: { id: number } | null;
  supplier?: { id: number } | null;
}

interface COASelectorProps {
  onSelect: (account: Account | null) => void;
  selectedId?: number;
}

export function COASelector({ onSelect, selectedId }: COASelectorProps) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      try {
        const data = await getSelectableAccounts();
        setAccounts(data);
      } catch (error) {
        console.error("Error loading accounts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedId && accounts.length > 0) {
      const found = accounts.find(a => a.id === selectedId);
      if (found) setSelectedAccount(found);
    } else if (!selectedId) {
      setSelectedAccount(null);
    }
  }, [selectedId, accounts]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary transition-all group"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
              selectedAccount 
                ? "bg-primary/10 text-primary" 
                : "bg-slate-50 text-slate-400 dark:bg-slate-800/50"
            )}>
              <FolderTree size={16} />
            </div>
            <span className={cn(
              "truncate font-medium",
              selectedAccount ? "text-slate-900 dark:text-white" : "text-slate-500"
            )}>
              {selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : "اختر الحساب من شجرة الحسابات..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="بحث عن حساب (بالاسم أو الكود)..." className="h-11" />
          <CommandList>
            <CommandEmpty>لا يوجد نتائج</CommandEmpty>
            <CommandGroup heading="الحسابات الفرعية">
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.code} ${account.name}`}
                  onSelect={() => {
                    setSelectedAccount(account);
                    onSelect(account);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between p-3 cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white">{account.name}</span>
                    <span className="text-xs text-slate-500 font-mono">كودالحساب: {account.code}</span>
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4 text-primary",
                      selectedAccount?.id === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
