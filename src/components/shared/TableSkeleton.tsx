// Skeleton components for instant loading feedback
"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4 text-center">
          <Skeleton className="h-4 w-full mx-auto" />
        </td>
      ))}
    </tr>
  );
}

export function InvoiceTableSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50 border-b">
            {["رقم الفاتورة", "العميل", "التاريخ", "المبلغ", "الحالة", "المرتجعات", "الإجراءات"].map((h) => (
              <th key={h} className="p-4 text-center text-xs font-bold text-muted-foreground uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className={cn("border-b", i % 2 === 0 ? "bg-muted/20" : "")}>
              <td className="p-4"><Skeleton className="h-5 w-24 mx-auto" /></td>
              <td className="p-4"><Skeleton className="h-4 w-32 mx-auto" /></td>
              <td className="p-4"><Skeleton className="h-4 w-28 mx-auto" /></td>
              <td className="p-4"><Skeleton className="h-5 w-20 mx-auto" /></td>
              <td className="p-4"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></td>
              <td className="p-4"><Skeleton className="h-4 w-12 mx-auto" /></td>
              <td className="p-4"><Skeleton className="h-8 w-8 mx-auto rounded" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CustomerTableSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50 border-b">
            {["الكود", "الاسم", "الهاتف", "العنوان", "مدين", "دائن", "الرصيد"].map((h) => (
              <th key={h} className="p-4 text-xs font-bold text-muted-foreground uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="border-b hover:bg-muted/20">
              <td className="p-4"><Skeleton className="h-4 w-12" /></td>
              <td className="p-4"><Skeleton className="h-4 w-32" /></td>
              <td className="p-4"><Skeleton className="h-4 w-24" /></td>
              <td className="p-4"><Skeleton className="h-4 w-28" /></td>
              <td className="p-4"><Skeleton className="h-4 w-16" /></td>
              <td className="p-4"><Skeleton className="h-4 w-16" /></td>
              <td className="p-4"><Skeleton className="h-4 w-16" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GenericListSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50 border-b">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="p-4">
                <Skeleton className="h-3 w-20 mx-auto" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b">
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="p-4">
                  <Skeleton className={cn("h-4 mx-auto", j === 0 ? "w-16" : j === 1 ? "w-32" : "w-20")} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
