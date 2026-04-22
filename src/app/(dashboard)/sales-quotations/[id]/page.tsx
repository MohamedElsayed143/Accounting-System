"use client";
import { PermissionGuard } from "@/components/shared";
// app/(dashboard)/sales-quotations/[id]/page.tsx
import { useRouter, useParams } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { QuotationForm } from "../components/QuotationForm";

function ViewQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const quotationId = params.id as string;

  return (
    <>
      <Navbar title="عرض سعر" />
      <div className="min-h-screen bg-slate-50/50 pb-12">
        <QuotationForm
          quotationId={quotationId}
          readOnly={true}
          onBack={() => router.push("/sales-quotations")}
        />
      </div>
    </>
  );
}


export default function ProtectedViewQuotationPage(props: any) {
  return (
    <PermissionGuard permissionKey="sales_quotations_view">
      <ViewQuotationPage {...props} />
    </PermissionGuard>
  );
}
