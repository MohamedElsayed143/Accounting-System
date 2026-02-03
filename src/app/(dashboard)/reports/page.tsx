"use client";

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  LineChart,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock data for reports
const summaryData = {
  totalSpending: 300970,
  monthlyGrowth: 12.5,
  totalRevenue: 485000,
  netProfit: 184030,
  invoicesPaid: 42,
  invoicesPending: 18,
};

const monthlyTrends = [
  { month: "يناير", revenue: 45000, expenses: 32000, profit: 13000 },
  { month: "فبراير", revenue: 52000, expenses: 38000, profit: 14000 },
  { month: "مارس", revenue: 48000, expenses: 35000, profit: 13000 },
  { month: "أبريل", revenue: 61000, expenses: 42000, profit: 19000 },
  { month: "مايو", revenue: 55000, expenses: 40000, profit: 15000 },
  { month: "يونيو", revenue: 68000, expenses: 45000, profit: 23000 },
];

const topSuppliers = [
  { name: "Raw Materials Inc", total: 72000, invoices: 12 },
  { name: "Tech Components AG", total: 77350, invoices: 8 },
  { name: "Euro Logistics BV", total: 68970, invoices: 15 },
  { name: "Pacific Trading Co", total: 37950, invoices: 6 },
  { name: "Industrial Supplies Co", total: 31200, invoices: 9 },
];

const expenseCategories = [
  { category: "المواد الخام", amount: 132000, percentage: 44 },
  { category: "الخدمات اللوجستية", amount: 68970, percentage: 23 },
  { category: "المعدات التقنية", amount: 65000, percentage: 22 },
  { category: "اللوازم المكتبية", amount: 35000, percentage: 11 },
];

export default function ReportsPage() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
    }).format(amount);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">التقارير المالية</h1>
          <p className="text-muted-foreground">
            نظرة شاملة على الأداء المالي والإحصائيات
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="this-year">
            <SelectTrigger className="w-[180px]">
              <Calendar className="ml-2 h-4 w-4" />
              <SelectValue placeholder="الفترة الزمنية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">هذا الشهر</SelectItem>
              <SelectItem value="last-month">الشهر الماضي</SelectItem>
              <SelectItem value="this-quarter">هذا الربع</SelectItem>
              <SelectItem value="this-year">هذه السنة</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الإنفاق
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summaryData.totalSpending)}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-emerald-500">+{summaryData.monthlyGrowth}%</span>
              <span className="text-muted-foreground">من الشهر الماضي</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الإيرادات
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summaryData.totalRevenue)}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-emerald-500">+8.2%</span>
              <span className="text-muted-foreground">من الشهر الماضي</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              صافي الربح
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(summaryData.netProfit)}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              <span className="text-emerald-500">+15.3%</span>
              <span className="text-muted-foreground">معدل النمو</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              الفواتير
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.invoicesPaid + summaryData.invoicesPending}</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-emerald-100 text-emerald-700">
                {summaryData.invoicesPaid} مدفوعة
              </Badge>
              <Badge className="bg-amber-100 text-amber-700">
                {summaryData.invoicesPending} معلقة
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue vs Expenses Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              الإيرادات مقابل المصروفات
            </CardTitle>
            <CardDescription>
              مقارنة شهرية بين الإيرادات والمصروفات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  مخطط بياني للإيرادات والمصروفات
                </p>
                <p className="text-xs text-muted-foreground/70">
                  سيتم عرض البيانات هنا عند الربط بالخادم
                </p>
              </div>
            </div>
            {/* Quick Stats */}
            <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">متوسط الإيرادات</p>
                <p className="text-lg font-semibold">{formatCurrency(54833)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">متوسط المصروفات</p>
                <p className="text-lg font-semibold">{formatCurrency(38667)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">هامش الربح</p>
                <p className="text-lg font-semibold text-emerald-600">29.5%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Distribution Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              توزيع المصروفات
            </CardTitle>
            <CardDescription>
              تحليل المصروفات حسب الفئة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30">
              <div className="text-center">
                <PieChart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  مخطط دائري للمصروفات
                </p>
              </div>
            </div>
            {/* Category Breakdown */}
            <div className="mt-4 space-y-3">
              {expenseCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: [
                          "#10b981",
                          "#3b82f6",
                          "#f59e0b",
                          "#8b5cf6",
                        ][index],
                      }}
                    />
                    <span className="text-sm">{category.category}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {formatCurrency(category.amount)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {category.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            اتجاه الأرباح الشهرية
          </CardTitle>
          <CardDescription>
            تتبع صافي الربح على مدار الأشهر الستة الماضية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[250px] items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30">
            <div className="text-center">
              <LineChart className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                مخطط خطي لاتجاه الأرباح
              </p>
              <p className="text-xs text-muted-foreground/70">
                سيتم عرض البيانات التفاعلية هنا
              </p>
            </div>
          </div>
          {/* Monthly Data Table */}
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الشهر</TableHead>
                  <TableHead className="text-right">الإيرادات</TableHead>
                  <TableHead className="text-right">المصروفات</TableHead>
                  <TableHead className="text-right">صافي الربح</TableHead>
                  <TableHead className="text-right">التغيير</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyTrends.map((month, index) => {
                  const prevProfit = index > 0 ? monthlyTrends[index - 1].profit : month.profit;
                  const change = ((month.profit - prevProfit) / prevProfit) * 100;
                  const isPositive = change >= 0;

                  return (
                    <TableRow key={month.month}>
                      <TableCell className="font-medium">{month.month}</TableCell>
                      <TableCell>{formatCurrency(month.revenue)}</TableCell>
                      <TableCell>{formatCurrency(month.expenses)}</TableCell>
                      <TableCell className="font-semibold text-emerald-600">
                        {formatCurrency(month.profit)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isPositive ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                          <span
                            className={
                              isPositive ? "text-emerald-500" : "text-red-500"
                            }
                          >
                            {index === 0 ? "-" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top Suppliers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            أكبر الموردين
          </CardTitle>
          <CardDescription>
            الموردين الأكثر تعاملاً من حيث قيمة المشتريات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المورد</TableHead>
                <TableHead className="text-right">إجمالي المشتريات</TableHead>
                <TableHead className="text-right">عدد الفواتير</TableHead>
                <TableHead className="text-right">الحصة السوقية</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSuppliers.map((supplier, index) => {
                const totalAllSuppliers = topSuppliers.reduce(
                  (sum, s) => sum + s.total,
                  0
                );
                const marketShare = ((supplier.total / totalAllSuppliers) * 100).toFixed(1);

                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{formatCurrency(supplier.total)}</TableCell>
                    <TableCell>{supplier.invoices} فاتورة</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${marketShare}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {marketShare}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
