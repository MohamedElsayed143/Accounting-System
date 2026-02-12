"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Landmark,
  Building2,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  CalendarDays,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { treasuryAccounts, vouchers } from "@/mock-data";

export default function AccountDetailsPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const account = treasuryAccounts.find((a) => a.id === accountId);

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Get transactions related to this account
  const accountTransactions = useMemo(() => {
    if (!account) return [];

    return vouchers
      .filter((v) => {
        const isRelated =
          v.fromAccount === account.name || v.toAccount === account.name;
        if (!isRelated) return false;

        if (typeFilter !== "all" && v.type !== typeFilter) return false;

        if (dateFrom && v.date < dateFrom) return false;
        if (dateTo && v.date > dateTo) return false;

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [account, typeFilter, dateFrom, dateTo]);

  // Calculate running balance
  const transactionsWithBalance = useMemo(() => {
    if (!account) return [];

    const allRelated = vouchers
      .filter(
        (v) =>
          v.fromAccount === account.name || v.toAccount === account.name
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Starting balance = current balance minus all transaction effects
    let startBalance = account.balance;
    for (const v of allRelated) {
      if (v.toAccount === account.name) {
        startBalance -= v.amount;
      } else if (v.fromAccount === account.name) {
        startBalance += v.amount;
      }
    }

    // Build running balance for all transactions
    let balance = startBalance;
    const fullWithBalance = allRelated.map((v) => {
      if (v.toAccount === account.name) {
        balance += v.amount;
      } else if (v.fromAccount === account.name) {
        balance -= v.amount;
      }
      return { ...v, runningBalance: balance };
    });

    // Filter to match current filters and reverse for display (newest first)
    const filteredIds = new Set(accountTransactions.map((t) => t.id));
    return fullWithBalance
      .filter((t) => filteredIds.has(t.id))
      .reverse();
  }, [account, accountTransactions]);

  // Stats
  const totalIn = accountTransactions
    .filter((v) => v.toAccount === account?.name)
    .reduce((s, v) => s + v.amount, 0);
  const totalOut = accountTransactions
    .filter((v) => v.fromAccount === account?.name)
    .reduce((s, v) => s + v.amount, 0);

  if (!account) {
    return (
      <>
        <Navbar title="تفاصيل الحساب" />
        <div className="flex-1 p-6" dir="rtl">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-xl font-semibold text-muted-foreground mb-4">
              الحساب غير موجود
            </p>
            <Link href="/treasury">
              <Button variant="outline" className="gap-2">
                <ArrowRight className="h-4 w-4" />
                رجوع إلى إدارة النقدية
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const isSafe = account.type === "safe";

  return (
    <>
      <Navbar title={`تفاصيل الحساب - ${account.name}`} />
      <div className="flex-1 space-y-6 p-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`rounded-xl p-3 shadow-sm ${
                isSafe ? "bg-blue-100" : "bg-violet-100"
              }`}
            >
              {isSafe ? (
                <Landmark className="h-7 w-7 text-blue-600" />
              ) : (
                <Building2 className="h-7 w-7 text-violet-600" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{account.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <Badge
                  variant="secondary"
                  className={
                    isSafe
                      ? "bg-blue-100 text-blue-700"
                      : "bg-violet-100 text-violet-700"
                  }
                >
                  {isSafe ? "خزنة" : "بنك"}
                </Badge>
                {account.accountNumber && (
                  <span className="text-sm text-muted-foreground font-mono">
                    {account.accountNumber}
                  </span>
                )}
                {account.bankBranch && (
                  <span className="text-sm text-muted-foreground">
                    | {account.bankBranch}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link href="/treasury">
            <Button variant="outline" className="gap-2 shadow-sm">
              <ArrowRight className="h-4 w-4" />
              رجوع
            </Button>
          </Link>
        </div>

        {/* Balance & Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card
            className={`border-r-4 shadow-sm ${
              isSafe ? "border-r-blue-500" : "border-r-violet-500"
            }`}
          >
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">
                الرصيد الحالي
              </p>
              <p className="text-3xl font-bold mt-2 bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
                {account.balance.toLocaleString("ar-SA")} ر.س
              </p>
            </CardContent>
          </Card>

          <Card className="border-r-4 border-r-emerald-500 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-muted-foreground">
                  إجمالي الوارد
                </p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {totalIn.toLocaleString("ar-SA")} ر.س
              </p>
            </CardContent>
          </Card>

          <Card className="border-r-4 border-r-red-500 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm font-medium text-muted-foreground">
                  إجمالي الصادر
                </p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {totalOut.toLocaleString("ar-SA")} ر.س
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5 min-w-[160px]">
                <Label className="text-sm flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  نوع السند
                </Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="receipt">قبض</SelectItem>
                    <SelectItem value="payment">صرف</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 min-w-[160px]">
                <Label className="text-sm flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  من تاريخ
                </Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 min-w-[160px]">
                <Label className="text-sm flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  إلى تاريخ
                </Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  setTypeFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                مسح الفلاتر
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">سجل الحركات</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsWithBalance.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">لا توجد حركات مطابقة للفلاتر المحددة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">نوع السند</TableHead>
                      <TableHead className="text-right">رقم السند</TableHead>
                      <TableHead className="text-right">البيان</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">
                        الرصيد المتبقي
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsWithBalance.map((v) => {
                      const isIncoming = v.toAccount === account.name;
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(v.date).toLocaleDateString("ar-SA")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                isIncoming
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }
                            >
                              {isIncoming ? (
                                <span className="flex items-center gap-1">
                                  <ArrowDownCircle className="h-3 w-3" />
                                  قبض
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <ArrowUpCircle className="h-3 w-3" />
                                  صرف
                                </span>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {v.voucherNumber}
                          </TableCell>
                          <TableCell className="text-sm max-w-[250px] truncate">
                            {v.description}
                          </TableCell>
                          <TableCell
                            className={`font-bold whitespace-nowrap ${
                              isIncoming ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {isIncoming ? "+" : "-"}
                            {v.amount.toLocaleString("ar-SA")} ر.س
                          </TableCell>
                          <TableCell className="font-bold whitespace-nowrap">
                            {v.runningBalance.toLocaleString("ar-SA")} ر.س
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
