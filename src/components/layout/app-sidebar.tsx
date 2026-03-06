"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuthSession, logoutAction } from "@/app/login/actions";
import {
  LayoutDashboard,
  Users,
  Truck,
  FileText,
  ShoppingCart,
  BarChart3,
  Settings,
  Calculator,
  ChevronDown,
  Landmark,
  RotateCcw,
  Package,
  ClipboardList,
  Clock,
  PieChart,
  LogOut,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePermissions } from "@/hooks/use-permissions";
import { useCompany } from "@/hooks/use-company";

const mainNavItems = [
  {
    title: "الرئيسية",
    href: "/statistics",
    icon: PieChart,
  },
];

const directoryNavItems = [
  {
    title: "العملاء",
    href: "/customers",
    icon: Users,
  },
  {
    title: "الموردين",
    href: "/suppliers",
    icon: Truck,
  },
];

const invoiceNavItems = [
  {
    title: "فواتير المبيعات",
    href: "/sales-invoices",
    icon: FileText,
    subItems: [
      { title: "جميع الفواتير", href: "/sales-invoices" },
      { title: "إنشاء فاتورة جديدة", href: "/sales-invoices/create" },
    ],
  },
  {
    title: "فواتير المشتريات",
    href: "/purchase-invoices",
    icon: ShoppingCart,
    subItems: [
      { title: "جميع الفواتير", href: "/purchase-invoices" },
      { title: "إنشاء فاتورة جديدة", href: "/purchase-invoices/create" },
    ],
  },
  {
    title: "عروض الأسعار",
    href: "/sales-quotations",
    icon: ClipboardList,
    subItems: [
      { title: "جميع العروض", href: "/sales-quotations" },
      { title: "إنشاء عرض سعر", href: "/sales-quotations/create" },
    ],
  },
  {
    title: "الفواتير المعلقة",
    href: "/pending-invoices",
    icon: Clock,
  },
];

// ✅ قسم المرتجعات الجديد
const returnsNavItems = [
  {
    title: "مرتجعات المبيعات",
    href: "/sales-returns",
    icon: RotateCcw,
    subItems: [
      { title: "جميع المرتجعات", href: "/sales-returns" },
      { title: "إنشاء مرتجع جديد", href: "/sales-returns/new" },
    ],
  },
  {
    title: "مرتجعات المشتريات",
    href: "/purchase-returns",
    icon: RotateCcw,
    subItems: [
      { title: "جميع المرتجعات", href: "/purchase-returns" },
      { title: "إنشاء مرتجع جديد", href: "/purchase-returns/new" },
    ],
  },
];

const treasuryNavItem = {
  title: "إدارة النقدية",
  href: "/treasury",
  icon: Landmark,
  subItems: [
    { title: "الخزنة والبنوك", href: "/treasury" },
    { title: "سند قبض", href: "/treasury/receipt-voucher" },
    { title: "سند صرف", href: "/treasury/payment-voucher" },
  ],
};

const inventoryNavItem = {
  title: "المخزون",
  href: "/inventory",
  icon: Package,
  subItems: [
    { title: "لوحة المخزون", href: "/inventory" },
    { title: "الأصناف", href: "/inventory/products" },
    { title: "التصنيفات", href: "/inventory/categories" },
    { title: "المخزون الحالي", href: "/inventory/stock" },
    { title: "حركات المخزون", href: "/inventory/movements" },
    { title: "تسويات المخزون", href: "/inventory/adjustments" },
  ],
};

