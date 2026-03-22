"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search, Landmark, Wallet } from "lucide-react";
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
import { getSafes, getBanks } from "../actions";

interface Account {
  id: number;
  accountId?: number | null;
  name: string;
  balance: number;
  type: 'safe' | 'bank';
  accountNumber?: string | null;
}

interface AccountSearchDropdownProps {
  type: 'safe' | 'bank';
  onSelect: (account: Account | null) => void;
  selectedId?: number;
}

export function AccountSearchDropdown({ type, onSelect, selectedId }: AccountSearchDropdownProps) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      try {
        if (type === 'safe') {
          const safes = await getSafes();
          setAccounts(safes.map(s => ({ ...s, type: 'safe' as const })));
        } else {
          const banks = await getBanks();
          setAccounts(banks.map(b => ({ ...b, type: 'bank' as const })));
        }
      } catch (error) {
        console.error("Error loading accounts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, [type]);

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
          className="w-full justify-between h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all group"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
              selectedAccount 
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
                : "bg-slate-50 text-slate-400 dark:bg-slate-800/50"
            )}>
              {type === 'safe' ? <Wallet size={16} /> : <Landmark size={16} />}
            </div>
            <span className={cn(
              "truncate font-medium",
              selectedAccount ? "text-slate-900 dark:text-white" : "text-slate-500"
            )}>
              {selectedAccount ? selectedAccount.name : (type === 'safe' ? "اختر الخزنة..." : "اختر البنك...")}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={type === 'safe' ? "بحث عن خزنة..." : "بحث عن بنك..."} className="h-11" />
          <CommandList>
            <CommandEmpty>لا يوجد نتائج</CommandEmpty>
            <CommandGroup>
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.name}
                  onSelect={() => {
                    setSelectedAccount(account);
                    onSelect(account);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between p-3 cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white">{account.name}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {account.accountNumber && <span>رقم الحساب: {account.accountNumber}</span>}
                      <span>الرصيد: {account.balance.toLocaleString('ar-EG')}</span>
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4 text-blue-600",
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
