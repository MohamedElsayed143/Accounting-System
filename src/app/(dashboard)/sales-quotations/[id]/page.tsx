// app/(dashboard)/sales-quotations/[id]/page.tsx
"use client";

import { useRouter, useParams } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { QuotationForm } from "../components/QuotationForm";

export default function ViewQuotationPage() {
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
