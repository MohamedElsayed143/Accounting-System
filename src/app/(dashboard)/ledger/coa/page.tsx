"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FolderTree,
  Plus,
  ChevronRight,
  ChevronDown,
  Hash,
  PieChart,
  TrendingUp,
  ArrowRightLeft,
  ArrowRight,
  Maximize2,
  FileText,
  AlertCircle,
  Save,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Wallet,
  Landmark,
  Trash,
  Trash2,
  Info,
  Search,
  X,
  GitBranch,
  List,
  Layers,
  TrendingDown,
  ChevronLeft,
  BookOpen,
  Sparkles,
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCOATree, createSubAccount, suggestNextAccountCode, deleteAccount, updateAccount } from "../actions";
import { useManagementMode } from "@/hooks/use-management-mode";
import { PasswordProtectionGate } from "@/components/shared/PasswordProtectionGate";
import Link from "next/link";
import { COAFlowTree } from "./components/COAFlowTree";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountNode {
  id: number;
  code: string;
  name: string;
  nameEn: string | null;
  type: string;
  isSelectable: boolean;
  isTerminal: boolean;
  level: number;
  children: AccountNode[];
  treasurySafe?: { id: number } | null;
  treasuryBank?: { id: number } | null;
  customerId?: number | null;
  supplierId?: number | null;
  balance?: number;
  journalItemsCount?: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; dot: string }> = {
  ASSET:     { label: "أصول",         icon: FolderTree,      color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20",  dot: "bg-emerald-500" },
  LIABILITY: { label: "خصوم",         icon: Hash,             color: "text-rose-700 dark:text-rose-400",      bg: "bg-rose-50 dark:bg-rose-900/20",         dot: "bg-rose-500" },
  EQUITY:    { label: "حقوق ملكية",   icon: PieChart,         color: "text-violet-700 dark:text-violet-400",  bg: "bg-violet-50 dark:bg-violet-900/20",     dot: "bg-violet-500" },
  REVENUE:   { label: "إيرادات",      icon: TrendingUp,       color: "text-amber-700 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-900/20",       dot: "bg-amber-500" },
  EXPENSE:   { label: "مصروفات",      icon: ArrowRightLeft,   color: "text-indigo-700 dark:text-indigo-400",  bg: "bg-indigo-50 dark:bg-indigo-900/20",     dot: "bg-indigo-500" },
  SAFE:      { label: "خزينة",        icon: Wallet,           color: "text-amber-700 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-900/20",       dot: "bg-amber-400" },
  BANK:      { label: "بنك",          icon: Landmark,         color: "text-blue-700 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-blue-900/20",         dot: "bg-blue-500" },
};

const LEVEL_LABEL: Record<number, string> = {
  1: "حساب أساسي",
  2: "حساب رئيسي",
  3: "مجموعة حسابات",
  4: "حساب طرفي",
};

// ─── Flatten helper ───────────────────────────────────────────────────────────

const flattenTree = (items: AccountNode[], depth = 0): Array<AccountNode & { depth: number }> =>
  items.flatMap((item) => [
    { ...item, depth },
    ...(item.children ? flattenTree(item.children, depth + 1) : []),
  ]);

// ─── Stats Bar ────────────────────────────────────────────────────────────────

const StatsBar: React.FC<{ tree: AccountNode[] }> = ({ tree }) => {
  const flat = flattenTree(tree);
  const stats = [
    {
      label: "إجمالي الحسابات",
      value: flat.length,
      icon: <Layers size={15} />,
      color: "text-slate-600 dark:text-slate-300",
      bg: "bg-slate-100 dark:bg-slate-800",
    },
    {
      label: "حسابات طرفية",
      value: flat.filter((a) => a.isTerminal).length,
      icon: <GitBranch size={15} />,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "إجمالي الأصول",
      value:
        flat
          .filter((a) => a.type === "ASSET" && a.isTerminal)
          .reduce((s, a) => s + (a.balance ?? 0), 0)
          .toLocaleString("ar-EG", { maximumFractionDigits: 0 }) + " ج.م",
      icon: <TrendingUp size={15} />,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "إجمالي الالتزامات",
      value:
        flat
          .filter((a) => a.type === "LIABILITY" && a.isTerminal)
          .reduce((s, a) => s + (a.balance ?? 0), 0)
          .toLocaleString("ar-EG", { maximumFractionDigits: 0 }) + " ج.م",
      icon: <TrendingDown size={15} />,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm"
        >
          <div className={cn("p-2 rounded-xl flex-shrink-0", s.bg, s.color)}>{s.icon}</div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">{s.label}</p>
            <p className={cn("font-black text-[15px] tabular-nums mt-0.5", s.color)}>{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Tree Node ────────────────────────────────────────────────────────────────

function TreeNode({
  node,
  depth = 0,
  onAddSub,
  onEdit,
  onRefresh,
  onDelete,
  isManagementActive,
  searchQuery = "",
}: {
  node: AccountNode;
  depth?: number;
  onAddSub: (parent: AccountNode) => void;
  onEdit: (node: AccountNode) => void;
  onRefresh: () => void;
  onDelete: (node: AccountNode) => void;
  isManagementActive: boolean;
  searchQuery?: string;
}) {
  const hasMoneyChild = React.useMemo(() => {
    const check = (children: AccountNode[]): boolean =>
      children.some((c) => !!c.treasurySafe || !!c.treasuryBank || check(c.children));
    return check(node.children || []);
  }, [node]);

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (searchQuery.trim() !== "") {
      setIsOpen(true);
    }
  }, [searchQuery]);
  const hasChildren = node.children && node.children.length > 0;

  let config = TYPE_CONFIG[node.type] || { icon: FileText, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-800", dot: "bg-slate-400", label: node.type };
  const isSystemAccount = ["4101", "5101", "3101", "501"].includes(node.code);
  const isOperational = !!node.treasurySafe || !!node.treasuryBank;
  if (node.treasurySafe) config = TYPE_CONFIG.SAFE;
  else if (node.treasuryBank) config = TYPE_CONFIG.BANK;

  const Icon = config.icon;
  const isL1 = node.level === 1;
  const isL2 = node.level === 2;
  const balance = node.balance ?? 0;

  // Highlight matching text
  const isMatch =
    searchQuery.trim() !== "" &&
    (node.name.includes(searchQuery) || node.code.includes(searchQuery));

  return (
    <div className="select-none w-full text-right" dir="rtl">
      <div
        className={cn(
          "group flex flex-row-reverse items-center gap-3 transition-all duration-200 cursor-pointer border",
          // L1: dark card
          isL1 && "py-4 px-5 rounded-2xl bg-slate-900 text-white border-slate-800 shadow-xl mb-2",
          // L2: soft card
          isL2 && !isL1 && "py-3 px-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 mb-1 ml-6",
          // L3+
          !isL1 && !isL2 && "py-2.5 px-4 rounded-xl border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:border-slate-100 dark:hover:border-slate-800",
          isMatch && "ring-2 ring-amber-400 ring-offset-1 bg-amber-50/30 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700"
        )}
        style={{ marginRight: !isL1 ? `${depth * 20}px` : "0" }}
        onClick={() => setIsOpen((o) => !o)}
      >
        {/* Chevron */}
        <div className="flex-shrink-0 w-5">
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className={cn("w-4 h-4", isL1 ? "text-white/50" : "text-slate-400")} />
            ) : (
              <ChevronRight className={cn("w-4 h-4", isL1 ? "text-white/50" : "text-slate-400")} />
            )
          ) : (
            <span className={cn("inline-block w-1.5 h-1.5 rounded-full mx-auto", config.dot, "opacity-60")} />
          )}
        </div>

        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 p-2 rounded-lg transition-colors",
            isL1 ? "bg-white/10 text-white" : cn(config.bg, config.color)
          )}
        >
          <Icon className="w-4 h-4" />
        </div>

        {/* Name & code */}
        <div className="flex-1 min-w-0 flex flex-row-reverse items-center gap-3 overflow-hidden">
          <span
            className={cn(
              "font-mono text-[10px] flex-shrink-0",
              isL1 ? "text-white/40" : "text-slate-400"
            )}
          >
            {node.code}
          </span>
          <span
            className={cn(
              "font-bold truncate",
              isL1 ? "text-base text-white" : isL2 ? "text-sm text-slate-700 dark:text-slate-200" : "text-[13px] text-slate-700 dark:text-slate-300"
            )}
          >
            {node.name}
          </span>
          {node.nameEn && (
            <span className={cn("text-[11px] hidden md:inline truncate", isL1 ? "text-white/30" : "text-slate-400")}>
              {node.nameEn}
            </span>
          )}
          {isSystemAccount && (
            <span className="flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 uppercase tracking-tight">
              نظامي
            </span>
          )}
          {node.isTerminal && (
            <span className="flex-shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              نهائي
            </span>
          )}
        </div>

        {/* Balance */}
        <div className={cn("flex-shrink-0 text-left min-w-[120px]", isL1 ? "border-r border-white/10" : "border-r border-slate-200 dark:border-slate-700", "pr-4 mr-2")}>
          <p
            className={cn(
              "font-black text-sm tabular-nums",
              isL1 ? "text-white" : balance < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
            )}
          >
            {balance.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
            <span className={cn("text-[10px] font-bold mr-1", isL1 ? "text-white/40" : "text-slate-400")}>ج.م</span>
          </p>
          <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-0.5", isL1 ? "text-white/30" : "text-slate-400")}>
            {node.type === "ASSET" || node.type === "EXPENSE" ? "مدين" : "دائن"}
          </p>
        </div>

        {/* Actions — reveal on hover */}
        <div
          className={cn(
            "flex-shrink-0 flex items-center gap-1.5 transition-all duration-200",
            "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Add sub-account - Level 3 + L2 Equity */}
          {isManagementActive && !isOperational && !node.customerId && !node.supplierId && (node.level === 3 || (node.level === 2 && node.type === 'EQUITY')) && (
            <button
              onClick={() => onAddSub(node)}
              title="إضافة حساب فرعي"
              className={cn(
                "flex items-center gap-1 h-8 px-3 rounded-lg text-[11px] font-black transition-all",
                isL1
                  ? "bg-white/10 text-white hover:bg-white hover:text-slate-900"
                  : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40 border border-blue-100 dark:border-blue-800"
              )}
            >
              <Plus size={12} /> فرعي
            </button>
          )}

          {/* Edit account */}
          {isManagementActive && (
            <button
              onClick={() => onEdit(node)}
              title="تعديل الحساب"
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all",
                isL1 && "bg-white/10 text-white hover:bg-white hover:text-slate-900"
              )}
            >
              <Pencil size={12} />
            </button>
          )}

          {/* View ledger */}
          {node.isTerminal && (
            <Link href={`/ledger?accountId=${node.id}`}>
              <button
                className={cn(
                  "flex items-center gap-1 h-8 px-3 rounded-lg text-[11px] font-black transition-all",
                  isL1
                    ? "bg-white/10 text-white hover:bg-white hover:text-slate-900"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                )}
              >
                <BookOpen size={12} /> الدفتر
              </button>
            </Link>
          )}

          {/* Delete */}
          {node.level > 1 && !hasChildren && isManagementActive && (!node.journalItemsCount || node.journalItemsCount === 0) && (
            <button
              onClick={() => onDelete(node)}
              title="حذف الحساب"
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-800/40 border border-rose-100 dark:border-rose-800 transition-all"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {isOpen && hasChildren && (
        <div className="mt-1 relative">
          {!isL1 && (
            <div
              className="absolute top-0 bottom-4 w-px bg-slate-100 dark:bg-slate-800 rounded-full"
              style={{ right: `${(depth + 1) * 20 + 9}px` }}
            />
          )}
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onAddSub={onAddSub}
              onEdit={onEdit}
              onRefresh={onRefresh}
              onDelete={onDelete}
              isManagementActive={isManagementActive}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── List Table View ──────────────────────────────────────────────────────────

const ListView: React.FC<{
  tree: AccountNode[];
  searchQuery: string;
  onAddSub: (n: AccountNode) => void;
  onEdit: (n: AccountNode) => void;
  onDelete: (n: AccountNode) => void;
  isManagementActive: boolean;
}> = ({ tree, searchQuery, onAddSub, onEdit, onDelete, isManagementActive }) => {
  const flat = flattenTree(tree);
  const filtered = searchQuery.trim()
    ? flat.filter((a) => a.name.includes(searchQuery) || a.code.includes(searchQuery))
    : flat;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm text-right">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            {["الكود", "اسم الحساب", "المستوى", "النوع", "الرصيد", ""].map((h) => (
              <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((account) => {
            const config = TYPE_CONFIG[account.type] ?? { label: account.type, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800", dot: "bg-slate-400", icon: FileText };
            return (
              <tr
                key={account.id}
                className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors group"
              >
                <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{account.code}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2" style={{ paddingRight: account.depth * 20 }}>
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dot)} />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-[13px]">
                      {account.name}
                    </span>
                    {account.isTerminal && (
                      <span className="text-[9px] font-black text-emerald-500 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">
                        نهائي
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                    {LEVEL_LABEL[account.level] ?? `م${account.level}`}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("text-[10px] font-black px-2 py-1 rounded-full", config.bg, config.color)}>
                    {config.label}
                  </span>
                </td>
                <td className="px-4 py-3 font-black tabular-nums text-[13px] text-slate-800 dark:text-slate-200">
                  {(account.balance ?? 0).toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                  <span className="text-[10px] font-bold text-slate-400 mr-1">ج.م</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {account.isTerminal && (
                      <Link href={`/ledger?accountId=${account.id}`}>
                        <button className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[10px] font-black bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all">
                          <BookOpen size={11} /> الدفتر
                        </button>
                      </Link>
                    )}
                    {!account.isTerminal && isManagementActive && account.level < 4 && (
                      <button
                        onClick={() => onAddSub(account)}
                        className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[10px] font-black bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40 border border-blue-100 dark:border-blue-800 transition-all"
                      >
                        <Plus size={11} /> فرعي
                      </button>
                    )}
                    {isManagementActive && (
                      <button
                        onClick={() => onEdit(account)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all"
                      >
                        <Pencil size={11} />
                      </button>
                    )}
                    {account.level > 1 && !account.children?.length && isManagementActive && (!account.journalItemsCount || account.journalItemsCount === 0) && (
                      <button
                        onClick={() => onDelete(account)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-800/40 border border-rose-100 dark:border-rose-800 transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Search size={28} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold text-sm">لا توجد نتائج لـ "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

// ─── Add Account Modal ────────────────────────────────────────────────────────

function AddAccountModal({
  open,
  onOpenChange,
  parent,
  onSuccess,
  isAdminMode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent: AccountNode | null;
  onSuccess: () => void;
  isAdminMode: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (open && parent) {
      suggestNextAccountCode(parent.id).then(setCode);
      setName("");
      setNameEn("");
    }
  }, [open, parent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parent) return;
    setLoading(true);
    try {
      const result = await createSubAccount({ parentId: parent.id, code, name, nameEn, isAdminMode });
      if (result.success) {
        toast.success("تمت إضافة الحساب بنجاح");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const config = parent ? (TYPE_CONFIG[parent.type] ?? null) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] gap-0 p-0 border-0 shadow-2xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-bl from-blue-50/60 to-white dark:from-slate-800/40 dark:to-slate-900">
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-2xl flex-shrink-0 shadow-sm", config?.bg ?? "bg-blue-50 dark:bg-blue-900/20")}>
              <Sparkles className={cn("w-5 h-5", config?.color ?? "text-blue-600")} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">إضافة حساب فرعي جديد</h2>
              {parent && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">تحت حساب</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                    {parent.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{parent.code}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Code + Nature row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Hash size={10} /> كود الحساب
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثلاً: 1101"
                className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono font-bold text-left focus-visible:ring-blue-500"
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">طبيعة الحساب</label>
              <div
                className={cn(
                  "h-11 flex items-center px-3 rounded-xl border border-transparent font-bold text-sm flex-row-reverse gap-2",
                  config?.bg,
                  config?.color
                )}
              >
                {config?.label}
                <span className="text-[10px] opacity-70">
                  — {parent?.type === "ASSET" || parent?.type === "EXPENSE" ? "مدين" : "دائن"}
                </span>
              </div>
            </div>
          </div>

          {/* Arabic name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              اسم الحساب بالعربي <span className="text-rose-400">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: صندوق المصروفات النثرية"
              className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold focus-visible:ring-blue-500"
              required
            />
          </div>

          {/* English name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Account Name (English)
              <span className="mr-2 text-slate-300 normal-case font-bold">اختياري</span>
            </label>
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Petty Cash"
              className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium focus-visible:ring-blue-500"
              dir="ltr"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-200 dark:shadow-none transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ الحساب
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Account Modal ───────────────────────────────────────────────────────

function EditAccountModal({
  open,
  onOpenChange,
  account,
  onSuccess,
  isAdminMode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountNode | null;
  onSuccess: () => void;
  isAdminMode: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");

  useEffect(() => {
    if (open && account) {
      setName(account.name);
      setNameEn(account.nameEn || "");
    }
  }, [open, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setLoading(true);
    try {
      const result = await updateAccount({ accountId: account.id, name, nameEn, isAdminMode });
      if (result.success) {
        toast.success("تم تحديث الحساب بنجاح");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] gap-0 p-0 border-0 shadow-2xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900"
        dir="rtl"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-bl from-amber-50/60 to-white dark:from-slate-800/40 dark:to-slate-900">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl flex-shrink-0 bg-amber-50 dark:bg-amber-900/20 shadow-sm text-amber-600">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">تعديل حساب</h2>
              {account && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">كود الحساب</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                    {account.code}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              اسم الحساب بالعربي <span className="text-rose-400">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: صندوق المصروفات النثرية"
              className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold focus-visible:ring-amber-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Account Name (English)
              <span className="mr-2 text-slate-300 normal-case font-bold">اختياري</span>
            </label>
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Petty Cash"
              className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium focus-visible:ring-amber-500"
              dir="ltr"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-lg shadow-amber-200 dark:shadow-none transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ التعديلات
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccountTreePage() {
  const [tree, setTree] = useState<AccountNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<AccountNode | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<AccountNode | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<AccountNode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { isManagementActive, toggleManagementMode, isUserAdmin } = useManagementMode();
  const [isPassGateOpen, setIsPassGateOpen] = useState(false);

  // "tree" = the collapsible tree, "list" = flat table, "flow" = ReactFlow diagram
  const [viewMode, setViewMode] = useState<"tree" | "list" | "flow">("tree");
  const [searchQuery, setSearchQuery] = useState("");

  const refreshTree = useCallback(() => {
    setLoading(true);
    getCOATree()
      .then(setTree)
      .catch(() => toast.error("حدث خطأ أثناء تحميل شجرة الحسابات"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refreshTree(); }, [refreshTree]);

  const handleAddSub = (parent: any) => {
    setSelectedParent(parent);
    setIsModalOpen(true);
  };

  const handleEdit = (node: any) => {
    setAccountToEdit(node);
    setIsEditModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteAccount(accountToDelete.id, isManagementActive);
      if (result.success) {
        toast.success(`تم حذف "${accountToDelete.name}" بنجاح`);
        refreshTree();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("حدث خطأ تقني أثناء محاولة الحذف");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const viewOptions = [
    { id: "tree" as const, label: "شجرة", icon: <FolderTree size={14} /> },
    { id: "list" as const, label: "جدول", icon: <List size={14} /> },
    { id: "flow" as const, label: "مخطط", icon: <GitBranch size={14} /> },
  ];

  return (
    <>
      <Navbar title="دليل شجرة الحسابات" />

      <div className="flex-1 p-4 md:p-8 space-y-6 bg-slate-50/30 dark:bg-transparent min-h-screen" dir="rtl">

        {/* ── Page header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm">
                <FolderTree className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                دليل الحسابات
                <span className="text-slate-400 font-bold mr-2 text-base">COA</span>
              </h1>
            </div>
            <p className="text-slate-500 text-sm font-medium mt-1 mr-1">
              الهيكل التنظيمي للنظام المحاسبي — 4 مستويات
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Management mode toggle */}
            {isUserAdmin && (
              <button
                onClick={() => isManagementActive ? toggleManagementMode(false) : setIsPassGateOpen(true)}
                className={cn(
                  "flex items-center gap-2 h-10 px-4 rounded-xl font-black text-sm transition-all border shadow-sm",
                  isManagementActive
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-200 dark:shadow-none hover:bg-emerald-700"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {isManagementActive ? (
                  <>
                    <ShieldCheck size={15} />
                    وضع الإدارة
                    <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-md">مفعّل</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={15} className="text-amber-500" />
                    تفعيل الإدارة
                    <Lock size={12} className="opacity-40" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        {tree.length > 0 && <StatsBar tree={tree} />}

        {/* ── Toolbar: search + view toggle ── */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو الكود..."
              className="w-full pr-9 pl-8 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Result count */}
          {searchQuery && (
            <span className="text-[11px] font-bold text-slate-500 flex-shrink-0">
              {flattenTree(tree).filter((a) => a.name.includes(searchQuery) || a.code.includes(searchQuery)).length} نتيجة
            </span>
          )}

          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mr-auto">
            {viewOptions.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black transition-all",
                  viewMode === id
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Management mode banner ── */}
        {isManagementActive && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck size={16} className="flex-shrink-0" />
            <p className="text-sm font-bold">
              وضع الإدارة مفعّل — يمكنك إضافة وحذف الحسابات الآن.
            </p>
            <button
              onClick={() => toggleManagementMode(false)}
              className="mr-auto text-[11px] font-black underline underline-offset-2 hover:no-underline transition-all"
            >
              إيقاف التشغيل
            </button>
          </div>
        )}

        {/* ── Content ── */}
        <div
          className={cn(
            "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all duration-300",
            viewMode === "flow" ? "rounded-3xl p-3" : "rounded-3xl p-5 md:p-8"
          )}
        >
          {loading && tree.length === 0 ? (
            <div className="py-28 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-slate-400 text-sm">جاري تحميل شجرة الحسابات...</p>
            </div>
          ) : tree.length === 0 ? (
            <div className="py-28 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center">
                <FolderTree className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-bold text-slate-400">لم يتم إعداد شجرة الحسابات بعد</p>
            </div>
          ) : viewMode === "flow" ? (
            <COAFlowTree data={tree} onAddSub={handleAddSub} isManagementActive={isManagementActive} />
          ) : viewMode === "list" ? (
            <ListView
              tree={tree}
              searchQuery={searchQuery}
              onAddSub={handleAddSub}
              onEdit={handleEdit}
              onDelete={(n) => { setAccountToDelete(n); setIsDeleteDialogOpen(true); }}
              isManagementActive={isManagementActive}
            />
          ) : (
            /* Tree view */
            <div className="space-y-1">
              {tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  onAddSub={handleAddSub}
                  onEdit={handleEdit}
                  onRefresh={refreshTree}
                  onDelete={(n) => { setAccountToDelete(n); setIsDeleteDialogOpen(true); }}
                  isManagementActive={isManagementActive}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Type legend ── */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_CONFIG).map(([type, config]) => (
            <div
              key={type}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
            >
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", config.dot)} />
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modals ── */}
      <AddAccountModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        parent={selectedParent}
        onSuccess={refreshTree}
        isAdminMode={isManagementActive}
      />

      <EditAccountModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        account={accountToEdit}
        onSuccess={refreshTree}
        isAdminMode={isManagementActive}
      />

      <PasswordProtectionGate
        isOpen={isPassGateOpen}
        onClose={() => setIsPassGateOpen(false)}
        onSuccess={() => toggleManagementMode(true)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent
          className="sm:max-w-[420px] border-0 shadow-2xl rounded-3xl p-0 overflow-hidden bg-white dark:bg-slate-900"
          dir="rtl"
        >
          <div className="p-6 bg-rose-50/60 dark:bg-rose-950/10 border-b border-rose-100/50 dark:border-rose-900/20 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">تأكيد الحذف</h3>
              <p className="text-xs font-bold text-rose-500 mt-0.5">هذا الإجراء لا يمكن التراجع عنه</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <p className="text-base font-black text-slate-800 dark:text-slate-100">{accountToDelete?.name}</p>
              <p className="text-xs font-mono font-bold text-slate-400 mt-1">كود: {accountToDelete?.code}</p>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              سيتم مسح هذا الحساب نهائياً من شجرة الحسابات. تأكد من عدم وجود ارتباطات قبل المتابعة.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <AlertDialogCancel className="h-12 rounded-xl font-black text-slate-600 border-slate-200 hover:bg-slate-50">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
                disabled={isDeleting}
                className="h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-lg shadow-rose-200/50 dark:shadow-none disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الحذف"}
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}