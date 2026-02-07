import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SalesInvoice } from "@/types";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface RecentInvoicesProps {
  invoices: SalesInvoice[];
}

const statusStyles = {
  paid: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
  unpaid: "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200",
  overdue: "bg-red-100 text-red-700 hover:bg-red-100 border-red-200",
  partial: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
};

const statusLabels = {
  paid: "مدفوعة",
  unpaid: "غير مدفوعة",
  overdue: "متأخرة",
  partial: "مدفوعة جزئياً",
};

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <Card className="col-span-full shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <CardTitle className="text-xl font-bold">الفواتير الأخيرة</CardTitle>
        <Link
          href="/sales-invoices"
          className="flex items-center gap-2 text-sm font-medium text-primary hover:underline hover:gap-3 transition-all"
        >
          <span>عرض الكل</span>
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className="font-bold text-right">رقم الفاتورة</TableHead>
                <TableHead className="font-bold text-right">اسم العميل</TableHead>
                <TableHead className="font-bold text-right">المبلغ</TableHead>
                <TableHead className="font-bold text-right">الحالة</TableHead>
                <TableHead className="font-bold text-right">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.slice(0, 5).map((invoice, index) => (
                <TableRow 
                  key={invoice.id}
                  className={cn(
                    "hover:bg-muted/50 transition-colors",
                    index % 2 === 0 ? "bg-muted/20" : ""
                  )}
                >
                  <TableCell className="font-semibold text-primary">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell className="font-medium">{invoice.customerName}</TableCell>
                  <TableCell className="font-bold">
                    {invoice.total.toLocaleString('ar-SA')} ر.س
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        statusStyles[invoice.status], 
                        "font-semibold border shadow-sm"
                      )}
                    >
                      {statusLabels[invoice.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(invoice.createdAt).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {invoices.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">لا توجد فواتير حالياً</p>
            <p className="text-sm mt-2">ابدأ بإنشاء فاتورة جديدة</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}