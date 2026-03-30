"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Truck,
  Landmark,
  ShoppingBag,
  ShoppingCart,
  AlertTriangle,
  BarChart3,  
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  Package,
  RefreshCw,
  Calendar,
} from "lucide-react";
import {
  getStatisticsSummary,
  getMonthlyTrend,
  getTopCustomers,
  getTopSuppliers,
  getSalesByPaymentMethod,
  getInventoryAlerts,
  getRecentActivity,
  getReturnsSummary,
  getBestSellingProducts,
} from "./actions";
import { getCompanySettingsAction } from "../settings/actions";
import { Navbar } from "@/components/layout/navbar";
import { getAuthSession } from "@/app/login/actions";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Summary = Awaited<ReturnType<typeof getStatisticsSummary>>;
type MonthlyData = Awaited<ReturnType<typeof getMonthlyTrend>>;
type TopEntity = { id: number; name: string; total: number; count: number };
type PaymentSlice = { label: string; value: number; count: number; color: string };
type InventoryAlert = {
  id: number; code: string; name: string;
  currentStock: number; minStock: number; unit: string | null;
  category: { name: string } | null;
};
type Activity = Awaited<ReturnType<typeof getRecentActivity>>[number];
type ReturnsSummary = Awaited<ReturnType<typeof getReturnsSummary>>;
type BestProduct = Awaited<ReturnType<typeof getBestSellingProducts>>[number];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("ar-EG", { maximumFractionDigits: 0 });

function KPICard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
  color,
  bg,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
              trend === "up"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20"
                : trend === "down"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-900/20"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend === "down" ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            {trendLabel}
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
        {title}
      </p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Mini Bar Chart (pure CSS)
