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

interface RecentInvoicesProps {
  invoices: SalesInvoice[];
}

const statusStyles = {
  paid: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  unpaid: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  overdue: "bg-red-100 text-red-700 hover:bg-red-100",
  partial: "bg-blue-100 text-blue-700 hover:bg-blue-100",
};

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Invoices</CardTitle>
        <Link
          href="/sales-invoices"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.slice(0, 5).map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  {invoice.invoiceNumber}
                </TableCell>
                <TableCell>{invoice.customerName}</TableCell>
                <TableCell>${invoice.total.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(statusStyles[invoice.status], "capitalize")}
                  >
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(invoice.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
