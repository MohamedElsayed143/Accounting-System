"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// تعريف الأنواع
export interface TreasuryStats {
  totalAccounts: number;
  totalBanksBalance: number;
  totalSafeBalance: number;
  grandTotal: number;
}

export interface AccountSummary {
  id: number;
  name: string;
  type: "safe" | "bank";
  balance: number;
  accountNumber?: string | null;
  branch?: string | null;
}

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
  suppliers: { id: number; name: string; code: number | null }[];
  safes: { id: number; name: string; balance: number }[];
  banks: { id: number; name: string; balance: number }[];
}

// دالة مساعدة للتأكد من وجود الخزنة الرئيسية
async function ensureMainSafe() {
  const safe = await prisma.treasurySafe.findFirst({
    where: { name: "الخزنة الرئيسية" }
  });
  
  if (!safe) {
    // لو مش موجودة، أنشئها
    return await prisma.treasurySafe.create({
      data: {
        name: "الخزنة الرئيسية",
        balance: 0,
        description: "الخزنة الثابتة للنظام",
      }
    });
  }
  
  return safe;
}


// 9. حذف بنك
export async function deleteBank(bankId: number) {
  try {
    // تحقق من وجود سندات مرتبطة بالبنك
    const relatedVouchers = await prisma.paymentVoucher.count({
      where: { bankId }
    });

    const relatedReceipts = await prisma.receiptVoucher.count({
      where: { bankId }
    });

    if (relatedVouchers > 0 || relatedReceipts > 0) {
      return { 
        success: false, 
        error: "لا يمكن حذف البنك لوجود معاملات مرتبطة به" 
      };
    }

    await prisma.treasuryBank.delete({
      where: { id: bankId }
    });

    revalidatePath("/treasury");
    return { success: true };
  } catch (error) {
    console.error("Error deleting bank:", error);
    return { success: false, error: "فشل في حذف البنك" };
  }
}

