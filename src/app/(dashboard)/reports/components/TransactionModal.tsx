"use client";

import React from "react";
import {
  Receipt,
  X,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  Printer
} from "lucide-react";
import type { TransactionType } from "../actions";

interface TransactionModalProps {
  transaction: TransactionType | null;
  companySettings: any;
  onClose: () => void;
}

export function TransactionModal({
  transaction,
  companySettings,
  onClose,
}: TransactionModalProps) {
  if (!transaction) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                تفاصيل المعاملة
              </h3>
              <p className="text-sm text-slate-500">{transaction.documentId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                التاريخ
              </label>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {new Date(transaction.date).toLocaleDateString("ar-EG")}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                نوع الحركة
              </label>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  transaction.type === "فاتورة"
                    ? "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20"
                    : transaction.type === "سند قبض"
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20"
                      : transaction.type === "سند صرف"
                        ? "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20"
                        : "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-900/20"
                }`}
              >
                {transaction.type}
              </span>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                رقم المستند
              </label>
              <p className="text-sm font-mono text-slate-900 dark:text-white">
                {transaction.documentId}
              </p>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                البيان
              </label>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {transaction.description}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                طريقة الدفع
              </label>
              <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                {transaction.paymentMethod === "نقدي" && (
                  <Banknote className="w-4 h-4 text-emerald-600" />
                )}
                {transaction.paymentMethod === "بنك" && (
                  <Building2 className="w-4 h-4 text-blue-600" />
                )}
                {transaction.paymentMethod === "شيك" && (
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                )}
                {transaction.paymentMethod === "تحويل" && (
                  <CreditCard className="w-4 h-4 text-amber-600" />
                )}
                {transaction.paymentMethod}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">
              تفاصيل المبلغ
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {transaction.debit > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    مدين
                  </span>
                  <span className="text-lg font-bold text-emerald-600">
                    +{transaction.debit.toLocaleString("ar-EG")}{" "}
                    <span className="text-xs">{companySettings?.currencyCode || "ج.م"}</span>
                  </span>
                </div>
              )}
              {transaction.credit > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    دائن
                  </span>
                  <span className="text-lg font-bold text-rose-600">
                    -{transaction.credit.toLocaleString("ar-EG")}{" "}
                    <span className="text-xs">{companySettings?.currencyCode || "ج.م"}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            إغلاق
          </button>
          
            
          
        </div>
      </div>
    </div>
  );
}
