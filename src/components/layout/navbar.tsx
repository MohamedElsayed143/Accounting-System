"use client";

import { Bell, Search, LogOut, User, Settings as SettingsIcon, Package, Users, Truck, FileText, ShoppingCart } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAuthSession, logoutAction } from "@/app/login/actions";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUnreadNotificationsCount } from "@/app/(dashboard)/notifications/actions";
import { getCompanySettingsAction } from "@/app/(dashboard)/settings/actions";
import { globalSearchAction, SearchResult } from "@/app/actions/search";

interface NavbarProps {
  title?: string;
}

export function Navbar({ title }: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const [session, settings] = await Promise.all([
        getAuthSession(),
        getCompanySettingsAction(),
      ]);

      if (session?.user) {
        setUser(session.user);
        if (session.user.role === "ADMIN") {
          const count = await getUnreadNotificationsCount();
          setUnreadCount(count);
        }
      } else {
        // If session is null (e.g. database reset but cookie exists), redirect to login
        router.push("/login");
      }

      if (settings?.companyLogo) {
        setCompanyLogo(settings.companyLogo);
      }
    };
    loadData();

    // Close search results when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    // Refresh count every 1 minute
    const interval = setInterval(async () => {
      if (user?.role === "ADMIN") {
        const count = await getUnreadNotificationsCount();
        setUnreadCount(count);
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [user?.role]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        const results = await globalSearchAction(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
  };

  const getIconForType = (type: SearchResult["type"]) => {
    switch (type) {
      case "nav": return <Search className="h-4 w-4" />;
      case "product": return <Package className="h-4 w-4" />;
      case "customer": return <Users className="h-4 w-4" />;
      case "supplier": return <Truck className="h-4 w-4" />;
      case "sales-invoice": return <FileText className="h-4 w-4" />;
      case "purchase-invoice": return <ShoppingCart className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "nav": return "صفحة";
      case "product": return "صنف";
      case "customer": return "عميل";
      case "supplier": return "مورد";
      case "sales-invoice": return "فاتورة مبيعات";
      case "purchase-invoice": return "فاتورة مشتريات";
      default: return "";
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm print:hidden">
      <SidebarTrigger className="md:hidden hover:bg-primary/10 transition-all" />

      <div className="flex flex-1 items-center gap-4">
        {title && (
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block" ref={searchRef}>
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="ابحث هنا..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim().length > 1 && setShowResults(true)}
            className="h-9 w-64 rounded-full bg-muted/50 pr-10 pl-4 text-sm focus-visible:ring-2 focus-visible:ring-primary/50 transition-all"
            dir="rtl"
          />
          
          {showResults && (
            <div className="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border bg-popover p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200" dir="rtl">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-muted-foreground">جاري البحث...</div>
              ) : searchResults.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {searchResults.map((result, idx) => (
                    <Link
                      key={`${result.type}-${result.id}-${idx}`}
                      href={result.href}
                      onClick={() => setShowResults(false)}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors group"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {getIconForType(result.type)}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold truncate leading-tight">{result.title}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{getTypeLabel(result.type)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
              )}
            </div>
          )}
        </div>

        <Link href="/notifications">
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-9 w-9 hover:bg-primary/10 transition-all group"
          >
            <Bell className="h-4 w-4 group-hover:scale-110 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute left-1.5 top-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive text-[8px] flex items-center justify-center text-white"></span>
              </span>
            )}
          </Button>
        </Link>

        <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full p-0 hover:bg-primary/10 transition-all"
              >
                <Avatar className="h-9 w-9 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                  {companyLogo && <AvatarImage src={companyLogo} alt="Company Logo" className="object-cover" />}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold uppercase">
                    {user ? user.username.charAt(0) : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold leading-none">
                    {user ? user.username : "جاري التحميل..."}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground font-medium">
                    {user ? (user.role === "ADMIN" ? "مدير النظام" : "موظف") : ""}
                  </p>
                </div>
              </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 transition-all gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="font-medium">الإعدادات</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-destructive/10 text-destructive transition-all gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}