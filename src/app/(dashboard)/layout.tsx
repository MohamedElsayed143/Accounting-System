"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Toaster } from "sonner";
import { ManagementModeProvider } from "@/components/providers/ManagementModeProvider";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ManagementModeProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-muted/30">
          {children}
          <Toaster 
            position="top-center"
            richColors
            closeButton
            dir="rtl"
          />
        </SidebarInset>
      </SidebarProvider>
    </ManagementModeProvider>
  );
}
