"use client";

import { Bell, Search, LogOut, User, Settings as SettingsIcon } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { userProfile } from "@/mock-data";

interface NavbarProps {
  title?: string;
}

export function Navbar({ title }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <SidebarTrigger className="md:hidden hover:bg-primary/10 transition-all" />

      <div className="flex flex-1 items-center gap-4">
        {title && (
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="ابحث هنا..."
            className="h-9 w-64 rounded-full bg-muted/50 pr-10 pl-4 text-sm focus-visible:ring-2 focus-visible:ring-primary/50 transition-all"
            dir="rtl"
          />
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 hover:bg-primary/10 transition-all group"
        >
          <Bell className="h-4 w-4 group-hover:scale-110 transition-transform" />
          <span className="absolute left-1.5 top-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
          </span>
        </Button>

        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full p-0 hover:bg-primary/10 transition-all"
            >
              <Avatar className="h-9 w-9 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                  {userProfile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold leading-none">
                  {userProfile.name}
                </p>
                <p className="text-xs leading-none text-muted-foreground font-medium">
                  {userProfile.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 transition-all gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">الملف الشخصي</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 transition-all gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="font-medium">الإعدادات</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer hover:bg-destructive/10 text-destructive transition-all gap-2">
              <LogOut className="h-4 w-4" />
              <span className="font-medium">تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}