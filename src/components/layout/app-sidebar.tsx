"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { userProfile } from "@/mock-data";

const mainNavItems = [
  {
    title: "لوحة التحكم",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
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

const otherNavItems = [
  {
    title: "التقارير",
    href: "/reports",
    icon: BarChart3,
  },
  {
    title: "الإعدادات",
    href: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <Sidebar className="border-l border-border/40 shadow-sm">
      <SidebarHeader className="border-b border-border/40 px-4 py-4 bg-gradient-to-b from-primary/5 to-transparent">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md group-hover:shadow-lg transition-all">
            <Calculator className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
              دفاتر المحاسبة
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              نظام محاسبي متكامل
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            نظرة عامة
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
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

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            الفواتير
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {invoiceNavItems.map((item) => (
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
                        {treasuryNavItem.subItems.map((subItem) => (
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

          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              الإدارة
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherNavItems.map((item) => (
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
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-4 bg-gradient-to-t from-primary/5 to-transparent">
        <div className="flex items-center gap-3 group cursor-pointer hover:bg-primary/5 p-2 rounded-lg transition-all">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              {userProfile.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold">{userProfile.name}</span>
            <span className="text-xs text-muted-foreground font-medium">
              {userProfile.role}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}