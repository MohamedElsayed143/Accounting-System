"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowRight,
  Plus,
  Save,
  Loader2,
  AlertCircle,
  Hash,
  FolderTree, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Landmark, 
  Wallet,
  ArrowRightLeft,
  TrendingUp,
  PieChart,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
import { Trash, Info } from "lucide-react";

interface AccountNode {
  id: number;
  code: string;
  name: string;
  nameEn: string | null;
  type: string;
  isSelectable: boolean;
  level: number;
  children: AccountNode[];
  treasurySafe?: { id: number } | null;
  treasuryBank?: { id: number } | null;
  customerId?: number | null;
  supplierId?: number | null;
  balance?: number;
  journalItemsCount?: number;
}

const typeIcons: Record<string, any> = {
  ASSET: { label: "أصول", icon: FolderTree, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  LIABILITY: { label: "خصوم", icon: Hash, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" },
  EQUITY: { label: "حقوق ملكية", icon: PieChart, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
  REVENUE: { label: "إيرادات", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  EXPENSE: { label: "مصروفات", icon: ArrowRightLeft, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  SAFE: { label: "خزينة", icon: Wallet, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  BANK: { label: "بنك", icon: Landmark, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
};

import { getCOATree, createSubAccount, suggestNextAccountCode, deleteAccount } from "../actions";
import { useManagementMode } from "@/hooks/use-management-mode";
import { PasswordProtectionGate } from "@/components/shared/PasswordProtectionGate";

import { Trash2 } from "lucide-react";

function TreeNode({ 
  node, 
  depth = 0, 
  onAddSub, 
  onRefresh,
  onDelete,
  isManagementActive
}: { 
  node: AccountNode; 
  depth?: number; 
  onAddSub: (parent: AccountNode) => void; 
  onRefresh: () => void;
  onDelete: (node: AccountNode) => void;
  isManagementActive: boolean;
}) {
  // Default to expanding if depth < 1 or if it's the root of Assets (which usually contains cash/banks)
  // We can also auto-expand if any child is a treasury or bank
  const hasMoneyChild = React.useMemo(() => {
    const checkChildren = (children: AccountNode[]): boolean => {
      return children.some(c => !!c.treasurySafe || !!c.treasuryBank || checkChildren(c.children));
    };
    return checkChildren(node.children || []);
  }, [node]);

  const [isOpen, setIsOpen] = useState(depth < 1 || hasMoneyChild);
  const hasChildren = node.children && node.children.length > 0;
  
  // Determine icon and colors based on whether it is linked to a treasury or bank
  let config = typeIcons[node.type] || { icon: FileText, color: "text-slate-600", bg: "bg-slate-50" };
  const isSystemAccount = ['4101', '5101', '301', '501'].includes(node.code);
  
  const isOperational = !!node.treasurySafe || !!node.treasuryBank;
  
  if (node.treasurySafe) {
    config = typeIcons.SAFE;
  } else if (node.treasuryBank) {
    config = typeIcons.BANK;
  }

  const handleDelete = async () => {
    onDelete(node);
  };

  const Icon = config.icon;

  return (
    <div className="select-none">
      <div 
        className={cn(
          "flex items-center gap-3 py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all group cursor-pointer border border-transparent",
          isOpen && hasChildren && "bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800",
          isSystemAccount && "border-amber-100/50 dark:border-amber-900/20 bg-amber-50/10"
        )}
        onClick={() => setIsOpen(!isOpen)}
        style={{ marginRight: `${depth * 24}px` }}
      >
        <div className="flex items-center gap-2 min-w-[32px]">
          {hasChildren ? (
            isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
          ) : (
            <div className="w-4" />
          )}
        </div>

        <div className={cn("p-2 rounded-lg", config.bg, isSystemAccount && "bg-amber-100 dark:bg-amber-900/40")}>
          <Icon className={cn("w-4 h-4", config.color, isSystemAccount && "text-amber-700 dark:text-amber-400")} />
        </div>

        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black font-mono text-slate-400 tracking-tighter w-12">{node.code}</span>
            <span className={cn("font-bold text-slate-700 dark:text-slate-200", !node.isSelectable && "text-lg")}>
              {node.name}
            </span>
            {isSystemAccount && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 uppercase tracking-tighter">
                نظامي
              </span>
            )}
            {node.nameEn && <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">{node.nameEn}</span>}
          </div>
        </div>

        <div className="flex flex-col items-end min-w-[120px]">
          <span className={cn(
            "font-mono font-bold text-sm",
            (node.balance || 0) < 0 ? "text-rose-600" : "text-emerald-600"
          )}>
            {(node.balance || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            {node.type === 'ASSET' || node.type === 'EXPENSE' ? 'رصيد مدين' : 'رصيد دائن'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className={cn(
            "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
            config.bg, config.color
          )}>
            {config.label || node.type}
          </span>
          
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 w-8 p-0 rounded-lg transition-all shadow-sm",
                  isManagementActive 
                    ? (node.customerId || node.supplierId || isOperational || isSystemAccount) 
                      ? "bg-slate-100 text-slate-300 cursor-not-allowed" 
                      : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isManagementActive) {
                    toast.error("يجب تفعيل وضع الإدارة لإجراء تعديلات");
                    return;
                  }
                  if (node.customerId || node.supplierId) {
                    toast.error("هذا الحساب مرتبط بكيان خارجي ولا يمكن إضافة حسابات فرعية تحته");
                    return;
                  }
                  if (isSystemAccount) {
                    toast.error("هذا الحساب هو حساب نظام أساسي ولا يمكن تفريعه؛ يرجى استخدامه مباشرة في العمليات المالية");
                    return;
                  }
                  onAddSub(node);
                }}
                disabled={isOperational || !!node.customerId || !!node.supplierId || isSystemAccount}
                title={
                  !isManagementActive ? "وضع الإدارة غير مفعل" :
                  isSystemAccount ? "هذا الحساب هو حساب نظام أساسي ولا يمكن تفريعه؛ يرجى استخدامه مباشرة في العمليات المالية" :
                  (node.customerId || node.supplierId) ? "هذا الحساب مرتبط بكيان خارجي ولا يمكن إضافة حسابات فرعية تحته" :
                  isOperational ? "لا يمكن الإضافة تحت حسابات تشغيلية" :
                  "إضافة حساب فرعي"
                }
              >
                {isManagementActive ? <Plus className="w-4 h-4" /> : <Lock className="w-3 h-3" />}
              </Button>

            {node.level > 1 && !hasChildren && (node.journalItemsCount === 0) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 w-8 p-0 rounded-lg transition-all",
                  isManagementActive
                    ? "hover:bg-rose-50 hover:text-rose-600 text-slate-400"
                    : "text-slate-200 cursor-not-allowed"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isManagementActive) return;
                  handleDelete();
                }}
                disabled={!isManagementActive}
                title={isManagementActive ? "حذف الحساب" : "مغلق"}
              >
                {isManagementActive ? <Trash2 className="w-4 h-4" /> : <Lock className="w-3 h-3" />}
              </Button>
            )}

            {node.isSelectable && (
              <Link href={`/ledger?accountId=${node.id}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 gap-2">
                  <span className="text-xs font-bold">عرض الدفتر</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {isOpen && hasChildren && (
        <div className="mt-1 relative">
          <div className="absolute right-[22px] top-0 bottom-4 w-px bg-slate-100 dark:bg-slate-800" 
               style={{ marginRight: `${depth * 24}px` }} />
          {node.children.map(child => (
            <TreeNode 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              onAddSub={onAddSub} 
              onRefresh={onRefresh} 
              onDelete={onDelete} 
              isManagementActive={isManagementActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddAccountModal({ 
  open, 
  onOpenChange, 
  parent, 
  onSuccess,
  isAdminMode
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
        const result = await createSubAccount({
        parentId: parent.id,
        code,
        name,
        nameEn,
        isAdminMode: isAdminMode
      });

      if (result.success) {
        toast.success("تمت إضافة الحساب بنجاح");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const config = parent ? typeIcons[parent.type] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] gap-0 p-0 border-0 shadow-2xl overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900" dir="rtl">
        <DialogHeader className="p-8 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-2xl", config?.bg || "bg-primary/10")}>
              <Plus className={cn("w-6 h-6", config?.color || "text-primary")} />
            </div>
            <div className="text-right">
              <DialogTitle className="text-2xl font-black tracking-tight">إضافة حساب فرعي جديد</DialogTitle>
              <DialogDescription className="text-sm font-medium">سيتم إضافة الحساب تحت: {parent?.name}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Hash className="w-3 h-3" /> كود الحساب
              </Label>
              <Input 
                value={code} 
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثلاً: 1101"
                className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-primary/20 font-mono font-bold"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-3 h-3" /> طبيعة الحساب
              </Label>
              <div className={cn(
                "h-12 flex items-center px-4 rounded-xl border border-transparent font-bold text-sm",
                config?.bg, config?.color
              )}>
                {config?.label} - {parent?.type === 'ASSET' || parent?.type === 'EXPENSE' ? 'مدين' : 'دائن'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">اسم الحساب (بالعربي)</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: صندوق المصروفات النثرية"
              className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-primary/20 font-bold"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Account Name (English) - Optional</Label>
            <Input 
              value={nameEn} 
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Petty Cash"
              className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-primary/20 font-medium ltr"
              dir="ltr"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-14 gap-3 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              حفظ واعتماد الحساب
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AccountTreePage() {
  const [tree, setTree] = useState<AccountNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<AccountNode | null>(null);

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<AccountNode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { isManagementActive, toggleManagementMode } = useManagementMode();
  const [isPassGateOpen, setIsPassGateOpen] = useState(false);

  const refreshTree = () => {
    setLoading(true);
    getCOATree()
      .then(data => {
        setTree(data);
      })
      .catch(err => {
        console.error("Error refreshing tree:", err);
        toast.error("حدث خطأ أثناء تحميل شجرة الحسابات");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    refreshTree();
  }, []);

  const handleAddSub = (parent: AccountNode) => {
    setSelectedParent(parent);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteAccount(accountToDelete.id, isManagementActive);
      if (result.success) {
        toast.success(`تم حذف الحساب "${accountToDelete.name}" بنجاح`);
        refreshTree();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("حدث خطأ تقني أثناء محاولة الحذف");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  return (
    <>
      <Navbar title="دليل شجرة الحسابات" />
      <div className="flex-1 p-4 md:p-8 space-y-8 bg-slate-50/30 dark:bg-transparent min-h-screen" dir="rtl">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-l from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                <FolderTree className="w-7 h-7" />
              </div>
              دليل الحسابات (COA)
            </h1>
            <p className="text-slate-500 font-medium text-sm">
              الهيكل التنظيمي للنظام المحاسبي وتصنيفات الحسابات
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => isManagementActive ? toggleManagementMode(false) : setIsPassGateOpen(true)}
              variant={isManagementActive ? "default" : "outline"}
              className={cn(
                "h-12 px-6 gap-3 font-black rounded-2xl transition-all shadow-lg",
                isManagementActive 
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" 
                  : "hover:bg-slate-100"
              )}
            >
              {isManagementActive ? (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  وضع الإدارة مفعل
                  <Unlock className="w-4 h-4 opacity-50" />
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  تفعيل وضع الإدارة
                  <Lock className="w-4 h-4 opacity-50" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tree Container */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 md:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-l from-emerald-500 via-blue-500 to-rose-500 opacity-20" />
          
          {loading && tree.length === 0 ? (
            <div className="py-32 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-slate-400">جاري تحميل شجرة الحسابات...</p>
            </div>
          ) : tree.length > 0 ? (
            <div className="space-y-2">
              {tree.map(node => (
                <TreeNode 
                  key={node.id} 
                  node={node} 
                  onAddSub={handleAddSub} 
                  onRefresh={refreshTree} 
                  onDelete={(n) => {
                    setAccountToDelete(n);
                    setIsDeleteDialogOpen(true);
                  }}
                  isManagementActive={isManagementActive}
                />
              ))}
            </div>
          ) : (
            <div className="py-32 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-200">
                <FolderTree className="w-10 h-10" />
              </div>
              <p className="font-bold text-slate-400">لم يتم إعداد شجرة الحسابات بعد</p>
            </div>
          )}
        </div>

        {/* Legend / Info */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {Object.entries(typeIcons).map(([type, config]) => (
            <div key={type} className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className={cn("p-2 rounded-lg", config.bg)}>
                <config.icon className={cn("w-4 h-4", config.color)} />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{config.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">خزينة</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Landmark className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">بنك</span>
          </div>
        </div>
      </div>

      <AddAccountModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        parent={selectedParent} 
        onSuccess={refreshTree}
        isAdminMode={isManagementActive}
      />

      <PasswordProtectionGate
        isOpen={isPassGateOpen}
        onClose={() => setIsPassGateOpen(false)}
        onSuccess={() => toggleManagementMode(true)}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[440px] border-0 shadow-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white dark:bg-slate-900" dir="rtl">
          <div className="p-8 bg-rose-50/50 dark:bg-rose-950/10 border-b border-rose-100/50 dark:border-rose-900/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 shadow-sm animate-pulse">
                <Trash className="w-6 h-6" />
              </div>
              <div className="text-right">
                <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  تأكيد إجراء الحذف
                </AlertDialogTitle>
                <AlertDialogDescription className="text-rose-600/80 font-bold text-xs mt-0.5">
                  هذا الإجراء ليس له تراجع مستقبلي
                </AlertDialogDescription>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Info className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">تفاصيل الحساب المستهدف</span>
              </div>
              <div>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100">{accountToDelete?.name}</p>
                <p className="text-xs font-mono font-bold text-slate-400 mt-0.5">كود الحساب: {accountToDelete?.code}</p>
              </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium px-1">
              أنت على وشك مسح هذا الحساب نهائياً من شجرة الحسابات. يرجى التأكد من عدم وجود أي ارتباطات مستقبلية بهذا الحساب قبل التأكيد.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <AlertDialogCancel className="h-14 rounded-2xl font-black text-slate-600 border-slate-200 hover:bg-slate-50 transition-all">
                إلغاء العملية
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmDelete();
                }}
                className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-lg shadow-rose-200 dark:shadow-none transition-all disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : "تأكيد الحذف النهائي"}
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