// ─────────────────────────────────────────────
function MiniBarChart({ data, companySettings }: { data: MonthlyData; companySettings: any }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.revenue, d.purchases]), 1);
  return (
    <div className="flex items-end gap-1 h-40 px-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
          <div className="w-full flex items-end gap-0.5 h-32 relative">
            {/* Revenue bar */}
            <div
              className="flex-1 rounded-t bg-emerald-400 dark:bg-emerald-500 transition-all duration-500 hover:opacity-80 relative"
              style={{ height: `${(d.revenue / maxVal) * 100}%` }}
              title={`مبيعات: ${fmt(d.revenue)} ${companySettings?.currencyCode || "ج.م"}`}
            />
            {/* Purchases bar */}
            <div
              className="flex-1 rounded-t bg-rose-400 dark:bg-rose-500 transition-all duration-500 hover:opacity-80"
              style={{ height: `${(d.purchases / maxVal) * 100}%` }}
              title={`مشتريات: ${fmt(d.purchases)} ${companySettings?.currencyCode || "ج.م"}`}
            />
          </div>
          <span className="text-[9px] text-slate-400 text-center leading-tight">
            {d.month.slice(0, 3)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Donut Chart (SVG)
// ─────────────────────────────────────────────
function DonutChart({ slices, companySettings }: { slices: PaymentSlice[]; companySettings: any }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        لا توجد بيانات
      </div>
    );
  }
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = 45;
  const innerR = 28;

  let cumAngle = -Math.PI / 2;
  const paths: { d: string; color: string; label: string; pct: number }[] = [];

  slices.forEach((s) => {
    if (s.value <= 0) return;
    const pct = s.value / total;
    const angle = pct * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    const x2 = cx + r * Math.cos(cumAngle + angle);
    const y2 = cy + r * Math.sin(cumAngle + angle);
    const xi1 = cx + innerR * Math.cos(cumAngle);
    const yi1 = cy + innerR * Math.sin(cumAngle);
    const xi2 = cx + innerR * Math.cos(cumAngle + angle);
    const yi2 = cy + innerR * Math.sin(cumAngle + angle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${xi1} ${yi1} Z`;
    paths.push({ d, color: s.color, label: s.label, pct: Math.round(pct * 100) });
    cumAngle += angle;
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="shrink-0">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} opacity={0.85} />
        ))}
        <circle cx={cx} cy={cy} r={innerR - 2} fill="white" className="dark:fill-slate-900" />
      </svg>
      <div className="space-y-2 flex-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: s.color }}
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">{s.label}</span>
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {fmt(s.value)} <span className="font-normal text-slate-400">{companySettings?.currencyCode || "ج.م"}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Loading skeleton (Premium)
// ─────────────────────────────────────────────
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div 
    className={cn(
      "animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 bg-[length:200%_100%] rounded-xl",
      className
    )} 
  />
);

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function StatisticsPage() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData>([]);
  const [topCustomers, setTopCustomers] = useState<TopEntity[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopEntity[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentSlice[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [returnsSummary, setReturnsSummary] = useState<ReturnsSummary | null>(null);
  const [bestSelling, setBestSelling] = useState<BestProduct[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    getCompanySettingsAction().then(setCompanySettings);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const session = await getAuthSession();
      if (!session || session.user.role !== "ADMIN") {
        window.location.href = "/sales-invoices";
        return;
      }

      const from = fromDate ? new Date(fromDate) : undefined;
      const to = toDate ? new Date(toDate) : undefined;

      const [s, m, tc, ts, pm, ia, act, ret, bs] = await Promise.all([
        getStatisticsSummary(from, to),
        getMonthlyTrend(selectedYear),
        getTopCustomers(5, from, to),
        getTopSuppliers(5, from, to),
        getSalesByPaymentMethod(from, to),
        getInventoryAlerts(),
        getRecentActivity(10),
        getReturnsSummary(from, to),
        getBestSellingProducts(10, from, to),
      ]);

      setSummary(s);
      setMonthly(m);
      setTopCustomers(tc);
      setTopSuppliers(ts);
      setPaymentMethods(pm);
      setInventoryAlerts(ia as InventoryAlert[]);
      setActivity(act);
      setReturnsSummary(ret);
      setBestSelling(bs);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedYear]);

  useEffect(() => {
    load();
  }, [load]);

  const statusLabel = (s: string) => {
    if (s === "cash") return { text: "نقدي", cls: "bg-emerald-100 text-emerald-700" };
    if (s === "credit") return { text: "آجل", cls: "bg-blue-100 text-blue-700" };
    return { text: "معلقة", cls: "bg-amber-100 text-amber-700" };
  };

  return (
    <>
      <Navbar title="الإحصائيات" />
      <div className="flex-1 p-4 md:p-6 space-y-6 bg-slate-50/40 dark:bg-transparent min-h-screen" dir="rtl">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-primary" />
              الإحصائيات والتقارير
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              تحليل شامل لأداء الأعمال والمؤشرات المالية
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" /> من تاريخ
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                إلى تاريخ
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                سنة المخطط
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={load}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
            >
              تطبيق
            </button>
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(""); setToDate(""); }}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                مسح الفلتر
              </button>
            )}
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                <Skeleton className="w-10 h-10 rounded-xl mb-3" />
                <Skeleton className="w-24 h-3 mb-2" />
                <Skeleton className="w-32 h-7" />
              </div>
            ))
          ) : summary ? (
            <>
              <KPICard
                title="إجمالي المبيعات"
                value={`${fmt(summary.totalRevenue)} ${companySettings?.currencyCode || "ج.م"}`}
                sub={`${summary.salesCount} فاتورة`}
                icon={ShoppingBag}
                trend="up"
                trendLabel="مبيعات"
                color="text-emerald-600"
                bg="bg-emerald-100"
              />
              <KPICard
                title="إجمالي المشتريات"
                value={`${fmt(summary.totalPurchases)} ${companySettings?.currencyCode || "ج.م"}`}
                sub={`${summary.purchasesCount} فاتورة`}
                icon={ShoppingCart}
                trend="down"
                trendLabel="مشتريات"
                color="text-rose-600"
                bg="bg-rose-100"
              />
              <KPICard
                title="صافي الربح"
                value={`${fmt(summary.netProfit)} ${companySettings?.currencyCode || "ج.م"}`}
                icon={TrendingUp}
                trend={summary.netProfit >= 0 ? "up" : "down"}
                trendLabel={summary.netProfit >= 0 ? "ربح" : "خسارة"}
                color={summary.netProfit >= 0 ? "text-blue-600" : "text-rose-600"}
                bg={summary.netProfit >= 0 ? "bg-blue-100" : "bg-rose-100"}
              />
              <KPICard
                title="العملاء"
                value={summary.customerCount.toLocaleString("ar-EG")}
                icon={Users}
                color="text-violet-600"
                bg="bg-violet-100"
              />
              <KPICard
                title="الموردين"
                value={summary.supplierCount.toLocaleString("ar-EG")}
                icon={Truck}
                color="text-orange-600"
                bg="bg-orange-100"
              />
              <KPICard
                title="إجمالي السيولة"
                value={`${fmt(summary.treasuryBalance)} ${companySettings?.currencyCode || "ج.م"}`}
                sub={`خزائن: ${fmt(summary.totalSafeBalance || 0)} | بنوك: ${fmt(summary.totalBanksBalance || 0)}`}
                icon={Landmark}
                color="text-cyan-600"
                bg="bg-cyan-100"
              />
            </>
          ) : null}
        </div>

        {/* ── Returns Summary quick cards ── */}
        {!loading && returnsSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">مرتجعات مبيعات</p>
              <p className="text-xl font-bold text-rose-600">{fmt(returnsSummary.salesReturnsTotal)} {companySettings?.currencyCode || "ج.م"}</p>
              <p className="text-xs text-slate-400">{returnsSummary.salesReturnsCount} مرتجع</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">مرتجعات مشتريات</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(returnsSummary.purchaseReturnsTotal)} {companySettings?.currencyCode || "ج.م"}</p>
              <p className="text-xs text-slate-400">{returnsSummary.purchaseReturnsCount} مرتجع</p>
            </div>
            {summary && (
              <>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">فواتير معلقة</p>
                  <p className="text-xl font-bold text-amber-600">{fmt(summary.pendingTotal)} {companySettings?.currencyCode || "ج.م"}</p>
                  <p className="text-xs text-slate-400">{summary.pendingCount} فاتورة</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">تنبيهات المخزون</p>
                  <p className="text-xl font-bold text-rose-600">{inventoryAlerts.length}</p>
                  <p className="text-xs text-slate-400">منتج أقل من الحد الأدنى</p>
                </div>
              </>
            )}
          </div>
        )}

      

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Trend */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  الإيرادات مقابل المشتريات
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">شهرياً — {selectedYear}</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />
                  مبيعات
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-rose-400 inline-block" />
                  مشتريات
                </span>
              </div>
            </div>
            {loading ? (
              <Skeleton className="w-full h-40" />
            ) : (
              <MiniBarChart data={monthly} companySettings={companySettings} />
            )}
          </div>

          {/* Payment Method Donut */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-primary" />
              المبيعات حسب طريقة الدفع
            </h2>
            {loading ? (
              <Skeleton className="w-full h-32" />
            ) : (
              <DonutChart slices={paymentMethods} companySettings={companySettings} />
            )}
            {!loading && paymentMethods.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
                {paymentMethods.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{s.label}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{s.count} فاتورة</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Top Customers & Suppliers ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 dark:text-white">أفضل 5 عملاء</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="w-32 h-3" />
                      <Skeleton className="w-20 h-2" />
                    </div>
                    <Skeleton className="w-24 h-4" />
                  </div>
                ))
              ) : topCustomers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">لا توجد بيانات</div>
              ) : (
                topCustomers.map((c, i) => {
                  const maxT = topCustomers[0]?.total ?? 1;
                  return (
                    <div key={c.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.count} فاتورة</p>
                        </div>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                          {fmt(c.total)} <span className="text-xs font-normal">{companySettings?.currencyCode || "ج.م"}</span>
                        </p>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-emerald-400 rounded-full h-1.5 transition-all duration-700"
                          style={{ width: `${(c.total / maxT) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top Suppliers */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-rose-600" />
              <h2 className="font-bold text-slate-900 dark:text-white">أكثر 5 موردين مشتريات</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="w-32 h-3" />
                      <Skeleton className="w-20 h-2" />
                    </div>
                    <Skeleton className="w-24 h-4" />
                  </div>
                ))
              ) : topSuppliers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">لا توجد بيانات</div>
              ) : (
                topSuppliers.map((s, i) => {
                  const maxT = topSuppliers[0]?.total ?? 1;
                  return (
                    <div key={s.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center text-rose-700 font-bold text-sm shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.count} فاتورة</p>
                        </div>
                        <p className="text-sm font-bold text-rose-700 dark:text-rose-400 shrink-0">
                          {fmt(s.total)} <span className="text-xs font-normal">{companySettings?.currencyCode || "ج.م"}</span>
                        </p>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-rose-400 rounded-full h-1.5 transition-all duration-700"
                          style={{ width: `${(s.total / maxT) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Inventory Alerts + Recent Activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Alerts */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">
                تنبيهات المخزون
              </h2>
              {inventoryAlerts.length > 0 && (
                <span className="mr-auto bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {inventoryAlerts.length}
                </span>
              )}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="w-28 h-3" />
                      <Skeleton className="w-20 h-2" />
                    </div>
                    <Skeleton className="w-16 h-5 rounded-full" />
                  </div>
                ))
              ) : inventoryAlerts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  ✅ جميع المنتجات فوق الحد الأدنى
                </div>
              ) : (
                inventoryAlerts.map((p) => (
                  <div key={p.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.category?.name ?? "—"} · كود: {p.code}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        p.currentStock <= 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {p.currentStock} {p.unit ?? ""}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-slate-900 dark:text-white">آخر الحركات</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="w-32 h-3" />
                      <Skeleton className="w-24 h-2" />
                    </div>
                    <Skeleton className="w-20 h-4" />
                  </div>
                ))
              ) : activity.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">لا توجد حركات</div>
              ) : (
                activity.map((a) => {
                  const isSale = a.type === "sale";
                  const sl = statusLabel(a.status);
                  return (
                    <div key={a.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isSale ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-rose-100 dark:bg-rose-900/20"
                      }`}>
                        {isSale ? (
                          <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {a.party}
                        </p>
                        <p className="text-xs text-slate-500">
                          #{a.number} · {new Date(a.date).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      <div className="text-left shrink-0 space-y-1">
                        <p className={`text-sm font-bold ${isSale ? "text-emerald-700" : "text-rose-700"}`}>
                          {fmt(a.total)} <span className="text-xs font-normal">{companySettings?.currencyCode || "ج.م"}</span>
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sl.cls}`}>
                          {sl.text}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        {/* ── Best-Selling Products ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-violet-600" />
              <h2 className="font-bold text-slate-900 dark:text-white">الأصناف الأكثر مبيعاً</h2>
            </div>
            <span className="text-xs text-slate-400">أعلى 10 أصناف حسب الكمية</span>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="w-40 h-3" />
                      <Skeleton className="w-full h-2 rounded-full" />
                    </div>
                    <Skeleton className="w-20 h-4" />
                    <Skeleton className="w-24 h-4" />
                  </div>
                ))}
              </div>
            ) : bestSelling.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">لا توجد بيانات مبيعات مرتبطة بأصناف</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-right">
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">#</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">الصنف</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">الكمية المباعة</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">عدد الأوامر</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">إجمالي الإيراد</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">الحجم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bestSelling.map((p, i) => {
                    const maxQty = bestSelling[0]?.totalQty ?? 1;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? 'bg-amber-100 text-amber-700' :
                            i === 1 ? 'bg-slate-200 text-slate-600' :
                            i === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {i + 1}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">{p.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{p.code}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <span className="font-bold text-violet-700 dark:text-violet-400">
                              {p.totalQty.toLocaleString("ar-EG")} {p.unit ?? ''}
                            </span>
                            <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                              <div
                                className="bg-violet-400 h-1.5 rounded-full transition-all duration-700"
                                style={{ width: `${(p.totalQty / maxQty) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {p.orderCount} طلب
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-400">
                          {fmt(p.totalRevenue)} ج.م
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs px-2 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-lg font-medium">
                            {Math.round((p.totalQty / bestSelling.reduce((s, x) => s + x.totalQty, 0)) * 100)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
