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
      <Navbar title="Dashboard" />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Sales"
            value={`$${totalSales.toLocaleString()}`}
            change={12.5}
            changeType="increase"
            icon={DollarSign}
          />
          <KPICard
            title="Customers"
            value={totalCustomers}
            change={8.2}
            changeType="increase"
            icon={Users}
          />
          <KPICard
            title="Suppliers"
            value={totalSuppliers}
            change={3.1}
            changeType="decrease"
            icon={Truck}
          />
          <KPICard
            title="Invoices"
            value={totalInvoices}
            change={15.3}
            changeType="increase"
            icon={FileText}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <RevenueChart data={monthlyRevenueData} />
          <ExpensesChart data={expensesByCategory} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <RegionChart data={revenueByRegion} />
          <RecentInvoices invoices={salesInvoices} />
        </div>
      </div>
    </>
  );
}
