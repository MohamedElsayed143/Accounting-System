"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { triggerTreasuryAlert, triggerStaffActivityAlert } from "@/lib/notifications";
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

async function generateTransferNumber(tx: Prisma.TransactionClient): Promise<string> {
  const nextVal = await SequenceService.getNextSequenceValue(tx, "TreasuryTransfer");
  return `TRF-${nextVal}`;
}

export async function createTransfer(data: TransferInput, skipApproval: boolean = false) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Approval Interception
  if (!skipApproval) {
    const db = await getTenantPrisma();
    const settings = await (db as any).generalSettings.findUnique({ where: { id: 1 } });
    if (session.user.role === "WORKER" && (settings as any)?.requireApprovalForTransfers) {
      await (db as any).treasuryActionRequest.create({
        data: {
          type: "TRANSFER",
          data: data as any,
          requesterId: session.userId,
          status: "PENDING",
        },
      });
      return { success: true, pending: true, message: "تم إرسال طلب التحويل للمدير للموافقة" };
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

  const res = await (await getTenantPrisma()).$transaction(async (tx) => {
    // 1. التحقق من رصيد المصدر
    if (data.fromType === "safe") {
      const safe = await tx.treasurySafe.findUnique({
        where: { id: data.fromId },
        select: { balance: true, name: true }
      });
      if (!safe) throw new Error("الخزنة المصدر غير موجودة");
      if (safe.balance < data.amount) throw new Error(`رصيد ${safe.name} غير كافٍ`);
      
      // خصم من المصدر
      await tx.treasurySafe.update({
        where: { id: data.fromId },
        data: { balance: { decrement: data.amount } }
      });
    } else {
      const bank = await tx.treasuryBank.findUnique({
        where: { id: data.fromId },
        select: { balance: true, name: true }
      });
      if (!bank) throw new Error("البنك المصدر غير موجود");
      if (bank.balance < data.amount) throw new Error(`رصيد ${bank.name} غير كافٍ`);

      // خصم من المصدر
      await tx.treasuryBank.update({
        where: { id: data.fromId },
        data: { balance: { decrement: data.amount } }
      });
    }

    // 2. زيادة رصيد الوجهة
    if (data.toType === "safe") {
      await tx.treasurySafe.update({
        where: { id: data.toId },
        data: { balance: { increment: data.amount } }
      });
    } else {
      await tx.treasuryBank.update({
        where: { id: data.toId },
        data: { balance: { increment: data.amount } }
      });
    }

    // 3. تسجيل عملية التحويل والمعالجة المحاسبية
    let transferNumber = data.transferNumber;
    if (!transferNumber || transferNumber === "TRF-0" || transferNumber === "") {
      transferNumber = await generateTransferNumber(tx);
    } else {
      // Ensuring the sequence is updated if a manual number is provided
      // or at least checking for collision (though create will fail anyway)
      const existing = await tx.treasuryTransfer.findUnique({
        where: { transferNumber },
      });
      if (existing) throw new Error(`رقم التحويل ${transferNumber} مستخدم مسبقاً`);
    }

    const result = await tx.treasuryTransfer.create({
      data: {
        transferNumber,
        date: new Date(data.date),
        amount: data.amount,
        description: data.description,
        fromType: data.fromType,
        fromSafeId: data.fromType === "safe" ? data.fromId : null,
        fromBankId: data.fromType === "bank" ? data.fromId : null,
        toType: data.toType,
        toSafeId: data.toType === "safe" ? data.toId : null,
        toBankId: data.toType === "bank" ? data.toId : null,
      }
    });

    // 4. الحصول على أرقام الحسابات المحاسبية للتحويل
    const fromAccount = data.fromType === "safe" 
      ? await tx.treasurySafe.findUnique({ where: { id: data.fromId }, select: { accountId: true, name: true, balance: true } })
      : await tx.treasuryBank.findUnique({ where: { id: data.fromId }, select: { accountId: true, name: true, balance: true } });
    
    const toAccount = data.toType === "safe"
      ? await tx.treasurySafe.findUnique({ where: { id: data.toId }, select: { accountId: true, name: true, balance: true } })
      : await tx.treasuryBank.findUnique({ where: { id: data.toId }, select: { accountId: true, name: true, balance: true } });

    if (fromAccount?.accountId && toAccount?.accountId) {
      const entryNumber = await SequenceService.getNextSequenceValue(tx, "JournalEntry");

      await tx.journalEntry.create({
        data: {
          entryNumber,
          date: new Date(data.date),
          description: `تحويل #${result.transferNumber} من ${fromAccount.name} إلى ${toAccount.name}`,
          sourceType: 'TRANSFER',
          sourceId: result.id,
          items: {
            create: [
              {
                accountId: fromAccount.accountId,
                debit: 0,
                credit: data.amount,
                description: `تحويل صادر`
              },
              {
                accountId: toAccount.accountId,
                debit: data.amount,
                credit: 0,
                description: `تحويل وارد`
              }
            ]
          }
        }
      });
    }

    return {
      transfer: result,
      fromName: fromAccount,
      toName: toAccount
    };
  });

  // Fire alerts outside transaction
  if (res.fromName) await triggerTreasuryAlert(res.fromName.name, res.fromName.balance);
  if (res.toName) await triggerTreasuryAlert(res.toName.name, res.toName.balance);

  if (session) {
    const fromName = res.fromName?.name || "حساب مجهول";
    const toName = res.toName?.name || "حساب مجهول";
    await triggerStaffActivityAlert(
      session.user,
      "تحويل خزينة",
      `تم تحويل مبلغ ${res.transfer.amount} من ${fromName} إلى ${toName} (رقم التحويل: ${res.transfer.transferNumber})`
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
  if (sequence) return `TRF-${sequence.lastValue + 1}`;

  const last = await (await getTenantPrisma()).treasuryTransfer.findFirst({
    orderBy: { id: "desc" },
    select: { transferNumber: true }
  });

  if (!last) return "TRF-1";
  
  const lastNum = parseInt(last.transferNumber.split("-")[1] || "0");
  return `TRF-${lastNum + 1}`;
}
