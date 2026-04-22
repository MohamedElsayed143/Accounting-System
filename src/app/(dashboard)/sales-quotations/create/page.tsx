"use client";
import { PermissionGuard } from "@/components/shared";
// app/(dashboard)/sales-quotations/create/page.tsx
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { QuotationForm } from "../components/QuotationForm";
import { Loader2 } from "lucide-react";

function CreateQuotationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationId = searchParams?.get("id");
  const title = quotationId ? "تعديل عرض سعر" : "إنشاء عرض سعر جديد";

  return (
    <>
      <Navbar title={title} />
      <div className="min-h-screen bg-slate-50/50 pb-12">
        <QuotationForm
          quotationId={quotationId}
          readOnly={false}
          onBack={() => router.push("/sales-quotations")}
        />
      </div>
    </>
  );
}

function CreateQuotationPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CreateQuotationContent />
    </Suspense>
  );
}


export default function ProtectedCreateQuotationPage(props: any) {
  return (
    <PermissionGuard permissionKey="sales_quotations_view">
      <CreateQuotationPage {...props} />
    </PermissionGuard>
  );
}
