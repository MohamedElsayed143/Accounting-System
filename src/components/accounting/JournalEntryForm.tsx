"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  History,
  Hash,
  FileText,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getJournalSelectableAccounts, getNextEntryNumber, saveJournalEntry } from "@/app/actions/journal";
import { useManagementMode } from "@/hooks/use-management-mode";
import { PasswordProtectionGate } from "@/components/shared/PasswordProtectionGate";
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
import { Check, ChevronsUpDown } from "lucide-react";

interface Account {
  id: number;
  code: string;
  name: string;
  type: string;
  balance: number;
  isTreasury?: boolean;
  isBank?: boolean;
}

interface JournalLine {
  accountId: number | null;
  accountName: string;
  accountCode: string;
  accountType: string;
  description: string;
  debit: number;
  credit: number;
}

export function JournalEntryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entryNumber, setEntryNumber] = useState<number | string>("...");
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: null, accountName: "", accountCode: "", accountType: "", description: "", debit: 0, credit: 0 },
    { accountId: null, accountName: "", accountCode: "", accountType: "", description: "", debit: 0, credit: 0 },
  ]);

  const { isManagementActive, toggleManagementMode } = useManagementMode();
  const [isPassGateOpen, setIsPassGateOpen] = useState(false);

  useEffect(() => {
    getJournalSelectableAccounts().then(setAccounts);
    getNextEntryNumber().then(setEntryNumber);
  }, []);

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const credit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    const diff = Math.abs(debit - credit);
    return { debit, credit, diff, isBalanced: diff < 0.001 && (debit > 0 || credit > 0) };
  }, [lines]);

  const addLine = () => {
    setLines([...lines, { accountId: null, accountName: "", accountCode: "", accountType: "", description: "", debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      toast.error("يجب أن يحتوي القيد على سطرين على الأقل");
      return;
    }
    const newLines = [...lines];
    newLines.splice(index, 1);
    setLines(newLines);
  };

  const updateLine = (index: number, updates: Partial<JournalLine>) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], ...updates };
    
    // If debit is updated, reset credit and vice versa
    if ('debit' in updates && (updates.debit || 0) > 0) {
      newLines[index].credit = 0;
    } else if ('credit' in updates && (updates.credit || 0) > 0) {
      newLines[index].debit = 0;
    }
    
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totals.isBalanced) {
      toast.error("القيد غير متزن. يرجى مراجعة المبالغ.");
      return;
    }

    if (lines.some(l => !l.accountId)) {
      toast.error("يرجى اختيار الحساب لكل الأسطر");
      return;
    }

    setLoading(true);
    try {
      const result = await saveJournalEntry({
        date: new Date(date),
        description,
        reference,
        items: lines.map(l => ({
          accountId: l.accountId!,
          description: l.description,
          debit: l.debit,
          credit: l.credit
        })),
        isAdminMode: isManagementActive
      });

      if (result.success) {
        toast.success("تم حفظ القيد بنجاح");
        router.push("/journal");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  const getAccountNature = (type: string) => {
    switch (type) {
      case "ASSET": return { label: "أصل - مدين", color: "text-emerald-500 bg-emerald-500/10" };
      case "LIABILITY": return { label: "التزام - دائن", color: "text-rose-500 bg-rose-500/10" };
      case "EQUITY": return { label: "حقوق ملكية - دائن", color: "text-amber-500 bg-amber-500/10" };
      case "REVENUE": return { label: "إيراد - دائن", color: "text-blue-500 bg-blue-500/10" };
      case "EXPENSE": return { label: "مصروف - مدين", color: "text-indigo-500 bg-indigo-500/10" };
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20" dir="rtl">
      {/* Header Info Card */}
      <Card className="border-0 shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl ring-1 ring-slate-200 dark:ring-slate-800">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                  <History className="w-6 h-6" />
                </div>
                إضافة قيد يومية يدوي
              </CardTitle>
              <CardDescription className="text-sm font-medium">نظام القيود المزدوجة - يرجى التأكد من توازن القيد قبل الحفظ</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                onClick={() => isManagementActive ? toggleManagementMode(false) : setIsPassGateOpen(true)}
                variant={isManagementActive ? "default" : "outline"}
                className={cn(
                  "h-12 px-6 gap-3 font-black rounded-2xl transition-all shadow-lg",
                  isManagementActive 
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                )}
              >
                {isManagementActive ? (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    وضع الإدارة مفعل
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    تفعيل الإدارة للحفظ
                  </>
                )}
              </Button>

              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <Hash className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-black text-slate-600 dark:text-slate-300">رقم القيد: {entryNumber}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" /> تاريخ القيد
              </Label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-3 h-3" /> البيان العام
              </Label>
              <Input 
                placeholder="ادخل وصفاً موجزاً للعملية..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-primary/20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table Card */}
      <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="grid grid-cols-12 gap-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
            <div className="col-span-4">الحساب المحاسبي</div>
            <div className="col-span-3">البيان</div>
            <div className="col-span-2 text-center text-emerald-600">مدين (Debit)</div>
            <div className="col-span-2 text-center text-rose-600">دائن (Credit)</div>
            <div className="col-span-1"></div>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {lines.map((line, idx) => (
              <div key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all px-6 py-6">
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-4 space-y-2">
                    <AccountPicker 
                      accounts={accounts}
                      selectedId={line.accountId}
                      onSelect={(acc) => {
                        updateLine(idx, { 
                          accountId: acc.id, 
                          accountName: acc.name, 
                          accountCode: acc.code,
                          accountType: acc.type
                        });
                      }}
                    />
                    {line.accountType && (
                      <div className="flex flex-wrap gap-2">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide",
                          getAccountNature(line.accountType)?.color
                        )}>
                          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                          {getAccountNature(line.accountType)?.label}
                        </div>
                        
                        {/* Balance Warning */}
                        {line.accountId && accounts.find(a => a.id === line.accountId) && (
                          (() => {
                            const acc = accounts.find(a => a.id === line.accountId)!;
                            const isAsset = acc.type === 'ASSET';
                            const isLow = acc.balance <= 0;
                            if (isAsset && isLow) {
                              return (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-sm animate-pulse">
                                  <AlertTriangle className="w-3 h-3" />
                                  تنبيه: الرصيد الحالي {acc.balance.toLocaleString('ar-EG')} (غير كافٍ)
                                </div>
                              );
                            }
                            return null;
                          })()
                        )}
                      </div>
                    )}
                  </div>
                  <div className="col-span-3">
                    <Input 
                      placeholder="وصف السطر (اختياري)..." 
                      value={line.description}
                      onChange={(e) => updateLine(idx, { description: e.target.value })}
                      className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-transparent focus:bg-white focus:border-primary/30 transition-all font-medium"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="relative group">
                      <Input 
                        type="number"
                        placeholder="0.00"
                        value={line.debit || ""}
                        onChange={(e) => updateLine(idx, { debit: parseFloat(e.target.value) || 0 })}
                        className="h-11 rounded-xl text-center font-black text-emerald-600 bg-emerald-50/10 border-emerald-500/20 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-500/50">DR</div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="relative group">
                      <Input 
                        type="number"
                        placeholder="0.00"
                        value={line.credit || ""}
                        onChange={(e) => updateLine(idx, { credit: parseFloat(e.target.value) || 0 })}
                        className="h-11 rounded-xl text-center font-black text-rose-600 bg-rose-50/10 border-rose-500/20 focus:ring-rose-500/20 focus:border-rose-500/50"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-500/50">CR</div>
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end pt-1">
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeLine(idx)}
                      disabled={!isManagementActive}
                      className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-30"
                    >
                      {isManagementActive ? <Trash2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Table Actions */}
          <div className="p-6 bg-slate-50/30 dark:bg-slate-800/20">
            <Button 
              type="button"
              variant="outline" 
              onClick={addLine}
              disabled={!isManagementActive}
              className="w-full h-14 border-dashed border-2 bg-transparent hover:bg-white dark:hover:bg-slate-900 gap-3 text-slate-500 font-bold rounded-2xl transition-all disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              إضافة سطر جديد للقيد المحاسبي
            </Button>
          </div>
        </CardContent>

        {/* Totals & Validation Footer */}
        <div className="bg-slate-900 text-white p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي المدين</p>
              <p className="text-3xl font-black text-emerald-400">{totals.debit.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي الدائن</p>
              <p className="text-3xl font-black text-rose-400">{totals.credit.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">فرق التوازن</p>
              <div className="flex items-center gap-3">
                <p className={cn(
                  "text-3xl font-black",
                  totals.diff > 0 ? "text-amber-400" : "text-white"
                )}>
                  {totals.diff.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                </p>
                {totals.diff > 0 && <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />}
              </div>
            </div>
            <div className="flex items-center justify-end">
              <div className={cn(
                "px-6 py-4 rounded-3xl border-2 flex items-center gap-4 transition-all duration-500",
                totals.isBalanced 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              )}>
                {totals.isBalanced ? (
                  <>
                    <div className="space-y-0.5 text-right">
                      <p className="font-black text-base leading-tight">القيد متزن</p>
                      <p className="text-[10px] font-bold opacity-70">جاهز للحفظ الآن</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8" />
                  </>
                ) : (
                  <>
                    <div className="space-y-0.5 text-right">
                      <p className="font-black text-base leading-tight">غير متزن</p>
                      <p className="text-[10px] font-bold opacity-70">يجب تصفير الفرق</p>
                    </div>
                    <AlertCircle className="w-8 h-8" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSubmit}
          disabled={loading || !totals.isBalanced || !isManagementActive}
          className={cn(
            "h-16 px-12 gap-3 text-lg font-black shadow-2xl transition-all rounded-2xl group",
            isManagementActive ? "shadow-primary/20 hover:shadow-primary/40" : "bg-slate-400 cursor-not-allowed shadow-none"
          )}
        >
          {loading ? "جاري المعالجة..." : (
            <>
              {!isManagementActive && <Lock className="w-5 h-5 mb-0.5" />}
              حفظ واعتماد القيد المحاسبي
              {isManagementActive && <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            </>
          )}
        </Button>
      </div>

      <PasswordProtectionGate
        isOpen={isPassGateOpen}
        onClose={() => setIsPassGateOpen(false)}
        onSuccess={() => toggleManagementMode(true)}
      />
    </div>
  );
}

function AccountPicker({ accounts, selectedId, onSelect }: { accounts: Account[], selectedId: number | null, onSelect: (acc: Account) => void }) {
  const [open, setOpen] = useState(false);
  const [showOnlyMoney, setShowOnlyMoney] = useState(false);
  const selected = accounts.find(a => a.id === selectedId);

  const filteredAccounts = useMemo(() => {
    let result = accounts;
    if (showOnlyMoney) {
      result = result.filter(a => a.isTreasury || a.isBank);
    }
    return result.sort((a, b) => {
      const aIsMoney = a.isTreasury || a.isBank ? 1 : 0;
      const bIsMoney = b.isTreasury || b.isBank ? 1 : 0;
      if (aIsMoney !== bIsMoney) return bIsMoney - aIsMoney; // Money accounts first
      return a.code.localeCompare(b.code);
    });
  }, [accounts, showOnlyMoney]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between h-11 px-4 rounded-xl border-transparent bg-slate-50/50 hover:bg-white hover:border-primary/30 transition-all"
        >
          <span className={cn("truncate font-bold text-sm", selected ? "text-slate-900 dark:text-white" : "text-slate-400")}>
            {selected ? `${selected.code} - ${selected.name}` : "اختر الحساب..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 shadow-2xl border-0 overflow-hidden" align="start">
        <Command>
          <div className="flex items-center gap-2 p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <CommandInput placeholder="بحث بالاسم أو الكود..." className="h-10 border-none ring-0 flex-1" />
            <Button
              type="button"
              variant={showOnlyMoney ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyMoney(!showOnlyMoney)}
              className={cn(
                "h-8 px-3 text-[10px] font-bold rounded-lg transition-all shrink-0",
                showOnlyMoney 
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              إظهار الخزائن والبنوك فقط
            </Button>
          </div>
          <CommandList className="max-h-[300px]">
            <CommandEmpty>لا يوجد حسابات بهذا الاسم</CommandEmpty>
            <CommandGroup heading="اختر الحساب الفرعي">
              {filteredAccounts.map((acc) => {
                const isTreasuryOrBank = acc.isTreasury || acc.isBank;
                const balanceColor = acc.balance < 0 ? "text-rose-500" : "text-emerald-500";
                
                return (
                  <CommandItem
                    key={acc.id}
                    value={`${acc.code} ${acc.name}`}
                    onSelect={() => {
                      onSelect(acc);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between p-3 gap-4 cursor-pointer hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={cn(
                        "w-1.5 h-10 rounded-full shrink-0",
                        isTreasuryOrBank ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-slate-200 dark:bg-slate-800"
                      )} />
                      <div className="flex flex-col gap-0.5 overflow-hidden text-right">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white truncate">{acc.name}</span>
                          {acc.isTreasury && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-tighter shadow-sm border border-amber-500/20">
                              خزينة
                            </span>
                          )}
                          {acc.isBank && (
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-[8px] font-black uppercase tracking-tighter shadow-sm border border-blue-500/20">
                              بنك
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-black text-slate-400 mono leading-none tracking-tighter">الكود: {acc.code}</span>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className={cn("text-xs font-black", balanceColor)}>
                        {acc.balance.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-left">الرصيد المتاح</div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
