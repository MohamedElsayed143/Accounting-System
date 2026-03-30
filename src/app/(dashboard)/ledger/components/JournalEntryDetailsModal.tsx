"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  X,
  Calendar,
  Layers,
  User,
} from "lucide-react";
import { getJournalEntryDetails } from "../actions";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface JournalEntryDetailsModalProps {
  journalEntryId: number | null;
  onClose: () => void;
}

export function JournalEntryDetailsModal({
  journalEntryId,
  onClose,
}: JournalEntryDetailsModalProps) {
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (journalEntryId) {
      setLoading(true);
      getJournalEntryDetails(journalEntryId).then((data) => {
        setEntry(data);
        setLoading(false);
      });
    }
  }, [journalEntryId]);

  if (!journalEntryId) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                تفاصيل القيد المحاسبي
                {entry && (
                  <span className="text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-md">
                    #{entry.entryNumber}
                  </span>
                )}
              </h3>
              <p className="text-sm text-slate-500 font-medium">عرض تفصيلي للعملية (مدين ودائن)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 font-medium">جاري تحميل تفاصيل العملية...</p>
            </div>
          ) : !entry ? (
            <div className="py-12 text-center text-slate-500">
              لا يمكن العثور على العملية المطلوبة
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">التاريخ</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {format(new Date(entry.date), "dd MMMM yyyy", { locale: ar })}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <Layers className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">المصدر</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {entry.sourceType === "MANUAL"
                      ? "قيد يدوي"
                      : entry.sourceType}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <User className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">المستخدم</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {entry.createdBy?.username || "النظام"}
                  </p>
                </div>
              </div>

              {(entry.description || entry.reference) && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                  {entry.description && (
                    <div className="mb-2">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">البيان الأساسي: </span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{entry.description}</span>
                    </div>
                  )}
                  {entry.reference && (
                    <div>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">رقم المرجع: </span>
                      <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{entry.reference}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h4 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">بنود القيد (الحسابات المتأثرة)</h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500">كود</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500">اسم الحساب</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500">البيان</th>
                        <th className="px-4 py-3 text-xs font-bold text-center text-slate-500">مدين</th>
                        <th className="px-4 py-3 text-xs font-bold text-center text-slate-500">دائن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {entry.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-mono text-sm text-slate-500">{item.account.code}</td>
                          <td className="px-4 py-3 font-bold text-sm text-slate-700 dark:text-slate-300">{item.account.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{item.description || "-"}</td>
                          <td className="px-4 py-3 font-bold text-center text-emerald-600">
                            {item.debit > 0 ? item.debit.toLocaleString("ar-EG", { minimumFractionDigits: 2 }) : "-"}
                          </td>
                          <td className="px-4 py-3 font-bold text-center text-rose-600">
                            {item.credit > 0 ? item.credit.toLocaleString("ar-EG", { minimumFractionDigits: 2 }) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 font-black text-slate-900 dark:text-white">الإجمالي</td>
                        <td className="px-4 py-3 font-black text-center text-emerald-600">
                          {entry.items.reduce((sum: number, item: any) => sum + item.debit, 0).toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 font-black text-center text-rose-600">
                          {entry.items.reduce((sum: number, item: any) => sum + item.credit, 0).toLocaleString("ar-EG", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
