"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";

export async function getSessionRole() {
  const session = await getSession();
  return session?.user?.role || "WORKER";
}

export async function getNotifications() {
  const session = await getSession();
  if (!session) return [];

  const { checkDueDates } = await import("@/lib/notifications");
  // Only admins trigger the background check logic
  if (session.user.role === "ADMIN") {
    await checkDueDates();
  }

  const db = (await getTenantPrisma()) as any;
  // Admins see their own targeted notifications + global alerts. Workers see only theirs.
  const where =
    session.user.role === "ADMIN"
      ? { OR: [{ userId: session.userId }, { userId: null }] }
      : { userId: session.userId };

  return db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUnreadNotificationsCount() {
  const session = await getSession();
  if (!session) return 0;

  const { checkDueDates } = await import("@/lib/notifications");
  if (session.user.role === "ADMIN") {
    await checkDueDates();
  }

  const db = (await getTenantPrisma()) as any;
  const where =
    session.user.role === "ADMIN"
      ? { isRead: false, OR: [{ userId: session.userId }, { userId: null }] }
      : { isRead: false, userId: session.userId };

  const notificationsCount = await db.notification.count({
    where,
  });

  // Only admins see the requests count in their badge
  const requestsCount =
    session.user.role === "ADMIN"
      ? await ((await getTenantPrisma()) as any).treasuryActionRequest.count({
          where: { status: "PENDING" },
        })
      : 0;

  return notificationsCount + requestsCount;
}

export async function markAsRead(id: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await ((await getTenantPrisma()) as any).notification.update({
    where: { id },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
  revalidatePath("/");
}

export async function markAllAsRead() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const where =
    session.user.role === "ADMIN"
      ? { isRead: false }
      : { isRead: false, userId: session.userId };

  await ((await getTenantPrisma()) as any).notification.updateMany({
    where,
    data: { isRead: true },
  });

  revalidatePath("/notifications");
  revalidatePath("/");
}

export async function deleteNotification(id: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await ((await getTenantPrisma()) as any).notification.delete({
    where: { id },
  });

  revalidatePath("/notifications");
}

export async function getTreasuryRequests() {
  const session = await getSession();
  if (!session) return [];

  const where =
    session.user.role === "ADMIN" ? {} : { requesterId: session.userId };

  return ((await getTenantPrisma()) as any).treasuryActionRequest.findMany({
    where,
    include: {
      requester: { select: { username: true } },
      approver: { select: { username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function approveTreasuryRequest(id: number) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const request = await (
    (await getTenantPrisma()) as any
  ).treasuryActionRequest.findUnique({
    where: { id },
  });

  if (!request || request.status !== "PENDING") {
    throw new Error("طلب غير صالح أو معالج بالفعل");
  }

  // ✅ التحقق من وجود البيانات
  if (!request.data) {
    throw new Error("بيانات الطلب غير موجودة");
  }

  // عمل نسخة عميقة من البيانات
  const data = JSON.parse(JSON.stringify(request.data));

  try {
    let result: any;
    if (request.type === "TRANSFER") {
      const { createTransfer } = await import("../treasury/transfers/actions");
      const transferData = {
        ...data,
        transferNumber: "",
      };
      // createTransfer might throw or return result
      result = await createTransfer(transferData, true);
    } else if (request.type === "CREATE_SAFE") {
      const { createSafe } = await import("../treasury/actions");
      result = await createSafe(data, true);
    } else if (request.type === "CREATE_BANK") {
      const { createBank } = await import("../treasury/actions");
      result = await createBank(data, true);
    } else if (request.type === "RECEIPT_VOUCHER") {
      const { createReceiptVoucher } = await import("../treasury/actions");
      result = await createReceiptVoucher({ ...data, voucherNumber: "" }, true);
    } else if (request.type === "PAYMENT_VOUCHER") {
      const { createPaymentVoucher } = await import("../treasury/payment-voucher/actions");
      result = await createPaymentVoucher({ ...data, voucherNumber: "" }, true);
    } else {
      throw new Error(`نوع الطلب غير معروف: ${request.type}`);
    }

    // ✅ التحقق من نجاح العملية المنفذة
    if (result && typeof result === 'object' && result.success === false) {
      throw new Error(result.error || "فشل تنفيذ العملية برغم الموافقة عليها");
    }

    // تحديث حالة الطلب
    await ((await getTenantPrisma()) as any).treasuryActionRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        approverId: session.userId,
      },
    });

    const { createNotification } = await import("@/lib/notifications");
    await createNotification({
      title: "تمت الموافقة على طلبك",
      message: `تمت الموافقة على طلبك: ${request.type}`,
      type: "SUCCESS",
      userId: request.requesterId,
    });

    await createNotification({
      title: "تم تنفيذ العملية",
      message: `تم تنفيذ طلب الـ ${request.type} الخاص بـ ${request.requester?.username || "موظف"}`,
      type: "SUCCESS",
      userId: session.userId,
    });

    revalidatePath("/notifications");
    revalidatePath("/treasury");
    return { success: true };
  } catch (error: any) {
    console.error("Approval error:", error);
    throw new Error(error.message || "فشل تنفيذ الطلب");
  }
}

export async function rejectTreasuryRequest(id: number, reason?: string) {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const request = await (
    (await getTenantPrisma()) as any
  ).treasuryActionRequest.findUnique({
    where: { id },
  });

  if (!request) throw new Error("Request not found");

  await ((await getTenantPrisma()) as any).treasuryActionRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reason,
      approverId: session.userId,
    },
  });

  const { createNotification } = await import("@/lib/notifications");
  await createNotification({
    title: "تم رفض طلبك",
    message: `تم رفض طلبك: ${request.type}. السبب: ${reason || "لم يذكر المدير سبباً."}`,
    type: "ERROR",
    userId: request.requesterId,
  });

  revalidatePath("/notifications");
  return { success: true };
}
