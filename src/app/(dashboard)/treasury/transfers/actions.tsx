"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  triggerTreasuryAlert,
  triggerStaffActivityAlert,
} from "@/lib/notifications";
import { getSession } from "@/lib/auth";
import { SequenceService } from "@/lib/services/SequenceService";
import { hasPermission } from "@/lib/permissions";

export interface TransferInput {
  transferNumber: string;
  date: string;
  amount: number;
  description?: string;
  fromType: "safe" | "bank";
  fromId: number;
  toType: "safe" | "bank";
  toId: number;
}

// أضف هذه الدالة في أعلى الملف بعد الـ imports
async function generateUniqueTransferNumber(
  tx: Prisma.TransactionClient,
  retries = 3
): Promise<string> {
  for (let i = 0; i < retries; i++) {
    const nextVal = await SequenceService.getNextSequenceValue(
      tx,
      "TreasuryTransfer"
    );
    const transferNumber = `TRF-${nextVal}`;
    const existing = await tx.treasuryTransfer.findUnique({
      where: { transferNumber },
    });
    if (!existing) return transferNumber;
    // إذا كان الرقم موجوداً بالفعل (نادر جداً)، نستمر في الحلقة
  }
  throw new Error("فشل توليد رقم تحويل فريد بعد عدة محاولات");
}

async function generateTransferNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const nextVal = await SequenceService.getNextSequenceValue(
    tx,
    "TreasuryTransfer",
  );
  return `TRF-${nextVal}`;
}

