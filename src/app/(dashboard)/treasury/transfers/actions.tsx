"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { triggerTreasuryAlert } from "@/lib/notifications";
import { getSession } from "@/lib/auth";

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

export async function createTransfer(data: TransferInput, skipApproval: boolean = false) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Approval Interception
  if (!skipApproval) {
    const settings = await (prisma as any).generalSettings.findUnique({ where: { id: 1 } });
    if (session.user.role === "WORKER" && (settings as any)?.requireApprovalForTransfers) {
      await (prisma as any).treasuryActionRequest.create({
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

  if (data.fromType === data.toType && data.fromId === data.toId) {
    throw new Error("لا يمكن التحويل لنفس الحساب");
  }

  if (data.amount <= 0) {
    throw new Error("يجب أن يكون المبلغ أكبر من صفر");
  }

  const res = await prisma.$transaction(async (tx) => {
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
    const result = await tx.treasuryTransfer.create({
      data: {
        transferNumber: data.transferNumber,
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
      const lastEntry = await tx.journalEntry.findFirst({
        orderBy: { entryNumber: 'desc' },
        select: { entryNumber: true }
      });
      const entryNumber = (lastEntry?.entryNumber || 0) + 1;

      await tx.journalEntry.create({
        data: {
          entryNumber,
          date: new Date(data.date),
          description: `تحويل من ${fromAccount.name} إلى ${toAccount.name}`,
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

  revalidatePath("/treasury");
  return res.transfer;
}

export async function getNextTransferNumber(): Promise<string> {
  const last = await prisma.treasuryTransfer.findFirst({
    orderBy: { id: "desc" },
    select: { transferNumber: true }
  });

  if (!last) return "TRF-1";
  
  const lastNum = parseInt(last.transferNumber.split("-")[1]);
  return `TRF-${lastNum + 1}`;
}
