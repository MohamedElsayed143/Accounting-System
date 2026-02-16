"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// تعريف الأنواع
export interface PaymentVoucherInput {
  voucherNumber: string;
  date: string;
  amount: string | number;
  accountType: "safe" | "bank";
  accountId: string | number;
  supplierId: string | number;
  description?: string;
}

export interface InitialData {
  suppliers: { id: number; name: string; code: number }[];
  safes: { id: number; name: string; balance: number }[];
  banks: { id: number; name: string; balance: number }[];
}

// 1. جلب البيانات الأولية
export async function getInitialData(): Promise<InitialData> {
  try {
    const [suppliers, safes, banks] = await Promise.all([
      prisma.supplier.findMany({ 
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true }
      }),
      prisma.treasurySafe.findMany({ 
        orderBy: { name: "asc" },
        select: { id: true, name: true, balance: true }
      }),
      prisma.treasuryBank.findMany({ 
        orderBy: { name: "asc" },
        select: { id: true, name: true, balance: true }
      }),
    ]);
    return { suppliers, safes, banks };
  } catch (error) {
    console.error("Error fetching initial data:", error);
    return { suppliers: [], safes: [], banks: [] };
  }
}

// 2. إنشاء سند صرف وتحديث رصيد الحساب المختار
export async function createPaymentVoucher(data: PaymentVoucherInput) {
  try {
    const {
      voucherNumber,
      date,
      amount,
      accountType,
      accountId,
      supplierId,
      description,
    } = data;

    // التحقق من وجود البيانات المطلوبة
    if (!voucherNumber || !date || !amount || !accountType || !accountId || !supplierId) {
      throw new Error("جميع الحقول المطلوبة يجب أن تكون موجودة");
    }

    // تحويل القيم إلى أرقام
    const amountFloat = typeof amount === "string" ? parseFloat(amount) : amount;
    
    // تحويل accountId مع التحقق
    let idInt: number;
    if (typeof accountId === "string") {
      idInt = parseInt(accountId);
    } else {
      idInt = accountId;
    }
    
    // تحويل supplierId مع التحقق
    let suppIdInt: number;
    if (typeof supplierId === "string") {
      suppIdInt = parseInt(supplierId);
    } else {
      suppIdInt = supplierId;
    }

    // التحقق من صحة الأرقام
    if (isNaN(amountFloat) || amountFloat <= 0) {
      throw new Error("المبلغ غير صحيح");
    }
    
    if (isNaN(idInt) || idInt <= 0) {
      console.error("Invalid accountId:", { accountId, idInt });
      throw new Error("رقم الحساب غير صحيح");
    }
    
    if (isNaN(suppIdInt) || suppIdInt <= 0) {
      console.error("Invalid supplierId:", { supplierId, suppIdInt });
      throw new Error("رقم المورد غير صحيح");
    }

    // تنفيذ المعاملة
    const result = await prisma.$transaction(async (tx) => {
      
      // تحديث الرصيد والتحقق من التوفر
      if (accountType === "safe") {
        const safe = await tx.treasurySafe.findUnique({ 
          where: { id: idInt } 
        });
        
        if (!safe) {
          throw new Error(`الخزنة غير موجودة (ID: ${idInt})`);
        }
        
        if (safe.balance < amountFloat) {
          throw new Error(`رصيد الخزنة غير كافٍ (المتاح: ${safe.balance})`);
        }
        
        await tx.treasurySafe.update({
          where: { id: idInt },
          data: { balance: { decrement: amountFloat } },
        });
      } else if (accountType === "bank") {
        const bank = await tx.treasuryBank.findUnique({ 
          where: { id: idInt } 
        });
        
        if (!bank) {
          throw new Error(`البنك غير موجود (ID: ${idInt})`);
        }
        
        if (bank.balance < amountFloat) {
          throw new Error(`رصيد البنك غير كافٍ (المتاح: ${bank.balance})`);
        }

        await tx.treasuryBank.update({
          where: { id: idInt },
          data: { balance: { decrement: amountFloat } },
        });
      } else {
        throw new Error("نوع الحساب غير معروف");
      }

      // إنشاء سجل السند
      return await tx.paymentVoucher.create({
        data: {
          voucherNumber,
          date: new Date(date),
          amount: amountFloat,
          description: description || "",
          supplierId: suppIdInt,
          accountType,
          safeId: accountType === "safe" ? idInt : null,
          bankId: accountType === "bank" ? idInt : null,
        },
      });
    });

    // تحديث الصفحات المرتبطة - مع التأكد من وجود idInt
    if (idInt && !isNaN(idInt)) {
      revalidatePath("/treasury");
      revalidatePath(`/treasury/${idInt}?type=${accountType}`);
    } else {
      revalidatePath("/treasury");
    }
    
    return { success: true, data: result };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "وقع خطأ غير معروف";
    console.error("Voucher creation error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}