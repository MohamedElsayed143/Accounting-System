"use server";

import { prisma } from "@/lib/prisma";
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

  // Admins see their own targeted notifications + global alerts. Workers see only theirs.
  const where = session.user.role === "ADMIN" 
    ? { OR: [{ userId: session.userId }, { userId: null }] } 
    : { userId: session.userId };

  return (prisma as any).notification.findMany({
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

  const where = session.user.role === "ADMIN" 
    ? { isRead: false } 
    : { isRead: false, userId: session.userId };

  const notificationsCount = await (prisma as any).notification.count({
    where,
  });

  // Only admins see the requests count in their badge
  const requestsCount = session.user.role === "ADMIN" 
    ? await (prisma as any).treasuryActionRequest.count({ where: { status: "PENDING" } })
    : 0;

  return notificationsCount + requestsCount;
}

export async function markAsRead(id: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await (prisma as any).notification.update({
    where: { id },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
  revalidatePath("/");
}

export async function markAllAsRead() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const where = session.user.role === "ADMIN" 
    ? { isRead: false } 
    : { isRead: false, userId: session.userId };

  await (prisma as any).notification.updateMany({
    where,
    data: { isRead: true },
  });

  revalidatePath("/notifications");
  revalidatePath("/");
}

export async function deleteNotification(id: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await (prisma as any).notification.delete({
    where: { id },
  });

  revalidatePath("/notifications");
}

export async function getTreasuryRequests() {
  const session = await getSession();
  if (!session) return [];

  const where = session.user.role === "ADMIN" 
    ? {} 
    : { requesterId: session.userId };

  return (prisma as any).treasuryActionRequest.findMany({
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

  const request = await (prisma as any).treasuryActionRequest.findUnique({
    where: { id },
  });

  if (!request || request.status !== "PENDING") {
    throw new Error("طلب غير صالح أو معالج بالفعل");
  }

  const data = JSON.parse(JSON.stringify(request.data));

  // Execute the actual action based on type
  // This will be implemented by calling the specific actions with a skip flag
  // For now, we'll mark it as approved. The actual balance logic 
  // needs to be called here or in a centralized service.
  
  // We will dynamic import the actions to avoid circular dependencies
  try {
    if (request.type === "TRANSFER") {
      const { createTransfer } = await import("../treasury/transfers/actions");
      await createTransfer(data, true); // true = skipApprovalCheck
    } else if (request.type === "CREATE_SAFE") {
      const { createSafe } = await import("../treasury/actions");
      await createSafe(data, true);
    } else if (request.type === "CREATE_BANK") {
      const { createBank } = await import("../treasury/actions");
      await createBank(data, true);
    } else if (request.type === "RECEIPT_VOUCHER") {
      const { createReceiptVoucher } = await import("../treasury/actions");
      await createReceiptVoucher(data, true);
    } else if (request.type === "PAYMENT_VOUCHER") {
      const { createPaymentVoucher } = await import("../treasury/payment-voucher/actions");
      await createPaymentVoucher(data, true);
    }

    await (prisma as any).treasuryActionRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        approverId: session.userId,
      },
    });

    const { createNotification } = await import("@/lib/notifications");
    // Notify the worker (existing)
    await createNotification({
      title: "تمت الموافقة على طلبك",
      message: `تمت الموافقة على طلبك: ${request.type}`,
      type: "SUCCESS",
      userId: request.requesterId,
    });

    // Notify the manager (the one who approved it or all admins? usually the one who performed it)
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

  const request = await (prisma as any).treasuryActionRequest.findUnique({
    where: { id },
  });

  if (!request) throw new Error("Request not found");

  await (prisma as any).treasuryActionRequest.update({
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
