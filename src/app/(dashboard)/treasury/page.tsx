"use client";

import { useState } from "react";
import {
  Landmark,
  Building2,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  X,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { treasuryAccounts, vouchers } from "@/mock-data";
import type { Treasury, Voucher } from "@/mock-data";
import Link from "next/link";

export default function TreasuryPage() {
  const [accounts, setAccounts] = useState<Treasury[]>(treasuryAccounts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newBankAccount, setNewBankAccount] = useState("");
  const [newBankBranch, setNewBankBranch] = useState("");

  const safeAccount = accounts.find((a) => a.type === "safe");
  const bankAccounts = accounts.filter((a) => a.type === "bank");
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const recentVouchers = [...vouchers]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const handleAddBank = () => {
    if (!newBankName.trim()) return;
    const newBank: Treasury = {
      id: `bank-${Date.now()}`,
      name: newBankName,
      type: "bank",
      balance: 0,
      accountNumber: newBankAccount || undefined,
      bankBranch: newBankBranch || undefined,
    };
    setAccounts([...accounts, newBank]);
    setNewBankName("");
    setNewBankAccount("");
    setNewBankBranch("");
    setDialogOpen(false);
  };

  return (
    <>
      <Navbar title="إدارة النقدية" />
      <div className="flex-1 space-y-6 p-6" dir="rtl">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-r-4 border-r-emerald-500 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    إجمالي الأرصدة
                  </p>
                  <p className="text-3xl font-bold tracking-tight bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
                    {totalBalance.toLocaleString("ar-SA")} ر.س
                  </p>
                </div>
                <div className="rounded-xl p-3 bg-emerald-100 shadow-sm">
                  <Wallet className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-r-4 border-r-blue-500 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    رصيد الخزنة
                  </p>
                  <p className="text-3xl font-bold tracking-tight bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
                    {(safeAccount?.balance ?? 0).toLocaleString("ar-SA")} ر.س
                  </p>
                </div>
                <div className="rounded-xl p-3 bg-blue-100 shadow-sm">
                  <Landmark className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-r-4 border-r-violet-500 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    إجمالي أرصدة البنوك
                  </p>
                  <p className="text-3xl font-bold tracking-tight bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
                    {bankAccounts
                      .reduce((s, b) => s + b.balance, 0)
                      .toLocaleString("ar-SA")}{" "}
                    ر.س
                  </p>
                </div>
                <div className="rounded-xl p-3 bg-violet-100 shadow-sm">
                  <Building2 className="h-6 w-6 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-r-4 border-r-amber-500 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    عدد الحسابات
                  </p>
                  <p className="text-3xl font-bold tracking-tight bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
                    {accounts.length}
                  </p>
                </div>
                <div className="rounded-xl p-3 bg-amber-100 shadow-sm">
                  <Building2 className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link href="/treasury/receipt-voucher">
            <Button className="gap-2 shadow-sm">
              <ArrowDownCircle className="h-4 w-4" />
              سند قبض جديد
            </Button>
          </Link>
          <Link href="/treasury/payment-voucher">
            <Button variant="outline" className="gap-2 shadow-sm">
              <ArrowUpCircle className="h-4 w-4" />
              سند صرف جديد
            </Button>
          </Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                إضافة بنك جديد
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-right">
                  إضافة بنك جديد
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>اسم البنك</Label>
                  <Input
                    placeholder="مثال: البنك السعودي الفرنسي"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الحساب</Label>
                  <Input
                    placeholder="رقم الآيبان أو رقم الحساب"
                    value={newBankAccount}
                    onChange={(e) => setNewBankAccount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>اسم الفرع</Label>
                  <Input
                    placeholder="مثال: فرع الرياض"
                    value={newBankBranch}
                    onChange={(e) => setNewBankBranch(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button onClick={handleAddBank} disabled={!newBankName.trim()}>
                    إضافة
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Treasury & Banks Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Main Safe */}
          {safeAccount && (
            <Link href={`/treasury/${safeAccount.id}`}>
              <Card className="shadow-sm hover:shadow-md transition-all border-t-4 border-t-blue-500 cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                      <Landmark className="h-5 w-5 text-blue-600" />
                      {safeAccount.name}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700"
                    >
                      خزنة
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        الرصيد الحالي
                      </p>
                      <p className="text-2xl font-bold mt-1">
                        {safeAccount.balance.toLocaleString("ar-SA")} ر.س
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Banks */}
          {bankAccounts.map((bank) => (
            <Link key={bank.id} href={`/treasury/${bank.id}`}>
              <Card className="shadow-sm hover:shadow-md transition-all border-t-4 border-t-violet-500 cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 group-hover:text-violet-600 transition-colors">
                      <Building2 className="h-5 w-5 text-violet-600" />
                      {bank.name}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="bg-violet-100 text-violet-700"
                    >
                      بنك
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        الرصيد الحالي
                      </p>
                      <p className="text-2xl font-bold mt-1">
                        {bank.balance.toLocaleString("ar-SA")} ر.س
                      </p>
                    </div>
                    {bank.accountNumber && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          رقم الحساب
                        </p>
                        <p className="text-sm font-mono mt-0.5 tracking-wider">
                          {bank.accountNumber}
                        </p>
                      </div>
                    )}
                    {bank.bankBranch && (
                      <div>
                        <p className="text-sm text-muted-foreground">الفرع</p>
                        <p className="text-sm font-medium mt-0.5">
                          {bank.bankBranch}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent Transactions */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              سجل العمليات الأخيرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم السند</TableHead>
                    <TableHead className="text-right">نوع السند</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">من حساب</TableHead>
                    <TableHead className="text-right">إلى حساب</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentVouchers.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-sm">
                        {v.voucherNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            v.type === "receipt"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {v.type === "receipt" ? (
                            <span className="flex items-center gap-1">
                              <ArrowDownCircle className="h-3 w-3" />
                              سند قبض
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <ArrowUpCircle className="h-3 w-3" />
                              سند صرف
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(v.date).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell className="text-sm">{v.fromAccount}</TableCell>
                      <TableCell className="text-sm">{v.toAccount}</TableCell>
                      <TableCell className="font-bold">
                        {v.amount.toLocaleString("ar-SA")} ر.س
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            v.status === "مكتمل"
                              ? "bg-emerald-100 text-emerald-700"
                              : v.status === "معلق"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }
                        >
                          {v.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
