"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
  isPrimary: boolean;
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
    where: { isPrimary: true }
  });
  
  if (!safe) {
    // If not found by flag, try by name for backward compatibility
    const oldMain = await prisma.treasurySafe.findFirst({
      where: { name: "الخزنة الرئيسية" }
    });

    if (oldMain) {
      return await prisma.treasurySafe.update({
        where: { id: oldMain.id },
        data: { isPrimary: true }
      });
    }

    // If still not found, create it
    return await prisma.treasurySafe.create({
      data: {
        name: "الخزنة الرئيسية",
        balance: 0,
        description: "الخزنة الثابتة للنظام",
        isPrimary: true,
      }
    });
  }
  
  return safe;
}

// 1. جلب بيانات الخزنة الرئيسية (البنوك النشطة فقط)
export async function getTreasuryData() {
  const [safes, banks, recentReceipts, recentPayments, recentSalesInvoices, recentPurchaseInvoices, recentSalesReturns, recentPurchaseReturns, recentTransfers] = await Promise.all([
    prisma.treasurySafe.findMany({ 
      where: { isActive: true },
      orderBy: { createdAt: 'desc' } 
    }),
    prisma.treasuryBank.findMany({ 
      where: { isActive: true }, // البنوك النشطة فقط
      orderBy: { createdAt: 'desc' } 
    }),
    prisma.receiptVoucher.findMany({
      take: 20,
      orderBy: { date: 'desc' },
      include: {
        customer: { select: { name: true } },
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    prisma.paymentVoucher.findMany({
      take: 20,
      orderBy: { date: 'desc' },
      include: {
        supplier: { select: { name: true } },
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    prisma.salesInvoice.findMany({
      where: { status: 'cash' },
      take: 20,
      orderBy: { invoiceDate: 'desc' },
      include: {
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    prisma.purchaseInvoice.findMany({
      where: { status: 'cash' },
      take: 20,
      orderBy: { invoiceDate: 'desc' },
      include: {
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    prisma.salesReturn.findMany({
      where: { refundMethod: { in: ['cash', 'safe', 'bank'] } },
      take: 20,
      orderBy: { returnDate: 'desc' },
      include: {
        customer: { select: { name: true } },
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    prisma.purchaseReturn.findMany({
      where: { refundMethod: { in: ['cash', 'safe', 'bank'] } },
      take: 20,
      orderBy: { returnDate: 'desc' },
      include: {
        supplier: { select: { name: true } },
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    prisma.treasuryTransfer.findMany({
      take: 20,
      orderBy: { date: 'desc' },
      include: {
        fromSafe: { select: { name: true } },
        fromBank: { select: { name: true } },
        toSafe: { select: { name: true } },
        toBank: { select: { name: true } },
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
      isPrimary: s.isPrimary,
      accountNumber: null,
      branch: null
    })),
    ...banks.map(b => ({ 
      id: b.id, 
      name: b.name, 
      type: "bank" as const, 
      balance: b.balance,
      isPrimary: false,
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
      date: p.date,
      partyName: p.supplier.name,
      accountName: p.safe?.name || p.bank?.name || '',
      description: p.description,
      createdAt: p.createdAt,
    })),
    ...recentReceipts.map(r => ({
      id: `r-${r.id}`,
      type: 'receipt' as const,
      voucherNumber: r.voucherNumber,
      amount: r.amount,
      date: r.date,
      partyName: r.customer.name,
      accountName: r.safe?.name || r.bank?.name || '',
      description: r.description,
      createdAt: r.createdAt,
    })),
    ...recentSalesInvoices.map(s => ({
      id: `si-${s.id}`,
      type: 'sales-invoice' as const,
      voucherNumber: `INV-${s.invoiceNumber}`,
      amount: s.total,
      date: s.invoiceDate,
      partyName: s.customerName,
      accountName: s.safe?.name || s.bank?.name || '',
      description: s.description,
      createdAt: s.createdAt,
    })),
    ...recentPurchaseInvoices.map(p => ({
      id: `pi-${p.id}`,
      type: 'purchase-invoice' as const,
      voucherNumber: `PUR-${p.invoiceNumber}`,
      amount: p.total,
      date: p.invoiceDate,
      partyName: p.supplierName,
      accountName: p.safe?.name || p.bank?.name || '',
      description: p.description,
      createdAt: p.createdAt,
    })),
    ...recentSalesReturns.map(sr => ({
      id: `sr-${sr.id}`,
      type: 'sales-return' as const,
      voucherNumber: `SR-${sr.returnNumber}`,
      amount: sr.total,
      date: sr.returnDate,
      partyName: sr.customer.name,
      accountName: sr.safe?.name || sr.bank?.name || '',
      description: sr.reason || sr.description,
      createdAt: sr.createdAt,
    })),
    ...recentPurchaseReturns.map(pr => ({
      id: `pr-${pr.id}`,
      type: 'purchase-return' as const,
      voucherNumber: `PR-${pr.returnNumber}`,
      amount: pr.total,
      date: pr.returnDate,
      partyName: pr.supplier.name,
      accountName: pr.safe?.name || pr.bank?.name || '',
      description: pr.reason || pr.description,
      createdAt: pr.createdAt,
    })),
    ...recentTransfers.map(tr => ({
      id: `tr-${tr.id}`,
      type: 'transfer' as any, // We can handle this in UI later or use payment/receipt
      voucherNumber: tr.transferNumber,
      amount: tr.amount,
      date: tr.date,
      partyName: `${tr.fromSafe?.name || tr.fromBank?.name} ⬅️ ${tr.toSafe?.name || tr.toBank?.name}`,
      accountName: 'تحويل',
      description: tr.description || 'تحويل رصيد',
      createdAt: tr.createdAt,
    })),
  ]
  .sort((a, b) => {
    const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  })
  .slice(0, 15);

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
        isActive: true, // البنك الجديد نشط افتراضياً
      },
    });
    revalidatePath("/treasury");
    return { success: true };
  } catch (error) {
    console.error("Error creating bank:", error);
    return { success: false, error: "فشل في إضافة البنك" };
  }
}

// 3. أرشفة بنك (بدل الحذف)
export async function archiveBank(bankId: number) {
  try {
    console.log("Archiving bank:", bankId);
    
    // تحقق من وجود البنك
    const bank = await prisma.treasuryBank.findUnique({
      where: { id: bankId }
    });

    if (!bank) {
      return { success: false, error: "البنك غير موجود" };
    }

    // تحقق من وجود معاملات مرتبطة
    const relatedVouchers = await prisma.paymentVoucher.count({
      where: { bankId }
    });

    const relatedReceipts = await prisma.receiptVoucher.count({
      where: { bankId }
    });

    const hasTransactions = relatedVouchers > 0 || relatedReceipts > 0;

    if (!hasTransactions) {
      // لو مفيش معاملات، اقدر أحذفه فعلاً
      await prisma.treasuryBank.delete({
        where: { id: bankId }
      });
      
      revalidatePath("/treasury");
      return { 
        success: true, 
        message: "تم حذف البنك نهائياً",
        deleted: true 
      };
    } else {
      // لو في معاملات، اعمل أرشفة
      await prisma.treasuryBank.update({
        where: { id: bankId },
        data: { isActive: false }
      });
      
      revalidatePath("/treasury");
      return { 
        success: true, 
        message: "تم أرشفة البنك وإخفاؤه من القائمة مع الاحتفاظ بالمعاملات",
        archived: true,
        transactionsCount: relatedVouchers + relatedReceipts
      };
    }
  } catch (error) {
    console.error("Error archiving bank:", error);
    return { success: false, error: "فشل في أرشفة البنك" };
  }
}

// 4. جلب البيانات الأولية لسند الصرف (البنوك والخزائن النشطة فقط)
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
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, balance: true }
      }),
      prisma.treasuryBank.findMany({ 
        where: { isActive: true }, // البنوك النشطة فقط
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

// 5. إنشاء سند صرف
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

    const amountFloat = typeof amount === "string" ? parseFloat(amount) : amount;
    
    let idInt: number | null = null;
    if (accountId !== undefined && accountId !== null && accountId !== "") {
      if (typeof accountId === "string") {
        idInt = parseInt(accountId);
      } else {
        idInt = accountId;
      }
    }
    
    let suppIdInt: number | null = null;
    if (supplierId !== undefined && supplierId !== null && supplierId !== "") {
      if (typeof supplierId === "string") {
        suppIdInt = parseInt(supplierId);
      } else {
        suppIdInt = supplierId;
      }
    }

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

    const result = await prisma.$transaction(async (tx) => {
      
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

    revalidatePath("/treasury");
    revalidatePath(`/treasury/${idInt}?type=${accountType}`);
    
    return { success: true, data: result };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "وقع خطأ غير معروف";
    console.error("Voucher creation error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

// 6. جلب تفاصيل حساب معين
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
          },
          salesInvoices: {
            where: { status: 'cash' },
            orderBy: { invoiceDate: 'desc' }
          },
          purchaseInvoices: {
            where: { status: 'cash' },
            orderBy: { invoiceDate: 'desc' }
          },
          salesReturns: {
            where: { refundMethod: { in: ['cash', 'safe'] } },
            include: { customer: { select: { name: true } } },
            orderBy: { returnDate: 'desc' }
          },
          purchaseReturns: {
            where: { refundMethod: { in: ['cash', 'safe'] } },
            include: { supplier: { select: { name: true } } },
            orderBy: { returnDate: 'desc' }
          },
          transfersFrom: {
            include: { toSafe: true, toBank: true },
            orderBy: { date: 'desc' }
          },
          transfersTo: {
            include: { fromSafe: true, fromBank: true },
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
        ...safe.salesInvoices.map(v => ({
          id: `si-${v.id}`,
          type: 'sales-invoice' as const,
          voucherNumber: `INV-${v.invoiceNumber}`,
          amount: v.total,
          date: v.invoiceDate,
          partyName: v.customerName,
          description: v.description,
        })),
        ...safe.purchaseInvoices.map(v => ({
          id: `pi-${v.id}`,
          type: 'purchase-invoice' as const,
          voucherNumber: `PUR-${v.invoiceNumber}`,
          amount: v.total,
          date: v.invoiceDate,
          partyName: v.supplierName,
          description: v.description,
        })),
        ...safe.salesReturns.map(v => ({
          id: `sr-${v.id}`,
          type: 'sales-return' as const,
          voucherNumber: `SR-${v.returnNumber}`,
          amount: v.total,
          date: v.returnDate,
          partyName: v.customer.name,
          description: v.reason || v.description,
        })),
        ...safe.purchaseReturns.map(v => ({
          id: `pr-${v.id}`,
          type: 'purchase-return' as const,
          voucherNumber: `PR-${v.returnNumber}`,
          amount: v.total,
          date: v.returnDate,
          partyName: v.supplier.name,
          description: v.reason || v.description,
        })),
        ...safe.transfersFrom.map(v => ({
          id: `tr-out-${v.id}`,
          type: 'payment' as const, // Use payment for outflow
          voucherNumber: v.transferNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.toSafe?.name || v.toBank?.name || 'حساب آخر',
          description: v.description || 'تحويل صادر',
        })),
        ...safe.transfersTo.map(v => ({
          id: `tr-in-${v.id}`,
          type: 'receipt' as const, // Use receipt for inflow
          voucherNumber: v.transferNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.fromSafe?.name || v.fromBank?.name || 'حساب آخر',
          description: v.description || 'تحويل وارد',
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
          },
          salesInvoices: {
            where: { status: 'cash' },
            orderBy: { invoiceDate: 'desc' }
          },
          purchaseInvoices: {
            where: { status: 'cash' },
            orderBy: { invoiceDate: 'desc' }
          },
          salesReturns: {
            where: { refundMethod: 'bank' },
            include: { customer: { select: { name: true } } },
            orderBy: { returnDate: 'desc' }
          },
          purchaseReturns: {
            where: { refundMethod: 'bank' },
            include: { supplier: { select: { name: true } } },
            orderBy: { returnDate: 'desc' }
          },
          transfersFrom: {
            include: { toSafe: true, toBank: true },
            orderBy: { date: 'desc' }
          },
          transfersTo: {
            include: { fromSafe: true, fromBank: true },
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
        ...bank.salesInvoices.map(v => ({
          id: `si-${v.id}`,
          type: 'sales-invoice' as const,
          voucherNumber: `INV-${v.invoiceNumber}`,
          amount: v.total,
          date: v.invoiceDate,
          partyName: v.customerName,
          description: v.description,
        })),
        ...bank.purchaseInvoices.map(v => ({
          id: `pi-${v.id}`,
          type: 'purchase-invoice' as const,
          voucherNumber: `PUR-${v.invoiceNumber}`,
          amount: v.total,
          date: v.invoiceDate,
          partyName: v.supplierName,
          description: v.description,
        })),
        ...bank.salesReturns.map(v => ({
          id: `sr-${v.id}`,
          type: 'sales-return' as const,
          voucherNumber: `SR-${v.returnNumber}`,
          amount: v.total,
          date: v.returnDate,
          partyName: v.customer.name,
          description: v.reason || v.description,
        })),
        ...bank.purchaseReturns.map(v => ({
          id: `pr-${v.id}`,
          type: 'purchase-return' as const,
          voucherNumber: `PR-${v.returnNumber}`,
          amount: v.total,
          date: v.returnDate,
          partyName: v.supplier.name,
          description: v.reason || v.description,
        })),
        ...bank.transfersFrom.map(v => ({
          id: `tr-out-${v.id}`,
          type: 'payment' as const,
          voucherNumber: v.transferNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.toSafe?.name || v.toBank?.name || 'حساب آخر',
          description: v.description || 'تحويل صادر',
        })),
        ...bank.transfersTo.map(v => ({
          id: `tr-in-${v.id}`,
          type: 'receipt' as const,
          voucherNumber: v.transferNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.fromSafe?.name || v.fromBank?.name || 'حساب آخر',
          description: v.description || 'تحويل وارد',
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

// 7. جلب العملاء لسند القبض
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

// 8. إنشاء سند قبض
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

    revalidatePath("/treasury");
    revalidatePath(`/treasury/${accountId}?type=${accountType}`);
    
    return { success: true, data: result };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "وقع خطأ غير معروف";
    console.error("Receipt voucher creation error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

// 10. جلب الحسابات المؤرشفة (بنوك وخزائن)
export async function getArchivedAccounts() {
  try {
    const [banks, safes] = await Promise.all([
      prisma.treasuryBank.findMany({
        where: { isActive: false },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.treasurySafe.findMany({
        where: { isActive: false },
        orderBy: { updatedAt: 'desc' },
      })
    ]);

    return { 
      success: true, 
      banks: banks.map(b => ({ ...b, type: 'bank' as const })), 
      safes: safes.map(s => ({ ...s, type: 'safe' as const })) 
    };
  } catch (error) {
    console.error("Error fetching archived accounts:", error);
    return { success: false, error: "فشل في جلب الحسابات المؤرشفة" };
  }
}

// 11. إرجاع حساب من الأرشيف
export async function restoreAccount(id: number, type: 'safe' | 'bank') {
  try {
    if (type === 'bank') {
      await prisma.treasuryBank.update({
        where: { id },
        data: { isActive: true }
      });
    } else {
      await prisma.treasurySafe.update({
        where: { id },
        data: { isActive: true }
      });
    }

    revalidatePath("/treasury");
    revalidatePath("/treasury/archived");
    
    return { success: true, message: "تم إرجاع الحساب بنجاح" };
  } catch (error) {
    console.error("Error restoring account:", error);
    return { success: false, error: "فشل في إرجاع الحساب" };
  }
}

// 9. جلب بيانات العملاء والحسابات لسند القبض (البنوك والخزائن النشطة فقط)
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
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, balance: true }
      }),
      prisma.treasuryBank.findMany({ 
        where: { isActive: true }, // البنوك النشطة فقط
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

// 12. إنشاء خزنة جديدة
export async function createSafe(data: { name: string; initialBalance: number; description?: string }) {
  try {
    // التحقق من تكرار الاسم
    const existing = await prisma.treasurySafe.findFirst({
      where: { name: data.name }
    });
    if (existing) {
      return { success: false, error: "يوجد خزنة بنفس هذا الاسم بالفعل" };
    }

    await prisma.treasurySafe.create({
      data: {
        name: data.name,
        balance: data.initialBalance || 0,
        description: data.description || "",
        isPrimary: false,
        isActive: true,
      },
    });
    revalidatePath("/treasury");
    return { success: true };
  } catch (error) {
    console.error("Error creating safe:", error);
    return { success: false, error: "فشل في إضافة الخزنة" };
  }
}

// 13. أرشفة خزنة
export async function archiveSafe(safeId: number) {
  try {
    const safe = await prisma.treasurySafe.findUnique({
      where: { id: safeId }
    });

    if (!safe) return { success: false, error: "الخزنة غير موجودة" };
    if (safe.isPrimary) return { success: false, error: "لا يمكن أرشفة الخزنة الرئيسية" };

    // تحقق من وجود معاملات
    const relatedVouchers = await prisma.paymentVoucher.count({ where: { safeId } });
    const relatedReceipts = await prisma.receiptVoucher.count({ where: { safeId } });
    
    const hasTransactions = relatedVouchers > 0 || relatedReceipts > 0;

    if (!hasTransactions) {
      await prisma.treasurySafe.delete({ where: { id: safeId } });
      revalidatePath("/treasury");
      return { success: true, message: "تم حذف الخزنة نهائياً", deleted: true };
    } else {
      await prisma.treasurySafe.update({
        where: { id: safeId },
        data: { isActive: false }
      });
      revalidatePath("/treasury");
      return { success: true, message: "تم أرشفة الخزنة", archived: true };
    }
  } catch (error) {
    console.error("Error archiving safe:", error);
    return { success: false, error: "فشل في أرشفة الخزنة" };
  }
}
export async function getBanks(activeOnly: boolean = true) {
  try {
    const banks = await prisma.treasuryBank.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
    return banks;
  } catch (error) {
    console.error("Error fetching banks:", error);
    return [];
  }
}
