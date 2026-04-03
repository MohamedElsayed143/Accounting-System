"use server";

import React from "react";
import { getJournalEntries } from "@/app/actions/journal";
import { getCompanySettingsAction } from "@/app/(dashboard)/settings/actions";
import { Navbar } from "@/components/layout/navbar";
import { JournalList } from "./components/JournalList";

export default async function JournalPage() {
  const [entries, companySettings] = await Promise.all([
    getJournalEntries(),
    getCompanySettingsAction(),
  ]);

  return (
    <>
      <div className="print:hidden">
        <Navbar title="قيود اليومية" />
      </div>
      <div className="flex-1 p-4 md:p-8 space-y-8 bg-slate-50/30 dark:bg-transparent min-h-screen print:p-0 print:bg-white print:min-h-0" dir="rtl">
        <JournalList 
          initialEntries={entries as any} 
          companySettings={companySettings} 
        />
      </div>
    </>
  );
}
