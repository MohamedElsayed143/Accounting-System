"use client";

import React from "react";
import { JournalEntryForm } from "@/components/accounting/JournalEntryForm";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewJournalEntryPage() {
  const router = useRouter();

  return (
    <>
      <Navbar title="إضافة قيد يومية" />
      <div className="flex-1 p-4 md:p-8 space-y-8 bg-slate-50/30 dark:bg-transparent min-h-screen" dir="rtl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-l from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                <BookOpen className="w-7 h-7" />
              </div>
              دفتر اليومية العامة
            </h1>
            <p className="text-slate-500 font-medium text-sm">تسجيل العمليات المالية يدوياً في دفتر اليومية</p>
          </div>

          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="gap-2 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-all rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للسابق
          </Button>
        </div>

        <JournalEntryForm />
      </div>
    </>
  );
}
