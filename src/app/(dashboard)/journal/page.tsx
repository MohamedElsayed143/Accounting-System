"use server";

import React from "react";
import { getJournalEntries } from "@/app/actions/journal";
import { Navbar } from "@/components/layout/navbar";
import { JournalList } from "./components/JournalList";

export default async function JournalPage() {
  const entries = await getJournalEntries();

  return (
    <>
      <Navbar title="قيود اليومية" />
      <div className="flex-1 p-4 md:p-8 space-y-8 bg-slate-50/30 dark:bg-transparent min-h-screen" dir="rtl">
        <JournalList initialEntries={entries as any} />
      </div>
    </>
  );
}
