"use client";

import React, { useState, useEffect } from "react";
import { getJournalEntries } from "@/app/actions/journal";
import { getCompanySettingsAction } from "@/app/(dashboard)/settings/actions";
import { Navbar } from "@/components/layout/navbar";
import { JournalList } from "./components/JournalList";
import { PermissionGuard } from "@/components/shared";

export default function JournalPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getJournalEntries(),
      getCompanySettingsAction(),
    ]).then(([entriesData, settings]) => {
      setEntries(entriesData as any);
      setCompanySettings(settings);
      setLoading(false);
    });
  }, []);

  return (
    <PermissionGuard permissionKey="accounting_journal_view">
      <>
        <div className="print:hidden">
          <Navbar title="قيود اليومية" />
        </div>
        <div className="flex-1 p-4 md:p-8 space-y-8 bg-slate-50/30 dark:bg-transparent min-h-screen print:p-0 print:bg-white print:min-h-0" dir="rtl">
          {loading ? (
            <div className="text-center py-20">جاري التحميل...</div>
          ) : (
            <JournalList 
              initialEntries={entries} 
              companySettings={companySettings} 
            />
          )}
        </div>
      </>
    </PermissionGuard>
  );
}
