"use client";

import { DollarSign, Users, Truck, FileText } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import {
  KPICard,
  RevenueChart,
  ExpensesChart,
  RegionChart,
  RecentInvoices,
} from "@/components/dashboard";
import {
  salesInvoices,
  customers,
  suppliers,
  monthlyRevenueData,
  expensesByCategory,
  revenueByRegion,
} from "@/mock-data";

export default function DashboardPage() {
  const totalSales = salesInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalCustomers = customers.length;
  const totalSuppliers = suppliers.length;
  const totalInvoices = salesInvoices.length;

  return (
    <>
      <Navbar title="لوحة التحكم" />
      <div className="flex-1 space-y-6 p-6">
        {/* Welcome Section */}
        <div className="rounded-xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 shadow-sm">
          <h1 className="text-3xl font-bold bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
            مرحباً بك في لوحة التحكم
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            نظرة شاملة على أداء أعمالك وإحصائياتك
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="إجمالي المبيعات"
            value={`${totalSales.toLocaleString("ar-SA")} ج.م`}
            change={12.5}
            changeType="increase"
            icon={DollarSign}
          />
          <KPICard
            title="العملاء"
            value={totalCustomers.toLocaleString("ar-SA")}
            change={8.2}
            changeType="increase"
            icon={Users}
          />
          <KPICard
            title="الموردين"
            value={totalSuppliers.toLocaleString("ar-SA")}
            change={3.1}
            changeType="decrease"
            icon={Truck}
          />
          <KPICard
            title="الفواتير"
            value={totalInvoices.toLocaleString("ar-SA")}
            change={15.3}
            changeType="increase"
            icon={FileText}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-3">
          <RevenueChart data={monthlyRevenueData} />
          <ExpensesChart data={expensesByCategory} />
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RegionChart data={revenueByRegion} />
          <RecentInvoices invoices={salesInvoices} />
        </div>
      </div>
    </>
  );
}
