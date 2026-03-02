// app/(dashboard)/sales-quotations/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { QuotationForm } from "../components/QuotationForm";
import { getQuotationById } from "../actions";

export default function CreateQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationId = searchParams.get("id");

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
