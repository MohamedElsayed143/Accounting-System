"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { triggerTreasuryAlert } from "@/lib/notifications";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

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
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          account: {
            include: {
              journalItems: {
                select: { debit: true, credit: true }
              }
            }
          }
        }
      }),
      prisma.treasuryBank.findMany({ 
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          account: {
            include: {
              journalItems: {
                select: { debit: true, credit: true }
              }
            }
          }
        }
      }),
    ]);

    const processedSafes = safes.map(s => {
      let balance = s.balance;
      if (s.account) {
        const totalDebit = s.account.journalItems.reduce((sum: number, item: { debit: number; credit: number }) => sum + (Number(item.debit) || 0), 0);
        const totalCredit = s.account.journalItems.reduce((sum: number, item: { debit: number; credit: number }) => sum + (Number(item.credit) || 0), 0);
        balance = totalDebit - totalCredit;
      }
      return { id: s.id, name: s.name, balance };
    });

    const processedBanks = banks.map(b => {
      let balance = b.balance;
      if (b.account) {
        const totalDebit = b.account.journalItems.reduce((sum: number, item: { debit: number; credit: number }) => sum + (Number(item.debit) || 0), 0);
        const totalCredit = b.account.journalItems.reduce((sum: number, item: { debit: number; credit: number }) => sum + (Number(item.credit) || 0), 0);
        balance = totalDebit - totalCredit;
      }
      return { id: b.id, name: b.name, balance };
    });
    
    return { suppliers: suppliers as any, safes: processedSafes, banks: processedBanks };
  } catch (error) {
    console.error("Error fetching initial data:", error);
    return { suppliers: [], safes: [], banks: [] };
  }
}

// 2. إنشاء سند صرف وتحديث رصيد الحساب المختار
export async function createPaymentVoucher(data: PaymentVoucherInput, skipApproval: boolean = false) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Approval Interception
  if (!skipApproval) {
    const settings = await (prisma as any).generalSettings.findUnique({ where: { id: 1 } });
    if (session.user.role === "WORKER" && settings?.requireApprovalForVouchers) {
      await (prisma as any).treasuryActionRequest.create({
        data: {
          type: "PAYMENT_VOUCHER",
          data: data as any,
          requesterId: session.userId,
          status: "PENDING",
        },
      });
      return { success: true, pending: true, message: "تم إرسال طلب سند الصرف للمدير للموافقة" };
    }
  }

  const canManage = await hasPermission(session.userId, "treasury_manage");
  if (!canManage) throw new Error("ليس لديك صلاحية إنشاء سندات صرف");

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
      // 1. Get current entry number
      const lastEntry = await tx.journalEntry.findFirst({
        orderBy: { entryNumber: 'desc' },
        select: { entryNumber: true }
      });
      const entryNumber = (lastEntry?.entryNumber || 0) + 1;

      // 2. Find Treasury/Bank Account ID and update balance
      let treasuryAccountId: number;
      if (accountType === "safe") {
        const safe = await tx.treasurySafe.findUnique({ 
          where: { id: idInt },
          select: { accountId: true, name: true, balance: true }
        });
        
        if (!safe) throw new Error(`الخزنة غير موجودة (ID: ${idInt})`);
        if (!safe.accountId) throw new Error("الخزنة غير مربوطة بحساب محاسبي");
        treasuryAccountId = safe.accountId;
        
        if (safe.balance < amountFloat) {
          throw new Error(`رصيد الخزنة غير كافٍ (المتاح: ${safe.balance})`);
        }
        
        await tx.treasurySafe.update({
          where: { id: idInt },
          data: { balance: { decrement: amountFloat } },
        });
      } else {
        const bank = await tx.treasuryBank.findUnique({ 
          where: { id: idInt },
          select: { accountId: true, name: true, balance: true }
        });
        
        if (!bank) throw new Error(`البنك غير موجود (ID: ${idInt})`);
        if (!bank.accountId) throw new Error("البنك غير مربوط بحساب محاسبي");
        treasuryAccountId = bank.accountId;
        
        if (bank.balance < amountFloat) {
          throw new Error(`رصيد البنك غير كافٍ (المتاح: ${bank.balance})`);
        }

        await tx.treasuryBank.update({
          where: { id: idInt },
          data: { balance: { decrement: amountFloat } },
        });
      }

      // 3. Get specifically linked Supplier Account
      const supplier = await tx.supplier.findUnique({
        where: { id: suppIdInt },
        select: { accountId: true, name: true }
      });
      if (!supplier?.accountId) throw new Error("المورد غير مربوط بحساب محاسبي");
      const supplierAccountId = supplier.accountId;

      // 4. Create record for the voucher
      const voucher = await tx.paymentVoucher.create({
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
        include: {
            supplier: { select: { name: true } }
        }
      });

      // 5. Create Journal Entry
      await tx.journalEntry.create({
          data: {
              entryNumber,
              date: new Date(date),
              description: `سند صرف #${voucherNumber} - ${voucher.supplier.name}`,
              sourceType: 'PAYMENT_VOUCHER',
              sourceId: voucher.id,
              items: {
                  create: [
                      {
                          accountId: treasuryAccountId,
                          debit: 0,
                          credit: amountFloat,
                          description: `صرف من ${accountType === 'safe' ? 'الخزينة' : 'البنك'}`
                      },
                      {
                          accountId: supplierAccountId,
                          debit: amountFloat,
                          credit: 0,
                          description: `سداد للمورد: ${voucher.supplier.name}`
                      }
                  ]
              }
          }
      });

      return {
        voucher,
        updatedAccount: (accountType === "safe" ? await tx.treasurySafe.findUnique({ where: { id: idInt }, select: { name: true, balance: true } }) : await tx.treasuryBank.findUnique({ where: { id: idInt }, select: { name: true, balance: true } }))
      };
    });

    // Fire alerts outside transaction
    if (result.updatedAccount) {
      await triggerTreasuryAlert(result.updatedAccount.name, result.updatedAccount.balance);
    }

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