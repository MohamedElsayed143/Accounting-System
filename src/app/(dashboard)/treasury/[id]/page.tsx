"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Landmark,
  Building2,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccountDetails, type AccountDetails } from "../actions";
import { useRouter } from "next/navigation";

export default function AccountDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const accountId = parseInt(params.id as string);
  const accountType = searchParams.get("type") as "safe" | "bank" | null;

  const [data, setData] = useState<AccountDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التحقق من وجود type في الرابط
    if (!accountType) {
      router.push("/treasury");
      return;
    }

    if (accountId && accountType) {
      getAccountDetails(accountId, accountType)
        .then(setData)
        .catch((error) => {
          console.error("Error loading account details:", error);
        })
        .finally(() => setLoading(false));
    }
  }, [accountId, accountType, router]);

  if (loading)
    return <div className="p-10 text-center">جاري تحميل البيانات...</div>;
    
  if (!data)
    return (
      <div className="p-10 text-center">
        <p>لم يتم العثور على الحساب</p>
        <button 
          onClick={() => router.push("/treasury")}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
        >
          العودة للخزنة
        </button>
      </div>
    );

  const isSafe = accountType === "safe";
  const Icon = isSafe ? Building2 : Landmark;

  return (
    <>
      <Navbar title={data.name} />
      <div className="p-6" dir="rtl">
        {/* بطاقة الحساب */}
        <Card
          className={`mb-6 border-b-4 ${isSafe ? "border-b-blue-500" : "border-b-violet-500"}`}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-lg ${isSafe ? "bg-blue-50" : "bg-violet-50"}`}
                >
                  <Icon
                    className={isSafe ? "text-blue-600" : "text-violet-600"}
                    size={32}
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold mb-1">{data.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {isSafe ? "خزنة" : "بنك"} • آخر تحديث:{" "}
                    {new Date(data.updatedAt).toLocaleDateString("ar-EG")}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
                <p className="text-3xl font-black">
                  {data.balance.toLocaleString()} ج.م
                </p>
              </div>
            </div>

            {!isSafe && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {data.accountNumber && (
                  <div>
                    <span className="text-muted-foreground">رقم الحساب:</span>
                    <span className="mr-2 font-mono">{data.accountNumber}</span>
                  </div>
                )}
                {data.branch && (
                  <div>
                    <span className="text-muted-foreground">الفرع:</span>
                    <span className="mr-2">{data.branch}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* سجل المعاملات */}
        <Card>
          <CardHeader>
            <CardTitle>سجل المعاملات</CardTitle>
          </CardHeader>
          <CardContent>
            {data.transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد معاملات حتى الآن
              </p>
            ) : (
              <div className="divide-y">
                {data.transactions.map((trans) => (
                  <div
                    key={trans.id}
                    className="py-4 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      {trans.type === "receipt" ? (
                        <ArrowDownCircle
                          className="text-emerald-600"
                          size={20}
                        />
                      ) : (
                        <ArrowUpCircle className="text-red-600" size={20} />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-bold px-2 py-1 rounded-full ${
                              trans.type === "receipt"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {trans.type === "receipt" ? "سند قبض" : "سند صرف"}
                          </span>
                          <span className="font-mono text-sm">
                            {trans.voucherNumber}
                          </span>
                        </div>
                        <p className="text-sm mt-1">
                          {trans.partyName} •{" "}
                          {new Date(trans.date).toLocaleDateString("ar-EG")}
                        </p>
                        {trans.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {trans.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <p
                      className={`font-bold ${trans.type === "receipt" ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {trans.type === "receipt" ? "+" : "-"}
                      {trans.amount.toLocaleString()} ج.م
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}