// 1. جلب بيانات الخزنة الرئيسية
export async function getTreasuryData() {
  const [safes, banks, recentReceipts, recentPayments] = await Promise.all([
    prisma.treasurySafe.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.treasuryBank.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.receiptVoucher.findMany({
      take: 20, // زودنا العدد عشان نجيب عمليات اكتر ونرتبها صح
      orderBy: { date: 'desc' }, // رتب حسب تاريخ السند مش تاريخ الإنشاء
      include: {
        customer: { select: { name: true } },
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    prisma.paymentVoucher.findMany({
      take: 20,
      orderBy: { date: 'desc' }, // رتب حسب تاريخ السند
      include: {
        supplier: { select: { name: true } },
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
  ]);

  const stats: TreasuryStats = {
    totalAccounts: safes.length + banks.length,
    totalBanksBalance: banks.reduce((sum, b) => sum + b.balance, 0),
    totalSafeBalance: safes.reduce((sum, s) => sum + s.balance, 0),
    grandTotal: 0,
  };
  stats.grandTotal = stats.totalBanksBalance + stats.totalSafeBalance;

  const allAccounts: AccountSummary[] = [
    ...safes.map(s => ({ 
      id: s.id, 
      name: s.name, 
      type: "safe" as const, 
      balance: s.balance,
      accountNumber: null,
      branch: null
    })),
    ...banks.map(b => ({ 
      id: b.id, 
      name: b.name, 
      type: "bank" as const, 
      balance: b.balance,
      accountNumber: b.accountNumber,
      branch: b.branch
    })),
  ];

  // تجميع آخر العمليات وترتيبها حسب تاريخ السند (الأحدث أولاً)
  const recentTransactions = [
    ...recentPayments.map(p => ({
      id: `p-${p.id}`,
      type: 'payment' as const,
      voucherNumber: p.voucherNumber,
      amount: p.amount,
      date: p.date, // هنستخدم تاريخ السند
      partyName: p.supplier.name,
      accountName: p.safe?.name || p.bank?.name || '',
      createdAt: p.createdAt, // احتفظ بتاريخ الإنشاء كـ fallback
    })),
    ...recentReceipts.map(r => ({
      id: `r-${r.id}`,
      type: 'receipt' as const,
      voucherNumber: r.voucherNumber,
      amount: r.amount,
      date: r.date,
      partyName: r.customer.name,
      accountName: r.safe?.name || r.bank?.name || '',
      createdAt: r.createdAt,
    })),
  ]
  // رتب حسب تاريخ السند (الأحدث أولاً)
  // لو تاريخ السند متساوي، استخدم تاريخ الإنشاء
  .sort((a, b) => {
    // قارن تواريخ السند أولاً
    const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    
    // لو تواريخ السند متساوية، استخدم تاريخ الإنشاء
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  })
  .slice(0, 10); // خد بس أحدث 10 عمليات

  return { accounts: allAccounts, stats, recentTransactions };
}

// 2. إنشاء بنك جديد
export async function createBank(data: { name: string; accountNumber: string; branch: string; initialBalance: number }) {
  try {
    await prisma.treasuryBank.create({
      data: {
        name: data.name,
        accountNumber: data.accountNumber || null,
        branch: data.branch || null,
        balance: data.initialBalance || 0,
      },
    });
    revalidatePath("/treasury");
    return { success: true };
  } catch (error) {
    console.error("Error creating bank:", error);
    return { success: false, error: "فشل في إضافة البنك" };
  }
}

// 3. جلب البيانات الأولية لسند الصرف
export async function getInitialData(): Promise<InitialData> {
  try {
    // تأكد من وجود الخزنة الرئيسية
    await ensureMainSafe();
    
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

// 4. إنشاء سند صرف
// 4. إنشاء سند صرف
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

    // تحويل القيم لرقم والتأكد من صحتها
    const amountFloat = typeof amount === "string" ? parseFloat(amount) : amount;
    
    // تحويل accountId لرقم صحيح مع التحقق
    let idInt: number | null = null;
    if (accountId !== undefined && accountId !== null && accountId !== "") {
      if (typeof accountId === "string") {
        idInt = parseInt(accountId);
      } else {
        idInt = accountId;
      }
    }
    
    // تحويل supplierId لرقم صحيح مع التحقق
    let suppIdInt: number | null = null;
    if (supplierId !== undefined && supplierId !== null && supplierId !== "") {
      if (typeof supplierId === "string") {
        suppIdInt = parseInt(supplierId);
      } else {
        suppIdInt = supplierId;
      }
    }

    // التحقق من صحة الأرقام
    if (isNaN(amountFloat) || amountFloat <= 0) {
      throw new Error("المبلغ غير صحيح");
    }
    
    if (idInt === null || isNaN(idInt)) {
      console.error("Invalid accountId:", { accountId, idInt });
      throw new Error("رقم الحساب غير صحيح");
    }
    
    if (suppIdInt === null || isNaN(suppIdInt)) {
      console.error("Invalid supplierId:", { supplierId, suppIdInt });
      throw new Error("رقم المورد غير صحيح");
    }

    console.log("Creating payment voucher with:", {
      accountType,
      idInt,
      suppIdInt,
      amountFloat,
      voucherNumber,
      date
    });

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
          throw new Error(`رصيد الخزنة غير كافٍ (المتاح: ${safe.balance} - المطلوب: ${amountFloat})`);
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
          throw new Error(`رصيد البنك غير كافٍ (المتاح: ${bank.balance} - المطلوب: ${amountFloat})`);
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
        include: {
          supplier: { select: { name: true } },
          safe: { select: { name: true } },
          bank: { select: { name: true } },
        }
      });
    });

    // تحديث الصفحات المرتبطة
    revalidatePath("/treasury");
    revalidatePath(`/treasury/${idInt}?type=${accountType}`);
    
    return { success: true, data: result };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "وقع خطأ غير معروف";
    console.error("Voucher creation error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

// 5. جلب تفاصيل حساب معين (خزنة أو بنك)
export async function getAccountDetails(id: number, type: 'safe' | 'bank') {
  try {
    if (type === 'safe') {
      const safe = await prisma.treasurySafe.findUnique({
        where: { id },
        include: {
          receiptVouchers: {
            include: { customer: { select: { name: true } } },
            orderBy: { date: 'desc' }
          },
          paymentVouchers: {
            include: { supplier: { select: { name: true } } },
            orderBy: { date: 'desc' }
          }
        }
      });

      if (!safe) throw new Error("الخزنة غير موجودة");

      const transactions = [
        ...safe.receiptVouchers.map(v => ({
          id: `r-${v.id}`,
          type: 'receipt' as const,
          voucherNumber: v.voucherNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.customer.name,
          description: v.description,
        })),
        ...safe.paymentVouchers.map(v => ({
          id: `p-${v.id}`,
          type: 'payment' as const,
          voucherNumber: v.voucherNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.supplier.name,
          description: v.description,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        id: safe.id,
        name: safe.name,
        type: 'safe',
        balance: safe.balance,
        createdAt: safe.createdAt,
        updatedAt: safe.updatedAt,
        transactions,
      };
    } else {
      const bank = await prisma.treasuryBank.findUnique({
        where: { id },
        include: {
          receiptVouchers: {
            include: { customer: { select: { name: true } } },
            orderBy: { date: 'desc' }
          },
          paymentVouchers: {
            include: { supplier: { select: { name: true } } },
            orderBy: { date: 'desc' }
          }
        }
      });

      if (!bank) throw new Error("البنك غير موجود");

      const transactions = [
        ...bank.receiptVouchers.map(v => ({
          id: `r-${v.id}`,
          type: 'receipt' as const,
          voucherNumber: v.voucherNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.customer.name,
          description: v.description,
        })),
        ...bank.paymentVouchers.map(v => ({
          id: `p-${v.id}`,
          type: 'payment' as const,
          voucherNumber: v.voucherNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.supplier.name,
          description: v.description,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        id: bank.id,
        name: bank.name,
        type: 'bank',
        balance: bank.balance,
        accountNumber: bank.accountNumber,
        branch: bank.branch,
        createdAt: bank.createdAt,
        updatedAt: bank.updatedAt,
        transactions,
      };
    }
  } catch (error) {
    console.error("Error fetching account details:", error);
    throw error;
  }
}

export type AccountDetails = Awaited<ReturnType<typeof getAccountDetails>>;

// 6. جلب العملاء لسند القبض
export async function getCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true }
    });
    return customers;
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
}

// 7. إنشاء سند قبض
export async function createReceiptVoucher(data: {
  voucherNumber: string;
  date: string;
  amount: number;
  customerId: number;
  accountType: "safe" | "bank";
  accountId: number;
  description?: string;
}) {
  try {
    const {
      voucherNumber,
      date,
      amount,
      customerId,
      accountType,
      accountId,
      description,
    } = data;

    if (amount <= 0) throw new Error("المبلغ غير صحيح");
    if (isNaN(accountId)) throw new Error("رقم الحساب غير صحيح");
    if (isNaN(customerId)) throw new Error("رقم العميل غير صحيح");

    const result = await prisma.$transaction(async (tx) => {
      
      // تحديث الرصيد (زيادة الرصيد لأنها سند قبض)
      if (accountType === "safe") {
        const safe = await tx.treasurySafe.findUnique({ 
          where: { id: accountId } 
        });
        if (!safe) throw new Error("الخزنة غير موجودة");
        
        await tx.treasurySafe.update({
          where: { id: accountId },
          data: { balance: { increment: amount } },
        });
      } else if (accountType === "bank") {
        const bank = await tx.treasuryBank.findUnique({ 
          where: { id: accountId } 
        });
        if (!bank) throw new Error("البنك غير موجود");

        await tx.treasuryBank.update({
          where: { id: accountId },
          data: { balance: { increment: amount } },
        });
      } else {
        throw new Error("نوع الحساب غير معروف");
      }

      // إنشاء سجل السند
      return await tx.receiptVoucher.create({
        data: {
          voucherNumber,
          date: new Date(date),
          amount,
          description: description || "",
          customerId,
          accountType,
          safeId: accountType === "safe" ? accountId : null,
          bankId: accountType === "bank" ? accountId : null,
        },
        include: {
          customer: { select: { name: true } },
          safe: { select: { name: true } },
          bank: { select: { name: true } },
        }
      });
    });

    // تحديث الصفحات المرتبطة
    revalidatePath("/treasury");
revalidatePath(`/treasury/${accountId}?type=${accountType}`);
    
    return { success: true, data: result };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "وقع خطأ غير معروف";
    console.error("Receipt voucher creation error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

// 7. جلب بيانات العملاء والحسابات لسند القبض
export async function getReceiptInitialData() {
  try {
    // تأكد من وجود الخزنة الرئيسية
    await ensureMainSafe();
    
    const [customers, safes, banks] = await Promise.all([
      prisma.customer.findMany({ 
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
    
    return { customers, safes, banks };
  } catch (error) {
    console.error("Error fetching receipt initial data:", error);
    return { customers: [], safes: [], banks: [] };
  }
}