export async function createTransfer(
  data: TransferInput,
  skipApproval: boolean = false,
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Approval Interception (نفس الكود بدون تغيير)
  if (!skipApproval) {
    try {
      const db = await getTenantPrisma();
      const settings = await (db as any).generalSettings.findFirst();
      if (
        session.user.role === "WORKER" &&
        (settings as any)?.requireApprovalForTransfers
      ) {
        // Sync user to tenant schema
        try {
          await (db as any).user.upsert({
            where: { id: session.userId },
            update: {
              username: session.user.username,
              role: session.user.role,
            },
            create: {
              id: session.userId,
              username: session.user.username,
              password: session.user.password || "",
              role: session.user.role,
              tenantSchema: (session.user as any).tenantSchema,
              parentId: (session.user as any).parentId,
              authorizedDevices: [],
            },
          });
        } catch (syncErr) {
          console.warn("[Transfer] User sync failed:", syncErr);
        }

        await (db as any).treasuryActionRequest.create({
          data: {
            type: "TRANSFER",
            data: data as any,
            requesterId: session.userId,
            status: "PENDING",
          },
        });

        // Notify admin
        try {
          const adminUser = await publicPrisma.user.findFirst({
            where: {
              tenantSchema: (session.user as any).tenantSchema,
              role: "ADMIN",
            },
            select: {
              id: true,
              username: true,
              password: true,
              role: true,
              tenantSchema: true,
              parentId: true,
              authorizedDevices: true,
            },
          });
          if (adminUser) {
            await (db as any).user.upsert({
              where: { id: adminUser.id },
              update: { username: adminUser.username, role: adminUser.role },
              create: {
                id: adminUser.id,
                username: adminUser.username,
                password: adminUser.password || "",
                role: adminUser.role,
                tenantSchema: adminUser.tenantSchema,
                parentId: adminUser.parentId,
                authorizedDevices: adminUser.authorizedDevices || [],
              },
            });
            await (db as any).notification.create({
              data: {
                title: "طلب موافقة: تحويل أموال",
                message: `الموظف "${session.user.username}" يطلب تحويل ${data.amount} ج.م. بين الحسابات. راجع قسم الإشعارات للموافقة.`,
                type: "WARNING",
                userId: adminUser.id,
              },
            });
          }
        } catch (notifErr) {
          console.warn("[Transfer] Admin notification failed:", notifErr);
        }

        return {
          success: true,
          pending: true,
          message: "تم إرسال طلب التحويل للمدير للموافقة",
        };
      }
    } catch (approvalErr: any) {
      console.warn(
        "[Transfer] Approval interception failed:",
        approvalErr?.message,
      );
    }
  }

  const canManage = await hasPermission(session.userId, "treasury_manage");
  if (!canManage) throw new Error("ليس لديك صلاحية إجراء تحويلات بين الخزائن");

  if (data.fromType === data.toType && data.fromId === data.toId) {
    throw new Error("لا يمكن التحويل لنفس الحساب");
  }

  if (data.amount <= 0) {
    throw new Error("يجب أن يكون المبلغ أكبر من صفر");
  }

  // استخدام المعاملة مع إعادة المحاولة في حالة تكرار الرقم
  const res = await (await getTenantPrisma()).$transaction(async (tx) => {
    // 1. التحقق من رصيد المصدر (نفس الكود)
    if (data.fromType === "safe") {
      const safe = await tx.treasurySafe.findUnique({
        where: { id: data.fromId },
        select: { balance: true, name: true },
      });
      if (!safe) throw new Error("الخزنة المصدر غير موجودة");
      if (safe.balance < data.amount)
        throw new Error(`رصيد ${safe.name} غير كافٍ`);
      await tx.treasurySafe.update({
        where: { id: data.fromId },
        data: { balance: { decrement: data.amount } },
      });
    } else {
      const bank = await tx.treasuryBank.findUnique({
        where: { id: data.fromId },
        select: { balance: true, name: true },
      });
      if (!bank) throw new Error("البنك المصدر غير موجود");
      if (bank.balance < data.amount)
        throw new Error(`رصيد ${bank.name} غير كافٍ`);
      await tx.treasuryBank.update({
        where: { id: data.fromId },
        data: { balance: { decrement: data.amount } },
      });
    }

    // 2. زيادة رصيد الوجهة (نفس الكود)
    if (data.toType === "safe") {
      await tx.treasurySafe.update({
        where: { id: data.toId },
        data: { balance: { increment: data.amount } },
      });
    } else {
      await tx.treasuryBank.update({
        where: { id: data.toId },
        data: { balance: { increment: data.amount } },
      });
    }

    // 3. توليد رقم التحويل بشكل آمن
    const transferNumber = data.transferNumber;
    let finalTransferNumber: string;

    if (!transferNumber || transferNumber === "TRF-0" || transferNumber === "") {
      finalTransferNumber = await generateUniqueTransferNumber(tx);
    } else {
      const existing = await tx.treasuryTransfer.findUnique({
        where: { transferNumber },
      });
      if (existing)
        throw new Error(`رقم التحويل ${transferNumber} مستخدم مسبقاً`);
      finalTransferNumber = transferNumber;
    }

    // محاولة الإنشاء مع إعادة المحاولة مرة واحدة في حالة التعارض (حماية إضافية)
    let result;
    try {
      result = await tx.treasuryTransfer.create({
        data: {
          transferNumber: finalTransferNumber,
          date: new Date(data.date),
          amount: data.amount,
          description: data.description,
          fromType: data.fromType,
          fromSafeId: data.fromType === "safe" ? data.fromId : null,
          fromBankId: data.fromType === "bank" ? data.fromId : null,
          toType: data.toType,
          toSafeId: data.toType === "safe" ? data.toId : null,
          toBankId: data.toType === "bank" ? data.toId : null,
        },
      });
    } catch (error: any) {
      // إذا حدث خطأ تكرار الرقم (P2002) رغم التحقق (نادر في حالة التزامن العالي)
      if (error.code === 'P2002' && error.meta?.target?.includes('transferNumber')) {
        const newNumber = await generateUniqueTransferNumber(tx, 1);
        result = await tx.treasuryTransfer.create({
          data: {
            transferNumber: newNumber,
            date: new Date(data.date),
            amount: data.amount,
            description: data.description,
            fromType: data.fromType,
            fromSafeId: data.fromType === "safe" ? data.fromId : null,
            fromBankId: data.fromType === "bank" ? data.fromId : null,
            toType: data.toType,
            toSafeId: data.toType === "safe" ? data.toId : null,
            toBankId: data.toType === "bank" ? data.toId : null,
          },
        });
      } else {
        throw error;
      }
    }

    // 4. الحصول على أرقام الحسابات المحاسبية للتحويل (نفس الكود)
    const fromAccount =
      data.fromType === "safe"
        ? await tx.treasurySafe.findUnique({
            where: { id: data.fromId },
            select: { accountId: true, name: true, balance: true },
          })
        : await tx.treasuryBank.findUnique({
            where: { id: data.fromId },
            select: { accountId: true, name: true, balance: true },
          });

    const toAccount =
      data.toType === "safe"
        ? await tx.treasurySafe.findUnique({
            where: { id: data.toId },
            select: { accountId: true, name: true, balance: true },
          })
        : await tx.treasuryBank.findUnique({
            where: { id: data.toId },
            select: { accountId: true, name: true, balance: true },
          });

    if (fromAccount?.accountId && toAccount?.accountId) {
      const entryNumber = await SequenceService.getNextSequenceValue(
        tx,
        "JournalEntry",
      );

      await tx.journalEntry.create({
        data: {
          entryNumber,
          date: new Date(data.date),
          description: `تحويل #${result.transferNumber} من ${fromAccount.name} إلى ${toAccount.name}`,
          sourceType: "TRANSFER",
          sourceId: result.id,
          items: {
            create: [
              {
                accountId: fromAccount.accountId,
                debit: 0,
                credit: data.amount,
                description: `تحويل صادر`,
              },
              {
                accountId: toAccount.accountId,
                debit: data.amount,
                credit: 0,
                description: `تحويل وارد`,
              },
            ],
          },
        },
      });
    }

    return {
      transfer: result,
      fromName: fromAccount,
      toName: toAccount,
    };
  });

  // Fire alerts outside transaction (نفس الكود)
  if (res.fromName)
    triggerTreasuryAlert(res.fromName.name, res.fromName.balance);
  if (res.toName)
    triggerTreasuryAlert(res.toName.name, res.toName.balance);

  if (session) {
    const fromName = res.fromName?.name || "حساب مجهول";
    const toName = res.toName?.name || "حساب مجهول";
    triggerStaffActivityAlert(
      session.user,
      "تحويل خزينة",
      `تم تحويل مبلغ ${res.transfer.amount} من ${fromName} إلى ${toName} (رقم التحويل: ${res.transfer.transferNumber})`,
    );
  }

  revalidatePath("/treasury");
  return res.transfer;
}

export async function getNextTransferNumber(): Promise<string> {
  const sequence = await (await getTenantPrisma()).systemSequence.findUnique({
    where: { id: "TreasuryTransfer" },
    select: { lastValue: true },
  });
  const nextVal = (sequence?.lastValue ?? 0) + 1;
  return `TRF-${nextVal}`;
}
