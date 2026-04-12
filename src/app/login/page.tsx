"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "./actions";
import { generateDeviceId } from "@/lib/device";
import { Loader2, Zap, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getPublicSystemConfig } from "@/app/actions/system-config";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [systemName, setSystemName] = useState("نظام محاسبة فاست");
  const [systemLogo, setSystemLogo] = useState<string | null>(null);

  useEffect(() => {
    getPublicSystemConfig().then((cfg) => {
      setSystemName(cfg.systemName);
      setSystemLogo(cfg.systemLogo);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const deviceId = await generateDeviceId();
    const res = await loginAction(formData, deviceId);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      toast.success("تم تسجيل الدخول بنجاح");
      localStorage.removeItem("isManagementActive");
      // Developer gets redirected to their portal
      const redirectPath = res.isDeveloper
        ? "/developer"
        : res.role === "WORKER"
        ? "/sales-invoices"
        : "/statistics";
      router.push(redirectPath);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 dark:bg-slate-900" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">

        {/* System Logo */}
        <div className="flex justify-center">
          {systemLogo ? (
            <img
              src={systemLogo}
              alt={systemName}
              className="w-16 h-16 object-contain rounded-2xl shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="w-8 h-8 text-white" />
            </div>
          )}
        </div>

        {/* System Name */}
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
          {systemName}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Fast Accounting System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-xl shadow-slate-200/50 dark:bg-slate-800 dark:shadow-none sm:rounded-3xl sm:px-10 border border-slate-100 dark:border-slate-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                اسم المستخدم
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white sm:text-sm"
                  placeholder="أدخل اسم المستخدم"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full pr-4 pl-12 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white sm:text-sm"
                  placeholder="أدخل كلمة المرور"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-4 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "تسجيل الدخول"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
