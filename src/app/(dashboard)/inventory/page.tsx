// app/(dashboard)/inventory/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Tags,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  Activity,
  Warehouse,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { getStockOverview } from "./stock/actions";

interface Summary {
  totalProducts: number;
  lowStockCount: number;
  totalValue: number;
  totalMovements: number;
}

export default function InventoryPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStockOverview()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      title: "إجمالي الأصناف",
      value: summary?.totalProducts ?? 0,
      suffix: "صنف",
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/inventory/products",
    },
    {
      title: "أصناف منخفضة المخزون",
      value: summary?.lowStockCount ?? 0,
      suffix: "صنف",
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/inventory/stock",
    },
    {
      title: "إجمالي قيمة المخزون",
      value: (summary?.totalValue ?? 0).toLocaleString("ar-EG"),
      suffix: "ج.م",
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/inventory/stock",
    },
    {
      title: "إجمالي الحركات",
      value: summary?.totalMovements ?? 0,
      suffix: "حركة",
      icon: Activity,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/inventory/movements",
    },
  ];

  const quickLinks = [
    { title: "الأصناف", desc: "إضافة وإدارة الأصناف", href: "/inventory/products", icon: Package },
    { title: "التصنيفات", desc: "تنظيم أصناف المخزون", href: "/inventory/categories", icon: Tags },
    { title: "المخزون الحالي", desc: "عرض الكميات والقيم", href: "/inventory/stock", icon: Warehouse },
    { title: "حركات المخزون", desc: "سجل كل الحركات", href: "/inventory/movements", icon: Activity },
    { title: "تسويات المخزون", desc: "تعديل الكميات يدوياً", href: "/inventory/adjustments", icon: TrendingUp },
  ];

  return (
    <>
      <Navbar title="المخزون" />
      <div className="flex-1 space-y-6 p-6" dir="rtl">
        <div className="flex flex-col gap-1 mb-2">
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
            لوحة تحكم المخزون
          </h2>
          <p className="text-muted-foreground font-medium">
            إدارة الأصناف وتتبع حركات المخزون
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="shadow-sm hover:shadow-md transition-all cursor-pointer border hover:border-primary/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">
                        {card.title}
                      </p>
                      {loading ? (
                        <div className="h-8 w-24 bg-muted animate-pulse rounded mt-1" />
                      ) : (
                        <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                          {card.value}{" "}
                          <span className="text-sm font-medium text-muted-foreground">
                            {card.suffix}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className={`p-3 rounded-xl ${card.bg}`}>
                      <card.icon className={`h-6 w-6 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-bold mb-4">الأقسام الرئيسية</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card className="shadow-sm hover:shadow-md transition-all cursor-pointer border hover:border-primary/30 group">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-all">
                      <link.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{link.title}</p>
                      <p className="text-sm text-muted-foreground">{link.desc}</p>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all rotate-180" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
