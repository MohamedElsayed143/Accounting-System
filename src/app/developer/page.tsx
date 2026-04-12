"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Code2, Settings2, Users, Upload, Trash2, Plus, RefreshCw,
  Save, Eye, EyeOff, Shield, LogOut, Image as ImageIcon,
  Terminal, X, Check, AlertCircle, Loader2, Edit3, Mail,
  User, Lock, Monitor, ChevronDown, Zap
} from "lucide-react";
import {
  getSystemConfig, updateSystemConfig,
  getDeveloperUsers, createDeveloperUser,
  deleteDeveloperUser, updateUserEmail
} from "./actions";
import { logoutAction } from "@/app/login/actions";

const DEVELOPER_EMAIL = "mohmadelkhadry@gmail.com";

// ─────────────────────────────────────────────────────────────────────────────

type Tab = "system" | "users";

interface SystemConfigData {
  id: number;
  systemName: string;
  systemLogo: string | null;
}

interface UserData {
  id: number;
  username: string;
  email: string | null;
  role: string;
  createdAt: string | Date;
  maxDevices: number;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DeveloperPortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("system");
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // Verify developer access on mount
  useEffect(() => {
    getSystemConfig().then((res) => {
      if (res.success) setAuthorized(true);
      else { setAuthorized(false); router.replace("/login"); }
    });
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (authorized === false) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" dir="rtl">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-none">Developer Portal</h1>
              <p className="text-[10px] text-violet-400 font-mono">{DEVELOPER_EMAIL}</p>
            </div>
          </div>
          <button
            onClick={async () => { await logoutAction(); router.push("/login"); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-bold transition-all border border-white/5"
          >
            <LogOut className="w-3.5 h-3.5" /> خروج
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8">
        <div className="flex gap-1 bg-white/[0.03] border border-white/5 p-1 rounded-2xl w-fit">
          {([
            { id: "system" as Tab, label: "إعدادات النظام", icon: Settings2 },
            { id: "users" as Tab, label: "إدارة المستخدمين", icon: Users },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/20"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-8 pb-20">
          {activeTab === "system" && <SystemTab />}
          {activeTab === "users" && <UsersTab />}
        </div>
      </div>
    </div>
  );
}

// ─── System Tab ───────────────────────────────────────────────────────────────

function SystemTab() {
  const [config, setConfig] = useState<SystemConfigData | null>(null);
  const [systemName, setSystemName] = useState("");
  const [systemLogo, setSystemLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSystemConfig().then((res) => {
      if (res.success && res.data) {
        setConfig(res.data as SystemConfigData);
        setSystemName(res.data.systemName);
        setSystemLogo(res.data.systemLogo ?? null);
      }
      setLoading(false);
    });
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setSystemLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateSystemConfig({ systemName, systemLogo });
    setSaving(false);
    if (res.success) toast.success("تم حفظ إعدادات النظام بنجاح ✓");
    else toast.error(res.error || "فشل في الحفظ");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* System Name Card */}
      <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Edit3 className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="font-black text-white text-sm">اسم النظام</h3>
            <p className="text-[11px] text-white/40">يظهر في صفحة اللوجين والنظام كله</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">الاسم بالعربي</label>
          <input
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            placeholder="نظام محاسبة فاست"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all font-bold text-sm"
          />
        </div>

        {/* Preview */}
        <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">معاينة — صفحة اللوجين</p>
          <div className="flex flex-col items-center gap-2">
            {systemLogo ? (
              <img src={systemLogo} alt="logo" className="w-12 h-12 rounded-xl object-contain" />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
            )}
            <p className="text-white font-extrabold text-lg">{systemName || "نظام محاسبة فاست"}</p>
            <p className="text-white/40 text-xs">Fast Accounting System</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>

      {/* Logo Card */}
      <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-black text-white text-sm">لوجو النظام</h3>
            <p className="text-[11px] text-white/40">يظهر في اللوجين والـ Navbar — مختلف عن لوجو الشركة</p>
          </div>
        </div>

        {/* Upload Area */}
        <div
          onClick={() => fileRef.current?.click()}
          className={cn(
            "relative h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group",
            systemLogo
              ? "border-violet-500/30 bg-violet-500/5"
              : "border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5"
          )}
        >
          {systemLogo ? (
            <>
              <img src={systemLogo} alt="System Logo" className="max-h-32 max-w-full object-contain rounded-xl" />
              <p className="text-[11px] text-violet-400 font-bold">اضغط لتغيير اللوجو</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-white/20 group-hover:text-violet-400 transition-colors" />
              <div className="text-center">
                <p className="text-sm font-bold text-white/50 group-hover:text-white/70 transition-colors">ارفع لوجو النظام</p>
                <p className="text-[11px] text-white/20 mt-1">PNG، JPG، SVG — حد أقصى 2MB</p>
              </div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white/70 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Upload className="w-3.5 h-3.5" /> رفع صورة
          </button>
          {systemLogo && (
            <button
              onClick={() => setSystemLogo(null)}
              className="h-10 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold text-xs flex items-center gap-2 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> حذف
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState<{ id: number; email: string } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await getDeveloperUsers();
    if (res.success) setUsers(res.data as UserData[] ?? []);
    else toast.error(res.error || "فشل في تحميل المستخدمين");
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`هل تريد حذف المستخدم "${username}"؟`)) return;
    setDeleting(id);
    const res = await deleteDeveloperUser(id);
    setDeleting(null);
    if (res.success) { toast.success("تم حذف المستخدم"); loadUsers(); }
    else toast.error(res.error || "فشل في الحذف");
  };

  const handleSaveEmail = async () => {
    if (!editingEmail) return;
    const res = await updateUserEmail(editingEmail.id, editingEmail.email);
    if (res.success) { toast.success("تم تحديث البريد الإلكتروني"); setEditingEmail(null); loadUsers(); }
    else toast.error(res.error || "فشل في التحديث");
  };

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: "مدير", WORKER: "موظف", DEVELOPER: "مطور"
  };

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    WORKER: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    DEVELOPER: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">مستخدمو النظام</h2>
          <p className="text-sm text-white/40">{users.length} مستخدم مسجل</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadUsers}
            className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white/50 hover:text-white flex items-center justify-center transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-black text-sm flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-4 h-4" /> مستخدم جديد
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <AddUserForm
          onSuccess={() => { setShowAddForm(false); loadUsers(); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Users Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-bold">لا يوجد مستخدمون</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                {["المستخدم", "البريد الإلكتروني", "الدور", "الأجهزة", "تاريخ الإنشاء", ""].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-right text-[10px] font-black text-white/30 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map((user) => (
                <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center text-violet-400 font-black text-xs">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-white">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {editingEmail?.id === user.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editingEmail.email}
                          onChange={(e) => setEditingEmail({ id: user.id, email: e.target.value })}
                          className="bg-white/5 border border-violet-500/30 rounded-lg px-2 py-1 text-white text-xs w-48 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                        />
                        <button onClick={handleSaveEmail} className="p-1 text-emerald-400 hover:text-emerald-300"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingEmail(null)} className="p-1 text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 font-mono text-xs">{user.email || "—"}</span>
                        <button
                          onClick={() => setEditingEmail({ id: user.id, email: user.email || "" })}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/30 hover:text-violet-400 transition-all"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full border", ROLE_COLORS[user.role] || "text-white/50 bg-white/5 border-white/10")}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-white/40 text-xs">
                      <Monitor className="w-3 h-3" /> {user.maxDevices}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-white/30 text-xs font-mono">
                    {new Date(user.createdAt).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      disabled={deleting === user.id || user.email === DEVELOPER_EMAIL}
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      {deleting === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Add User Form ────────────────────────────────────────────────────────────

function AddUserForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [maxDevices, setMaxDevices] = useState(2);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { toast.error("اسم المستخدم وكلمة المرور مطلوبان"); return; }
    setSaving(true);
    const res = await createDeveloperUser({ username, password, email: email || undefined, role, maxDevices });
    setSaving(false);
    if (res.success) { toast.success("تم إنشاء المستخدم بنجاح ✓"); onSuccess(); }
    else toast.error(res.error || "فشل في إنشاء المستخدم");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gradient-to-br from-violet-500/5 to-blue-500/5 border border-violet-500/20 rounded-3xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-white flex items-center gap-2"><Plus className="w-4 h-4 text-violet-400" /> إضافة مستخدم جديد</h3>
        <button type="button" onClick={onCancel} className="text-white/30 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="اسم المستخدم" icon={<User className="w-3.5 h-3.5" />}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" required className={inputCls} />
        </Field>

        <Field label="كلمة المرور" icon={<Lock className="w-3.5 h-3.5" />}>
          <div className="relative">
            <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPass ? "text" : "password"} placeholder="••••••••" required className={cn(inputCls, "pl-10")} />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </Field>

        <Field label="البريد الإلكتروني (اختياري)" icon={<Mail className="w-3.5 h-3.5" />}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="user@example.com" className={inputCls} />
        </Field>

        <Field label="الدور الوظيفي" icon={<Shield className="w-3.5 h-3.5" />}>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={cn(inputCls, "cursor-pointer")}>
            <option value="ADMIN">مدير (ADMIN)</option>
            <option value="WORKER">موظف (WORKER)</option>
          </select>
        </Field>

        <Field label="عدد الأجهزة المسموح بها" icon={<Monitor className="w-3.5 h-3.5" />}>
          <input type="number" min={1} max={10} value={maxDevices} onChange={(e) => setMaxDevices(parseInt(e.target.value) || 1)} className={inputCls} />
        </Field>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? "جاري الإنشاء..." : "إنشاء المستخدم"}
        </button>
        <button type="button" onClick={onCancel} className="h-11 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white/60 font-bold text-sm transition-all">
          إلغاء
        </button>
      </div>
    </form>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = "w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all text-sm";

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-white/40 uppercase tracking-widest">
        <span className="text-violet-400">{icon}</span> {label}
      </label>
      {children}
    </div>
  );
}
