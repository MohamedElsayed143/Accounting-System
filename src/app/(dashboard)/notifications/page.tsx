"use client";

import React, { useEffect, useState } from "react";
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ExternalLink,
  Search,
  Filter,
  Loader2
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification,
  getTreasuryRequests,
  approveTreasuryRequest, 
  rejectTreasuryRequest,
  getSessionRole
} from "./actions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
  isRead: boolean;
  createdAt: Date;
}

interface TreasuryRequest {
  id: number;
  type: "TRANSFER" | "CREATE_SAFE" | "CREATE_BANK" | "RECEIPT_VOUCHER" | "PAYMENT_VOUCHER";
  data: any;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requesterId: string;
  requester: { username: string };
  approverId?: string | null;
  approver?: { username: string } | null;
  reason?: string | null;
  createdAt: Date;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [requests, setRequests] = useState<TreasuryRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"notifications" | "requests">("notifications");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [currentRequestToReject, setCurrentRequestToReject] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    getSessionRole().then(role => setUserRole(role));
  }, []);

  useEffect(() => {
    if (activeTab === "notifications") {
      loadNotifications();
    } else {
      loadRequests();
    }
  }, [activeTab]);

  async function loadRequests() {
    setLoading(true);
    try {
      const data = await getTreasuryRequests();
      setRequests(data.map((r: any) => ({ ...r, createdAt: new Date(r.createdAt) })));
    } catch (error) {
      toast.error("فشل في تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await getNotifications();
      // Ensure date objects are correctly handled if they come back as strings from server action (though they should be Dates)
      const formattedData = data.map((n: Notification) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        type: n.type as any
      }));
      setNotifications(formattedData);
    } catch (error) {
      toast.error("فشل في تحميل التنبيهات");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(id: number) {
    try {
      await markAsRead(id);
      setNotifications((prev: Notification[]) => prev.map((n: Notification) => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      toast.error("حدث خطأ ما");
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead();
      setNotifications((prev: Notification[]) => prev.map((n: Notification) => ({ ...n, isRead: true })));
      toast.success("تم تحديد الجميع كمقروء");
    } catch (error) {
      toast.error("حدث خطأ ما");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteNotification(id);
      setNotifications((prev: Notification[]) => prev.filter((n: Notification) => n.id !== id));
      toast.success("تم حذف التنبيه");
    } catch (error) {
      toast.error("حدث خطأ ما");
    }
  }

  async function handleApprove(id: number) {
    setProcessingId(id);
    try {
      await approveTreasuryRequest(id);
      toast.success("تمت الموافقة على الطلب بنجاح");
      loadRequests();
    } catch (error: any) {
      toast.error(error.message || "فشل تنفيذ الطلب");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: number) {
    setProcessingId(id);
    try {
      await rejectTreasuryRequest(id, rejectionReason || undefined);
      toast.success("تم رفض الطلب");
      setRejectionDialogOpen(false);
      setRejectionReason("");
      loadRequests();
    } catch (error: any) {
      toast.error("فشل رفض الطلب");
    } finally {
      setProcessingId(null);
    }
  }

  const openRejectionDialog = (id: number) => {
    setCurrentRequestToReject(id);
    setRejectionReason("");
    setRejectionDialogOpen(true);
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "TRANSFER": return "تحويل مالي";
      case "CREATE_SAFE": return "إنشاء خزنة";
      case "CREATE_BANK": return "إنشاء بنك";
      case "RECEIPT_VOUCHER": return "سند قبض";
      case "PAYMENT_VOUCHER": return "سند صرف";
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "INFO": return <Info className="w-5 h-5 text-blue-500" />;
      case "WARNING": return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "SUCCESS": return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "ERROR": return <XCircle className="w-5 h-5 text-rose-500" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "INFO": return "bg-blue-100 text-blue-700 border-blue-200";
      case "WARNING": return "bg-amber-100 text-amber-700 border-amber-200";
      case "SUCCESS": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "ERROR": return "bg-rose-100 text-rose-700 border-rose-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.includes(searchTerm) || n.message.includes(searchTerm);
    const matchesFilter = !filterType || n.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <Navbar title="التنبيهات والتحذيرات" />
      <div className="flex-1 p-4 md:p-6 bg-slate-50/40 dark:bg-transparent min-h-screen" dir="rtl">
        
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Header Area */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">مركز التنبيهات والطلبات</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">تابع التنبيهات وقم بإدارة طلبات الموظفين</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
              <button
                onClick={() => setActiveTab("notifications")}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "notifications" ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                الإشعارات {unreadCount > 0 && <span className="mr-1 inline-flex items-center justify-center w-5 h-5 bg-rose-500 text-white rounded-full text-[10px]">{unreadCount}</span>}
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "requests" ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                الطلبات {requests.filter(r => r.status === "PENDING").length > 0 && <span className="mr-1 inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white rounded-full text-[10px]">{requests.filter(r => r.status === "PENDING").length}</span>}
              </button>
            </div>
          </div>

          <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            {activeTab === "notifications" ? (
              <>
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 py-4">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="ابحث في التنبيهات..." 
                        className="pr-10 bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-700" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2 rounded-xl w-full sm:w-auto">
                            <Filter className="w-4 h-4" />
                            {filterType === "INFO" ? "معلومات" : 
                             filterType === "WARNING" ? "تحذيرات" :
                             filterType === "SUCCESS" ? "نجاح" :
                             filterType === "ERROR" ? "أخطاء" : "كل الأنواع"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          <DropdownMenuItem onClick={() => setFilterType(null)}>الكل</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFilterType("INFO")}>معلومات</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFilterType("WARNING")}>تحذيرات</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFilterType("SUCCESS")}>نجاح</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFilterType("ERROR")}>أخطاء</DropdownMenuItem>
                        </DropdownMenuContent>
                       </DropdownMenu>
                       
                       <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleMarkAllAsRead}
                        disabled={unreadCount === 0}
                        className="gap-2 rounded-xl"
                      >
                        <CheckCheck className="w-4 h-4" />
                        تحديد الجميع كمقروء
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-4">
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <p className="text-sm text-slate-500 font-medium">جاري تحميل التنبيهات...</p>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-6 text-center">
                      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                        <Bell className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">لا توجد تنبيهات</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xs mt-1">صندوق التنبيهات الخاص بك فارغ حالياً.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredNotifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`flex gap-4 p-5 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${!n.isRead ? "bg-primary/[0.02] border-r-4 border-r-primary shadow-sm" : ""}`}
                        >
                          <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border ${n.isRead ? "border-slate-100 dark:border-slate-800" : "border-primary/20"}`}>
                            {getTypeIcon(n.type)}
                          </div>

                          <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-bold text-slate-900 dark:text-white truncate ${!n.isRead ? "text-base" : "text-sm opacity-80"}`}>
                                  {n.title}
                                </h3>
                                <Badge variant="outline" className={`text-[10px] h-5 rounded-md font-bold px-1.5 ${getTypeBadgeColor(n.type)}`}>
                                  {n.type === "INFO" ? "معلومات" : 
                                   n.type === "WARNING" ? "تحذير" :
                                   n.type === "SUCCESS" ? "نجاح" : "تنبيه"}
                                </Badge>
                              </div>
                              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 shrink-0">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: ar })}
                              </span>
                            </div>
                            
                            <p className={`text-sm leading-relaxed ${!n.isRead ? "text-slate-700 dark:text-slate-300 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                              {n.message}
                            </p>

                            <div className="flex items-center gap-3 pt-2">
                              {!n.isRead && (
                                <button 
                                  onClick={() => handleMarkAsRead(n.id)}
                                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/5 transition-colors"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  تحديد كمقروء
                                </button>
                              )}
                              <button 
                                onClick={() => handleDelete(n.id)}
                                className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1 px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                حذف
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              /* ══ Tab: Requests ══ */
              <>
                <CardHeader className="bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/40 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      طلبات الموظفين المعلقة
                    </h3>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-4">
                      <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
                      <p className="text-sm text-slate-500 font-medium">جاري تحميل الطلبات...</p>
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-6 text-center">
                      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">لا توجد طلبات معلقة</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xs mt-1">جميع طلبات الموظفين قد تم العمل عليها.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {requests.map((r) => (
                        <div 
                          key={r.id} 
                          className={`flex flex-col sm:flex-row gap-4 p-5 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${r.status === "PENDING" ? "bg-amber-50/[0.03] border-r-4 border-r-amber-500" : ""}`}
                        >
                          <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border ${r.status === "PENDING" ? "border-amber-200" : "border-slate-100 dark:border-slate-800"}`}>
                            <Clock className={`w-6 h-6 ${r.status === "PENDING" ? "text-amber-500" : "text-slate-400"}`} />
                          </div>

                          <div className="flex-1 space-y-2 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                  {getRequestTypeLabel(r.type)} - بواسطة {r.requester.username}
                                </h3>
                                <Badge className={`text-[10px] font-bold ${
                                  r.status === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                  r.status === "APPROVED" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                  "bg-rose-100 text-rose-700 border-rose-200"
                                }`}>
                                  {r.status === "PENDING" ? "في انتظار الموافقة" :
                                   r.status === "APPROVED" ? (userRole === "ADMIN" ? "تم التنفيذ" : "تمت الموافقة") : "مرفوض"}
                                </Badge>
                              </div>
                              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(r.createdAt, { addSuffix: true, locale: ar })}
                              </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-sm text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                              {r.type === "TRANSFER" && (
                                <p>تحويل مبلغ <span className="font-bold text-primary">{r.data.amount}</span> من <span className="font-bold">{r.data.fromType === "safe" ? "خزنة" : "بنك"}</span> إلى <span className="font-bold">{r.data.toType === "safe" ? "خزنة" : "بنك"}</span></p>
                              )}
                              {(r.type === "CREATE_SAFE" || r.type === "CREATE_BANK") && (
                                <p>إنشاء حساب جديد باسم: <span className="font-bold text-primary">{r.data.name}</span> برصيد افتتاحي <span className="font-bold">{r.data.initialBalance || 0}</span></p>
                              )}
                              {(r.type === "RECEIPT_VOUCHER" || r.type === "PAYMENT_VOUCHER") && (
                                <p>سند بقيمة <span className="font-bold text-primary">{r.data.amount}</span> بتاريخ <span className="font-bold">{r.data.date}</span></p>
                              )}
                              {r.data.description && <p className="mt-1 italic text-xs">الوصف: {r.data.description}</p>}
                            </div>

                            {r.status === "PENDING" && userRole === "ADMIN" ? (
                              <div className="flex items-center gap-3 pt-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleApprove(r.id)}
                                  disabled={processingId === r.id}
                                  className="rounded-xl font-bold gap-2 px-5 bg-emerald-600 hover:bg-emerald-700"
                                >
                                  {processingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                  موافقة تنفيذ
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => openRejectionDialog(r.id)}
                                  disabled={processingId === r.id}
                                  className="rounded-xl font-bold gap-2 px-5 border-rose-200 text-rose-600 hover:bg-rose-50"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  رفض الطلب
                                </Button>
                              </div>
                            ) : r.status === "PENDING" ? (
                              <p className="text-xs text-amber-600 font-bold bg-amber-50 rounded-lg p-2 mt-2 w-fit">
                                في انتظار مراجعة المدير...
                              </p>
                            ) : (
                              <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                                {r.status === "APPROVED" ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                )}
                                بواسطة {r.approver?.username}
                                {r.reason && <span> - السبب: {r.reason}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </>
            )}
            
            {activeTab === "notifications" && notifications.length > 0 && (
              <CardFooter className="bg-slate-50/30 dark:bg-slate-800/20 border-t border-slate-100 dark:divide-slate-800 py-4 justify-center">
                 <p className="text-xs text-slate-400 text-center flex items-center gap-2 font-medium">
                   التنبيهات يتم أرشفتها تلقائياً بعد مرور فترة زمنية محددة.
                 </p>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">رفض الطلب</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              يرجى إدخال سبب الرفض (اختياري). هذا السبب سيظهر للموظف الذي قام بالطلب.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="اكتب سبب الرفض هنا..."
              className="min-h-[100px] rounded-xl border-slate-200 dark:border-slate-800 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectionDialogOpen(false)}
              className="flex-1 rounded-xl font-bold border-slate-200"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={() => currentRequestToReject && handleReject(currentRequestToReject)}
              disabled={processingId !== null}
              className="flex-1 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              {processingId !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الرفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
