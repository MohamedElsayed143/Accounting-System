"use client";

import React from "react";
import { 
  FileText, 
  Plus, 
  ArrowRight, 
  Hash, 
  Calendar,
  Layers,
  Search,
  ChevronLeft,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useManagementMode } from "@/hooks/use-management-mode";
import { PasswordProtectionGate } from "@/components/shared/PasswordProtectionGate";
import { toast } from "sonner";

interface JournalEntry {
  id: number;
  entryNumber: number;
  date: Date;
  description: string;
  reference?: string;
  items: {
    id: number;
    description?: string;
    debit: number;
    credit: number;
    account: {
      code: string;
      name: string;
    }
  }[];
}

export function JournalList({ initialEntries }: { initialEntries: JournalEntry[] }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const { isManagementActive, toggleManagementMode, isUserAdmin } = useManagementMode();
  const [isPassGateOpen, setIsPassGateOpen] = React.useState(false);

  const filteredEntries = initialEntries.filter(entry => 
    entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.entryNumber.toString().includes(searchTerm) ||
    entry.items.some(item => 
      item.account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.account.code.includes(searchTerm)
    )
  );

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-l from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
              <FileText className="w-7 h-7" />
            </div>
            دفتر اليومية المساعد
          </h1>
          <p className="text-slate-500 font-medium text-sm">استعراض وإدارة جميع قيود اليومية اليدوية في النظام</p>
        </div>
        
        <div className="flex items-center gap-4">
          {isUserAdmin && (
            <Button
              onClick={() => isManagementActive ? toggleManagementMode(false) : setIsPassGateOpen(true)}
              variant={isManagementActive ? "default" : "outline"}
              className={cn(
                "h-14 px-6 gap-3 font-black rounded-2xl transition-all shadow-lg",
                isManagementActive 
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" 
                  : "hover:bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              )}
            >
              {isManagementActive ? (
                <>
                  <ShieldCheck className="w-6 h-6" />
                  وضع الإدارة مفعل
                  <Unlock className="w-4 h-4 opacity-50" />
                </>
              ) : (
                <>
                  <ShieldAlert className="w-6 h-6 text-amber-500" />
                  تفعيل وضع الإدارة
                  <Lock className="w-4 h-4 opacity-50" />
                </>
              )}
            </Button>
          )}

          <Link 
            href={isManagementActive ? "/journal/new" : "#"} 
            onClick={(e) => {
              if (!isManagementActive) {
                e.preventDefault();
                toast.error("يجب تفعيل وضع الإدارة لإضافة قيود يومية جديدة");
              }
            }}
          >
            <Button 
              className={cn(
                "h-14 px-8 gap-3 text-lg font-black rounded-2xl transition-all group",
                !isManagementActive && "bg-slate-100 text-slate-400 hover:bg-slate-100 shadow-none border-0"
              )}
            >
              {isManagementActive ? <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> : <Lock className="w-5 h-5" />}
              إضافة قيد جديد
            </Button>
          </Link>
        </div>
      </div>

      <PasswordProtectionGate
        isOpen={isPassGateOpen}
        onClose={() => setIsPassGateOpen(false)}
        onSuccess={() => toggleManagementMode(true)}
      />

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="البحث برقم القيد، الحساب، أو البيان..." 
            className="h-14 pr-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-primary/20 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-14 px-6 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-3 font-bold">
          <Filter className="w-5 h-5 text-slate-400" />
          تصفية متقدمة
        </Button>
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <Card key={entry.id} className="border-0 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800 rounded-[2rem] overflow-hidden group">
              <CardContent className="p-0">
                <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl min-w-[100px] border border-slate-100 dark:border-slate-700">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">رقم القيد</span>
                      <span className="text-2xl font-black text-slate-700 dark:text-slate-200 mt-1">#{entry.entryNumber}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase">
                          <Layers className="w-3 h-3" /> قيد يدوي
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400">
                          <Calendar className="w-3 h-3" /> 
                          {format(new Date(entry.date), "dd MMMM yyyy", { locale: ar })}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-1">{entry.description || entry.items[0]?.description || "بدون بيان"}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="flex gap-6 text-center">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي المبلغ</p>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                          {entry.items.reduce((sum, i) => sum + i.debit, 0).toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">عدد البنود</p>
                        <p className="text-xl font-black text-slate-700 dark:text-slate-200">{entry.items.length}</p>
                      </div>
                    </div>
                    <div className="h-10 w-px bg-slate-100 dark:bg-slate-800" />
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                  </div>
                </div>

                {/* Quick Item View (Nested) */}
                <div className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 p-4 px-8 md:px-12">
                   <div className="flex flex-wrap gap-4">
                      {entry.items.slice(0, 3).map((item, i) => (
                        <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                           <span className="text-[10px] font-black text-slate-400 mono">{item.account.code}</span>
                           <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                             {item.account.name}
                             {item.description && <span className="text-slate-400 font-medium mr-1">- {item.description}</span>}
                           </span>
                        </div>
                      ))}
                      {entry.items.length > 3 && (
                        <div className="px-3 py-1.5 text-xs font-bold text-slate-400">+{entry.items.length - 3} حسابات أخرى</div>
                      )}
                   </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-32 flex flex-col items-center justify-center gap-6 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-200">
              <FileText className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">لم يتم العثور على أي قيود</h3>
              <p className="text-slate-500 font-medium max-w-xs mx-auto">لم يتم تسجيل أي قيود يومية يدوية بعد، ابدأ بإضافة أول قيد الآن</p>
            </div>
            <Link href="/journal/new">
              <Button className="h-14 px-8 gap-3 text-lg font-black rounded-2xl shadow-xl shadow-primary/20">
                <Plus className="w-5 h-5" />
                إضافة قيد جديد
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
