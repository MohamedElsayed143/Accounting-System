"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

export async function createTransfer(data: TransferInput) {
  if (data.fromType === data.toType && data.fromId === data.toId) {
    throw new Error("لا يمكن التحويل لنفس الحساب");
  }

  if (data.amount <= 0) {
    throw new Error("يجب أن يكون المبلغ أكبر من صفر");
  }

  return await prisma.$transaction(async (tx) => {
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

    // 3. تسجيل عملية التحويل
    const transfer = await tx.treasuryTransfer.create({
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

    revalidatePath("/treasury");
    return transfer;
  });
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