const otherNavItems = [
  {
    title: "التقارير",
    href: "/reports",
    icon: BarChart3,
    subItems: [
      { title: "تقارير العملاء/الموردين", href: "/reports" },
      { title: "كشف حساب الخزنة", href: "/reports/treasury" },
      { title: "كشف حساب البنوك", href: "/reports/banks" },
    ],
  },
  {
    title: "إعدادات النظام",
    href: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const { hasPermission, isAdmin } = usePermissions();
  const { company } = useCompany();

  useEffect(() => {
    getAuthSession().then((session) => {
      if (session?.user) {
        setUser(session.user);
      }
    });
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/statistics") return pathname === href || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <Sidebar className="border-l border-border/40 shadow-sm print:hidden">
      <SidebarHeader className="border-b border-border/40 px-4 py-4 bg-gradient-to-b from-primary/5 to-transparent">
        <Link 
          href={user?.role === "WORKER" ? "/sales-invoices" : "/statistics"} 
          className="flex items-center gap-3 group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md group-hover:shadow-lg transition-all">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-blue-600 dark:text-blue-500">
              فاست
            </span>
            <span className="text-[10px] text-slate-500 font-bold tracking-tight truncate max-w-[120px]" title={company?.name}>
              {company?.name || "Fast System"}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {user?.role === "ADMIN" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              نظرة عامة
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems
                  .filter(item => user?.role === "ADMIN" || item.href !== "/statistics")
                  .map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.href)}
                      className="group hover:bg-primary/10 transition-all"
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(hasPermission("customers_view") || hasPermission("suppliers_view") || user?.role === "ADMIN") && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              الدليل
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {directoryNavItems
                  .filter(item => {
                    if (user?.role === "ADMIN") return true;
                    if (item.href === "/suppliers") return hasPermission("suppliers_view");
                    if (item.href === "/customers") return hasPermission("customers_view");
                    return true;
                  })
                  .map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive(item.href)}
                        className="group hover:bg-primary/10 transition-all"
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(hasPermission("sales_view") || hasPermission("sales_create") || hasPermission("purchase_view") || hasPermission("purchase_create") || hasPermission("sales_quotations_view") || hasPermission("sales_pending_view") || user?.role === "ADMIN") && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              الفواتير
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {invoiceNavItems
                  .filter(item => {
                    if (user?.role === "ADMIN") return true;
                    if (item.href === "/sales-invoices") return hasPermission("sales_view") || hasPermission("sales_create");
                    if (item.href === "/purchase-invoices") return hasPermission("purchase_view") || hasPermission("purchase_create");
                    if (item.href === "/sales-quotations") return hasPermission("sales_quotations_view");
                    if (item.href === "/pending-invoices") return hasPermission("sales_pending_view");
                    return true; 
                  })
                  .map((item) => (
                  item.subItems ? (
                    <Collapsible
                      key={item.href}
                      defaultOpen={isActive(item.href)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton 
                            isActive={isActive(item.href)}
                            className="group hover:bg-primary/10 transition-all"
                          >
                            <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">{item.title}</span>
                            <ChevronDown className="mr-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="mr-4 border-r-2 border-primary/20">
                            {item.subItems
                              .filter(sub => {
                                if (user?.role === "ADMIN") return true;
                                if (item.href === "/sales-invoices") {
                                  if (sub.href === "/sales-invoices") return hasPermission("sales_view");
                                  if (sub.href === "/sales-invoices/create") return hasPermission("sales_create");
                                }
                                if (item.href === "/purchase-invoices") {
                                  if (sub.href === "/purchase-invoices") return hasPermission("purchase_view");
                                  if (sub.href === "/purchase-invoices/create") return hasPermission("purchase_create");
                                }
                                if (item.href === "/sales-quotations") {
                                  // quotations use sales_quotations_view for everything right now unless requested otherwise
                                  return true; 
                                }
                                return true;
                              })
                              .map((subItem) => (
                              <SidebarMenuSubItem key={subItem.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === subItem.href}
                                  className="hover:bg-primary/5 transition-all"
                                >
                                  <Link href={subItem.href} className="text-sm font-medium">
                                    {subItem.title}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive(item.href)}
                        className="group hover:bg-primary/10 transition-all"
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ✅ قسم المرتجعات */}
        {(hasPermission("returns_sales") || hasPermission("returns_purchase") || user?.role === "ADMIN") && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              المرتجعات
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {returnsNavItems
                  .filter(item => {
                    if (user?.role === "ADMIN") return true;
                    if (item.href === "/sales-returns") return hasPermission("returns_sales");
                    if (item.href === "/purchase-returns") return hasPermission("returns_purchase");
                    return true;
                  })
                  .map((item) => (
                  <Collapsible
                    key={item.href}
                    defaultOpen={isActive(item.href)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          isActive={isActive(item.href)}
                          className="group hover:bg-primary/10 transition-all"
                        >
                          <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          <span className="font-medium">{item.title}</span>
                          <ChevronDown className="mr-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="mr-4 border-r-2 border-primary/20">
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.href}
                                className="hover:bg-primary/5 transition-all"
                              >
                                <Link href={subItem.href} className="text-sm font-medium">
                                  {subItem.title}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ✅ قسم المخزون */}
        {hasPermission("inventory_view") && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              المخزون
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible
                  defaultOpen={isActive(inventoryNavItem.href)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isActive(inventoryNavItem.href)}
                        className="group hover:bg-primary/10 transition-all"
                      >
                        <inventoryNavItem.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{inventoryNavItem.title}</span>
                        <ChevronDown className="mr-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="mr-4 border-r-2 border-primary/20">
                        {inventoryNavItem.subItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.href}
                              className="hover:bg-primary/5 transition-all"
                            >
                              <Link href={subItem.href} className="text-sm font-medium">
                                {subItem.title}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(hasPermission("treasury_view") || hasPermission("treasury_manage") || user?.role === "ADMIN") && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              النقدية
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible
                  defaultOpen={isActive(treasuryNavItem.href)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isActive(treasuryNavItem.href)}
                        className="group hover:bg-primary/10 transition-all"
                      >
                        <treasuryNavItem.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{treasuryNavItem.title}</span>
                        <ChevronDown className="mr-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="mr-4 border-r-2 border-primary/20">
                        {treasuryNavItem.subItems
                          .filter(sub => {
                            if (user?.role === "ADMIN") return true;
                            if (sub.href === "/treasury/receipt-voucher" || sub.href === "/treasury/payment-voucher") {
                              return hasPermission("treasury_vouchers");
                            }
                            return true;
                          })
                          .map((subItem) => (
                          <SidebarMenuSubItem key={subItem.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.href}
                              className="hover:bg-primary/5 transition-all"
                            >
                              <Link href={subItem.href} className="text-sm font-medium">
                                {subItem.title}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            الإدارة
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherNavItems
                .filter(item => {
                  // Hide settings for worker
                  if (item.href === "/settings" && user?.role !== "ADMIN") return false;
                  
                  // Hide reports menu entirely if worker has no report permissions
                  if (item.href === "/reports" && user?.role === "WORKER") {
                    const hasSomeReports = hasPermission("reports_customers_suppliers") || hasPermission("reports_treasury_banks");
                    return hasSomeReports;
                  }
                  
                  return true;
                })
                .map((item) => (
                item.subItems ? (
                  <Collapsible
                    key={item.href}
                    defaultOpen={isActive(item.href)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          isActive={isActive(item.href)}
                          className="group hover:bg-primary/10 transition-all"
                        >
                          <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          <span className="font-medium">{item.title}</span>
                          <ChevronDown className="mr-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="mr-4 border-r-2 border-primary/20">
                          {item.subItems
                            .filter(sub => {
                              if (user?.role === "ADMIN") return true;
                              if (sub.href === "/reports") return hasPermission("reports_customers_suppliers");
                              if (sub.href === "/reports/treasury" || sub.href === "/reports/banks") return hasPermission("reports_treasury_banks");
                              return true;
                            })
                            .map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.href}
                                className="hover:bg-primary/5 transition-all"
                              >
                                <Link href={subItem.href} className="text-sm font-medium">
                                  {subItem.title}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.href)}
                      className="group hover:bg-primary/10 transition-all"
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-4 bg-gradient-to-t from-primary/5 to-transparent flex flex-row items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer hover:bg-primary/5 p-2 rounded-lg transition-all">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              {user ? user.username.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold">{user ? user.username : "جاري التحميل..."}</span>
            <span className="text-xs text-muted-foreground font-medium">
              {user ? (user.role === "ADMIN" ? "مدير النظام" : "موظف") : ""}
            </span>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          title="تسجيل الخروج"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}