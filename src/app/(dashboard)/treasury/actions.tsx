"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { triggerStaffActivityAlert, triggerTreasuryAlert } from "@/lib/notifications";
import { SequenceService } from "@/lib/services/SequenceService";

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
  const safe = await (await getTenantPrisma()).treasurySafe.findFirst({
    where: { isPrimary: true },
    include: { account: true }
  });
  
  if (!safe || !safe.accountId) {
    // ✅ [مصلح] يربط الخزنة بالحساب الطرفي 120101 (الخزينة الرئيسية) لا بالمجموعة 1201
    const result = await (await getTenantPrisma()).$transaction(async (tx) => {
      let existingSafe = await tx.treasurySafe.findFirst({
        where: { OR: [{ isPrimary: true }, { name: "الخزنة الرئيسية" }] }
      });

      // البحث عن الحساب الطرفي الصحيح للخزينة الرئيسية
      let account = await tx.account.findUnique({ where: { code: '120101' } });

      if (!account) {
        // محاولة استخدام مجموعة 1201 كـ parent
        const parent = await tx.account.findUnique({ where: { code: '1201' } });
        if (!parent) throw new Error("حساب النقدية بالخزينة (1201) غير موجود في شجرة الحسابات");
        account = await tx.account.create({
          data: {
            code: '120101',
            name: 'الخزينة الرئيسية',
            nameEn: 'Main Safe Account',
            type: parent.type,
            parentId: parent.id,
            level: parent.level + 1,
            isTerminal: true,
            isSelectable: true,
          }
        });
      }

      if (existingSafe) {
        return await tx.treasurySafe.update({
          where: { id: existingSafe.id },
          data: { isPrimary: true, accountId: account.id }
        });
      }

      return await tx.treasurySafe.create({
        data: {
          name: "الخزنة الرئيسية",
          balance: 0,
          description: "الخزنة الثابتة للنظام",
          isPrimary: true,
          accountId: account.id
        }
      });
    });
    return result;
  }
  
  return safe;
}

// 1. جلب بيانات الخزنة الرئيسية (البنوك النشطة فقط)
export async function getTreasuryData() {
  const session = await getSession();
  if (!session) return { accounts: [], stats: { totalAccounts: 0, totalBanksBalance: 0, totalSafeBalance: 0, grandTotal: 0 }, recentTransactions: [] };

  const canView = await hasPermission(session.userId, "treasury_view");
  if (!canView) return { accounts: [], stats: { totalAccounts: 0, totalBanksBalance: 0, totalSafeBalance: 0, grandTotal: 0 }, recentTransactions: [] };
  
  const [
    safes,
    banks,
    recentReceipts,
    recentPayments,
    recentSalesInvoices,
    recentPurchaseInvoices,
    recentSalesReturns,
    recentPurchaseReturns,
    recentTransfers,
    recentManualEntries,
  ] = await Promise.all([
    (await getTenantPrisma()).treasurySafe.findMany({ 
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
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
    (await getTenantPrisma()).treasuryBank.findMany({ 
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
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
    (await getTenantPrisma()).receiptVoucher.findMany({
      take: 20,
      orderBy: { date: 'desc' },
      include: {
        customer: { select: { name: true } },
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    (await getTenantPrisma()).paymentVoucher.findMany({
      take: 20,
      orderBy: { date: 'desc' },
      include: {
        supplier: { select: { name: true } },
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    (await getTenantPrisma()).salesInvoice.findMany({
      where: { status: 'cash' },
      take: 20,
      orderBy: { invoiceDate: 'desc' },
      include: {
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    (await getTenantPrisma()).purchaseInvoice.findMany({
      where: { status: 'cash' },
      take: 20,
      orderBy: { invoiceDate: 'desc' },
      include: {
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    (await getTenantPrisma()).salesReturn.findMany({
      where: { refundMethod: { in: ['cash', 'safe', 'bank'] } },
      take: 20,
      orderBy: { returnDate: 'desc' },
      include: {
        customer: { select: { name: true } },
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    (await getTenantPrisma()).purchaseReturn.findMany({
      where: { refundMethod: { in: ['cash', 'safe', 'bank'] } },
      take: 20,
      orderBy: { returnDate: 'desc' },
      include: {
        supplier: { select: { name: true } },
        safe: { select: { name: true } },
        bank: { select: { name: true } },
      }
    }),
    (await getTenantPrisma()).treasuryTransfer.findMany({
      take: 20,
      orderBy: { date: "desc" },
      include: {
        fromSafe: { select: { name: true } },
        fromBank: { select: { name: true } },
        toSafe: { select: { name: true } },
        toBank: { select: { name: true } },
      },
    }),
    (await getTenantPrisma()).journalEntry.findMany({
      where: {
        sourceType: "MANUAL",
        items: {
          some: {
            account: {
              OR: [
                { treasurySafe: { isNot: null } },
                { treasuryBank: { isNot: null } },
              ],
            },
          },
        },
      },
      take: 20,
      orderBy: { date: "desc" },
      include: {
        items: {
          include: {
            account: {
              include: {
                treasurySafe: true,
                treasuryBank: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // Process real-time ledger balances
  const processedSafes = safes.map(s => {
    let balance = s.balance;
    if (s.account) {
      const totalDebit = s.account.journalItems.reduce((sum: number, item: { debit: number; credit: number }) => sum + (Number(item.debit) || 0), 0);
      const totalCredit = s.account.journalItems.reduce((sum: number, item: { debit: number; credit: number }) => sum + (Number(item.credit) || 0), 0);
      balance = totalDebit - totalCredit;
    }
    return { ...s, balance };
  });

  const processedBanks = banks.map(b => {
    let balance = b.balance;
    if (b.account) {
      const totalDebit = b.account.journalItems.reduce((sum: number, item: { debit: number; credit: number }) => sum + (Number(item.debit) || 0), 0);
      const totalCredit = b.account.journalItems.reduce((sum: number, item: { debit: number; credit: number }) => sum + (Number(item.credit) || 0), 0);
      balance = totalDebit - totalCredit;
    }
    return { ...b, balance };
  });

  const stats: TreasuryStats = {
    totalAccounts: processedSafes.length + processedBanks.length,
    totalBanksBalance: processedBanks.reduce((sum, b) => sum + b.balance, 0),
    totalSafeBalance: processedSafes.reduce((sum, s) => sum + s.balance, 0),
    grandTotal: 0,
  };
  stats.grandTotal = stats.totalBanksBalance + stats.totalSafeBalance;

  const allAccounts: AccountSummary[] = [
    ...processedSafes.map(s => ({ 
      id: s.id, 
      name: s.name, 
      type: "safe" as const, 
      balance: s.balance,
      isPrimary: s.isPrimary,
      accountNumber: null,
      branch: null
    })),
    ...processedBanks.map(b => ({ 
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
    ...recentManualEntries.flatMap((entry) => {
      // Find items that involve a treasury account
      return entry.items
        .filter((item) => item.account.treasurySafe || item.account.treasuryBank)
        .map((item) => {
          const isDebit = (item.debit || 0) > 0;
          return {
            id: `manual-${entry.id}-${item.id}`,
            type: (isDebit ? "receipt" : "payment") as any,
            voucherNumber: `JV-${entry.entryNumber}`,
            amount: isDebit ? item.debit : item.credit,
            date: entry.date,
            partyName: "قيد يدوي",
            accountName:
              item.account.treasurySafe?.name ||
              item.account.treasuryBank?.name ||
              "",
            description: item.description || entry.description,
            createdAt: entry.createdAt,
          };
        });
    }),
  ]
  .sort((a, b) => {
    const dA = new Date(a.date);
    dA.setHours(0, 0, 0, 0);
    const dB = new Date(b.date);
    dB.setHours(0, 0, 0, 0);
    
    const dateCompare = dB.getTime() - dA.getTime();
    if (dateCompare !== 0) return dateCompare;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  })
  .slice(0, 15);

  return { accounts: allAccounts, stats, recentTransactions };
}

// 2. إنشاء بنك جديد
export async function createBank(data: { name: string; accountNumber: string; branch: string; initialBalance: number }, skipApproval: boolean = false) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const canManage = await hasPermission(session.userId, "treasury_manage");
  if (!canManage) throw new Error("ليس لديك صلاحية إضافة حسابات بنكية");

  // Approval Interception
  if (!skipApproval) {
    const settings = await (await getTenantPrisma() as any).generalSettings.findUnique({ where: { id: 1 } });
    if (session.user.role === "WORKER" && (settings as any)?.requireApprovalForBankCreation) {
      await (await getTenantPrisma() as any).treasuryActionRequest.create({
        data: {
          type: "CREATE_BANK",
          data: data as any,
          requesterId: session.userId,
          status: "PENDING",
        },
      });
      return { success: true, pending: true, message: "تم إرسال طلب إضافة البنك للمدير للموافقة" };
    }
  }

  try {
    const result = await (await getTenantPrisma()).$transaction(async (tx) => {
      // 1. Find Bank Parent Account
      const parent = await tx.account.findUnique({
        where: { code: '1205' }
      });

      if (!parent) throw new Error("حساب البنوك الرئيسي (1205) غير موجود في شجرة الحسابات"); // ✅ [مصلح] كان يقول 1102 بالخطأ

      // 2. Suggest Next Code
      const lastChild = await tx.account.findFirst({
        where: { parentId: parent.id },
        orderBy: { code: 'desc' },
        select: { code: true }
      });
      
      const newCode = lastChild 
        ? (parseInt(lastChild.code) + 1).toString() 
        : parent.code + "01";

      // 3. Create COA Account
      const account = await tx.account.create({
        data: {
          code: newCode,
          name: data.name,
          type: parent.type,
          parentId: parent.id,
          level: parent.level + 1,
          isSelectable: true,
          isTerminal: true,
        }
      });

      // 4. Create Bank and link accountId
      const bank = await tx.treasuryBank.create({
        data: {
          name: data.name,
          accountNumber: data.accountNumber || null,
          branch: data.branch || null,
          balance: data.initialBalance || 0,
          isActive: true,
          accountId: account.id, // Link to COA
        },
      });

      if (data.initialBalance > 0) {
        const openingBalanceAccount = await tx.account.findFirst({ where: { code: '31' } });
        const cap = await tx.account.findUnique({ where: { code: '3' } });
        let openingAccId = openingBalanceAccount?.id;
        if (!openingAccId && cap) {
          const newAcc = await tx.account.create({
            data: {
              code: '3101', name: 'الأرصدة الافتتاحية', type: 'EQUITY',
              parentId: cap.id, level: 3, isSelectable: true, isTerminal: true
            }
          });
          openingAccId = newAcc.id;
        }

        if (openingAccId) {
          const entryNumber = await SequenceService.getNextSequenceValue(tx, "JournalEntry");
          await tx.journalEntry.create({
            data: {
              entryNumber,
              date: new Date(),
              description: `رصيد افتتاحي - ${data.name}`,
              sourceType: 'MANUAL',
              items: {
                create: [
                  { accountId: account.id, debit: data.initialBalance, credit: 0, description: 'رصيد افتتاحي' },
                  { accountId: openingAccId, debit: 0, credit: data.initialBalance, description: `رصيد افتتاحي - ${data.name}` }
                ]
              }
            }
          });
        }
      }

      return bank;
    });

    const session = await getSession();
    if (session) {
      await triggerStaffActivityAlert(
        session.user,
        "إضافة بنك",
        `تم إضافة بنك جديد: ${result.name} (رصيد: ${result.balance})`
      );
    }

    revalidatePath("/treasury");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating bank:", error);
    return { success: false, error: "فشل في إضافة البنك وتزامن الحسابات" };
  }
}

// 3. أرشفة بنك (بدل الحذف)
export async function archiveBank(bankId: number) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const canManage = await hasPermission(session.userId, "treasury_manage");
  if (!canManage) throw new Error("ليس لديك صلاحية أرشفة حسابات بنكية");

  try {
    console.log("Archiving bank:", bankId);
    
    // تحقق من وجود البنك
    const bank = await (await getTenantPrisma()).treasuryBank.findUnique({
      where: { id: bankId }
    });

    if (!bank) {
      return { success: false, error: "البنك غير موجود" };
    }

    // تحقق من وجود معاملات مرتبطة
    const relatedVouchers = await (await getTenantPrisma()).paymentVoucher.count({
      where: { bankId }
    });

    const relatedReceipts = await (await getTenantPrisma()).receiptVoucher.count({
      where: { bankId }
    });

    const hasTransactions = relatedVouchers > 0 || relatedReceipts > 0;

    if (!hasTransactions) {
      // لو مفيش معاملات، اقدر أحذفه فعلاً
      await (await getTenantPrisma()).treasuryBank.delete({
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
      await (await getTenantPrisma()).treasuryBank.update({
        where: { id: bankId },
        data: { isActive: false }
      });
      
      revalidatePath("/treasury");
      
      const session = await getSession();
      if (session) {
        await triggerStaffActivityAlert(
          session.user,
          "أرشفة بنك",
          `تم أرشفة البنك: ${bank.name}`
        );
      }

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
      (await getTenantPrisma()).supplier.findMany({ 
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true }
      }),
      (await getTenantPrisma()).treasurySafe.findMany({ 
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
      (await getTenantPrisma()).treasuryBank.findMany({ 
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
    
    return { suppliers, safes: processedSafes, banks: processedBanks };
  } catch (error) {
    console.error("Error fetching initial data:", error);
    return { suppliers: [], safes: [], banks: [] };
  }
}

// 5. إنشاء سند صرف (تم نقله إلى payment-voucher/actions.tsx)
// تم الإبقاء على النوع فقط إذا لزم الأمر أو يفضل استيراده من هناك
/*
export async function createPaymentVoucher(data: PaymentVoucherInput, skipApproval: boolean = false) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Approval Interception
  if (!skipApproval) {
    const settings = await (await getTenantPrisma() as any).generalSettings.findUnique({ where: { id: 1 } });
    if (session.user.role === "WORKER" && settings?.requireApprovalForVouchers) {
      await (await getTenantPrisma() as any).treasuryActionRequest.create({
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

    const pendingAlerts: { type: 'treasury', name: string, balance: number }[] = [];

    const result = await (await getTenantPrisma()).$transaction(async (tx) => {
      
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
        
        const updatedSafe = await tx.treasurySafe.update({
          where: { id: idInt },
          data: { balance: { decrement: amountFloat } },
          select: { name: true, balance: true }
        });
        
        if (updatedSafe) {
          pendingAlerts.push({ type: 'treasury', name: updatedSafe.name, balance: updatedSafe.balance });
        }
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

        const updatedBank = await tx.treasuryBank.update({
          where: { id: idInt },
          data: { balance: { decrement: amountFloat } },
          select: { name: true, balance: true }
        });

        if (updatedBank) {
          pendingAlerts.push({ type: 'treasury', name: updatedBank.name, balance: updatedBank.balance });
        }
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

    const session = await getSession();
    if (session) {
      await triggerStaffActivityAlert(
        session.user,
        "سند صرف",
        `تم إنشاء سند صرف #${data.voucherNumber} بقيمة ${data.amount} من ${data.accountType === "safe" ? "خزنة" : "بنك"}`
      );
    }

    for (const alert of pendingAlerts) {
      await triggerTreasuryAlert(alert.name, alert.balance);
    }

    revalidatePath("/treasury");
    revalidatePath(`/treasury/${idInt}?type=${accountType}`);
    
    return { success: true, data: result };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "وقع خطأ غير معروف";
    console.error("Voucher creation error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
*/

// 6. جلب تفاصيل حساب معين
export async function getAccountDetails(id: number, type: 'safe' | 'bank') {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const canView = await hasPermission(session.userId, "treasury_view");
  if (!canView) throw new Error("ليس لديك صلاحية عرض تفاصيل الحساب");

  try {
    if (type === 'safe') {
      const safe = await (await getTenantPrisma()).treasurySafe.findUnique({
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
          createdAt: v.createdAt,
        })),
        ...safe.paymentVouchers.map((v) => ({
          id: `p-${v.id}`,
          type: "payment" as const,
          voucherNumber: v.voucherNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.supplier.name,
          description: v.description,
          createdAt: v.createdAt,
        })),
        ...safe.salesInvoices.map((v) => ({
          id: `si-${v.id}`,
          type: "sales-invoice" as const,
          voucherNumber: `INV-${v.invoiceNumber}`,
          amount: v.total,
          date: v.invoiceDate,
          partyName: v.customerName,
          description: v.description,
          createdAt: v.createdAt,
        })),
        ...safe.purchaseInvoices.map((v) => ({
          id: `pi-${v.id}`,
          type: "purchase-invoice" as const,
          voucherNumber: `PUR-${v.invoiceNumber}`,
          amount: v.total,
          date: v.invoiceDate,
          partyName: v.supplierName,
          description: v.description,
          createdAt: v.createdAt,
        })),
        ...safe.salesReturns.map((v) => ({
          id: `sr-${v.id}`,
          type: "sales-return" as const,
          voucherNumber: `SR-${v.returnNumber}`,
          amount: v.total,
          date: v.returnDate,
          partyName: v.customer.name,
          description: v.reason || v.description,
          createdAt: v.createdAt,
        })),
        ...safe.purchaseReturns.map((v) => ({
          id: `pr-${v.id}`,
          type: "purchase-return" as const,
          voucherNumber: `PR-${v.returnNumber}`,
          amount: v.total,
          date: v.returnDate,
          partyName: v.supplier.name,
          description: v.reason || v.description,
          createdAt: v.createdAt,
        })),
        ...safe.transfersFrom.map((v) => ({
          id: `tr-out-${v.id}`,
          type: "payment" as const, // Use payment for outflow
          voucherNumber: v.transferNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.toSafe?.name || v.toBank?.name || "حساب آخر",
          description: v.description || "تحويل صادر",
          createdAt: v.createdAt,
        })),
        ...safe.transfersTo.map((v) => ({
          id: `tr-in-${v.id}`,
          type: "receipt" as const, // Use receipt for inflow
          voucherNumber: v.transferNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.fromSafe?.name || v.fromBank?.name || "حساب آخر",
          description: v.description || "تحويل وارد",
          createdAt: v.createdAt,
        })),
        ...(await (await getTenantPrisma()).journalEntry.findMany({
          where: {
            sourceType: "MANUAL",
            items: { some: { accountId: safe.accountId || 0 } },
          },
          include: { items: { where: { accountId: safe.accountId || 0 } } },
        })).flatMap((entry) =>
          entry.items.map((item) => ({
            id: `manual-${entry.id}-${item.id}`,
            type: ((item.debit || 0) > 0 ? "receipt" : "payment") as any,
            voucherNumber: `JV-${entry.entryNumber}`,
            amount: (item.debit || 0) > 0 ? item.debit : item.credit,
            date: entry.date,
            partyName: "قيد يدوي",
            description: item.description || entry.description,
            createdAt: entry.createdAt,
          }))
        ),
      ].sort((a, b) => {
        const dA = new Date(a.date);
        dA.setHours(0, 0, 0, 0);
        const dB = new Date(b.date);
        dB.setHours(0, 0, 0, 0);
        
        const dateCompare = dB.getTime() - dA.getTime();
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return {
        id: safe.id,
        name: safe.name,
        type: 'safe',
        balance: safe.balance,
        accountId: safe.accountId,
        createdAt: safe.createdAt,
        updatedAt: safe.updatedAt,
        transactions,
      };
    } else {
      const bank = await (await getTenantPrisma()).treasuryBank.findUnique({
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
          createdAt: v.createdAt,
        })),
        ...bank.paymentVouchers.map((v) => ({
          id: `p-${v.id}`,
          type: "payment" as const,
          voucherNumber: v.voucherNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.supplier.name,
          description: v.description,
          createdAt: v.createdAt,
        })),
        ...bank.salesInvoices.map((v) => ({
          id: `si-${v.id}`,
          type: "sales-invoice" as const,
          voucherNumber: `INV-${v.invoiceNumber}`,
          amount: v.total,
          date: v.invoiceDate,
          partyName: v.customerName,
          description: v.description,
          createdAt: v.createdAt,
        })),
        ...bank.purchaseInvoices.map((v) => ({
          id: `pi-${v.id}`,
          type: "purchase-invoice" as const,
          voucherNumber: `PUR-${v.invoiceNumber}`,
          amount: v.total,
          date: v.invoiceDate,
          partyName: v.supplierName,
          description: v.description,
          createdAt: v.createdAt,
        })),
        ...bank.salesReturns.map((v) => ({
          id: `sr-${v.id}`,
          type: "sales-return" as const,
          voucherNumber: `SR-${v.returnNumber}`,
          amount: v.total,
          date: v.returnDate,
          partyName: v.customer.name,
          description: v.reason || v.description,
          createdAt: v.createdAt,
        })),
        ...bank.purchaseReturns.map((v) => ({
          id: `pr-${v.id}`,
          type: "purchase-return" as const,
          voucherNumber: `PR-${v.returnNumber}`,
          amount: v.total,
          date: v.returnDate,
          partyName: v.supplier.name,
          description: v.reason || v.description,
          createdAt: v.createdAt,
        })),
        ...bank.transfersFrom.map((v) => ({
          id: `tr-out-${v.id}`,
          type: "payment" as const,
          voucherNumber: v.transferNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.toSafe?.name || v.toBank?.name || "حساب آخر",
          description: v.description || "تحويل صادر",
          createdAt: v.createdAt,
        })),
        ...bank.transfersTo.map((v) => ({
          id: `tr-in-${v.id}`,
          type: "receipt" as const,
          voucherNumber: v.transferNumber,
          amount: v.amount,
          date: v.date,
          partyName: v.fromSafe?.name || v.fromBank?.name || "حساب آخر",
          description: v.description || "تحويل وارد",
          createdAt: v.createdAt,
        })),
        ...(await (await getTenantPrisma()).journalEntry.findMany({
          where: {
            sourceType: "MANUAL",
            items: { some: { accountId: bank.accountId || 0 } },
          },
          include: { items: { where: { accountId: bank.accountId || 0 } } },
        })).flatMap((entry) =>
          entry.items.map((item) => ({
            id: `manual-${entry.id}-${item.id}`,
            type: ((item.debit || 0) > 0 ? "receipt" : "payment") as any,
            voucherNumber: `JV-${entry.entryNumber}`,
            amount: (item.debit || 0) > 0 ? item.debit : item.credit,
            date: entry.date,
            partyName: "قيد يدوي",
            description: item.description || entry.description,
            createdAt: entry.createdAt,
          }))
        ),
      ].sort((a, b) => {
        const dA = new Date(a.date);
        dA.setHours(0, 0, 0, 0);
        const dB = new Date(b.date);
        dB.setHours(0, 0, 0, 0);
        
        const dateCompare = dB.getTime() - dA.getTime();
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return {
        id: bank.id,
        name: bank.name,
        type: 'bank',
        balance: bank.balance,
        accountId: bank.accountId,
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
    const customers = await (await getTenantPrisma()).customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true }
    });
    return customers;
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
}

export async function getNextReceiptVoucherNumber(): Promise<string> {
  const sequence = await (await getTenantPrisma()).systemSequence.findUnique({
    where: { id: "ReceiptVoucher" },
    select: { lastValue: true },
  });
  if (sequence) return `RV-${sequence.lastValue + 1}`;

  const lastVoucher = await (await getTenantPrisma()).receiptVoucher.findFirst({
    orderBy: { id: "desc" },
    select: { voucherNumber: true },
  });
  if (!lastVoucher) return "RV-1";
  const lastNum = parseInt(lastVoucher.voucherNumber.split("-")[1] || "0");
  return `RV-${lastNum + 1}`;
}

async function generateReceiptVoucherNumber(tx: Prisma.TransactionClient): Promise<string> {
  const nextVal = await SequenceService.getNextSequenceValue(tx, "ReceiptVoucher");
  return `RV-${nextVal}`;
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
}, skipApproval: boolean = false) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Approval Interception
  if (!skipApproval) {
    const settings = await (await getTenantPrisma() as any).generalSettings.findUnique({ where: { id: 1 } });
    if (session.user.role === "WORKER" && settings?.requireApprovalForVouchers) {
      await (await getTenantPrisma() as any).treasuryActionRequest.create({
        data: {
          type: "RECEIPT_VOUCHER",
          data: data as any,
          requesterId: session.userId,
          status: "PENDING",
        },
      });
      return { success: true, pending: true, message: "تم إرسال طلب سند القبض للمدير للموافقة" };
    }
  }

  const canManage = await hasPermission(session.userId, "treasury_manage");
  if (!canManage) throw new Error("ليس لديك صلاحية إنشاء سندات قبض");

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

    const pendingAlerts: { type: 'treasury', name: string, balance: number }[] = [];

    const result = await (await getTenantPrisma()).$transaction(async (tx) => {
      // 1. Get current entry number using atomic sequence
      const entryNumber = await SequenceService.getNextSequenceValue(tx, "JournalEntry");

      // 2. Find Treasury/Bank Account ID
      let treasuryAccountId: number;
      if (accountType === "safe") {
        const safe = await tx.treasurySafe.findUnique({ 
          where: { id: accountId },
          select: { accountId: true, name: true, balance: true }
        });
        if (!safe || !safe.accountId) throw new Error("الخزنة غير مربوطة بحساب محاسبي");
        treasuryAccountId = safe.accountId;

        const updatedSafe = await tx.treasurySafe.update({
          where: { id: accountId },
          data: { balance: { increment: amount } },
          select: { name: true, balance: true }
        });
        pendingAlerts.push({ type: 'treasury', name: updatedSafe.name, balance: updatedSafe.balance });
      } else {
        const bank = await tx.treasuryBank.findUnique({ 
          where: { id: accountId },
          select: { accountId: true, name: true, balance: true }
        });
        if (!bank || !bank.accountId) throw new Error("البنك غير مربوط بحساب محاسبي");
        treasuryAccountId = bank.accountId;

        const updatedBank = await tx.treasuryBank.update({
          where: { id: accountId },
          data: { balance: { increment: amount } },
          select: { name: true, balance: true }
        });
        pendingAlerts.push({ type: 'treasury', name: updatedBank.name, balance: updatedBank.balance });
      }

      // 3. Get specifically linked Customer Account
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: { accountId: true, name: true }
      });
      if (!customer?.accountId) throw new Error("العميل غير مربوط بحساب محاسبي");
      const customerAccountId = customer.accountId;

      // 4. Create Receipt Voucher with Sequence
      let finalVoucherNumber = voucherNumber;
      if (!finalVoucherNumber || finalVoucherNumber === "RV-0" || finalVoucherNumber === "") {
        finalVoucherNumber = await generateReceiptVoucherNumber(tx);
      } else {
        const existing = await tx.receiptVoucher.findUnique({ where: { voucherNumber: finalVoucherNumber } });
        if (existing) throw new Error(`رقم سند القبض ${finalVoucherNumber} مستخدم مسبقاً`);
      }

      const voucher = await tx.receiptVoucher.create({
        data: {
          voucherNumber: finalVoucherNumber,
          date: new Date(date),
          amount,
          description: description || "",
          customerId,
          accountType,
          safeId: accountType === "safe" ? accountId : null,
          bankId: accountType === "bank" ? accountId : null,
        },
        include: {
          customer: { select: { name: true } }
        }
      });

      // 5. Create Journal Entry
      await tx.journalEntry.create({
          data: {
              entryNumber,
              date: new Date(date),
              description: `سند قبض #${voucher.voucherNumber} - ${voucher.customer.name}`,
              sourceType: 'RECEIPT_VOUCHER',
              sourceId: voucher.id,
              items: {
                  create: [
                      {
                          accountId: treasuryAccountId,
                          debit: amount,
                          credit: 0,
                          description: `إيداع في ${accountType === 'safe' ? 'الخزينة' : 'البنك'}`
                      },
                      {
                          accountId: customerAccountId,
                          debit: 0,
                          credit: amount,
                          description: `تحصيل من العميل: ${voucher.customer.name}`
                      }
                  ]
              }
          }
      });

      return voucher;
    });

    revalidatePath("/treasury");
    revalidatePath(`/treasury/${accountId}?type=${accountType}`);
    
    const session = await getSession();
    if (session) {
      await triggerStaffActivityAlert(
        session.user,
        "سند قبض",
        `تم إنشاء سند قبض #${result.voucherNumber} بقيمة ${result.amount} إلى ${result.accountType === "safe" ? "خزنة" : "بنك"}`
      );
    }

    for (const alert of pendingAlerts) {
      await triggerTreasuryAlert(alert.name, alert.balance);
    }

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
      (await getTenantPrisma()).treasuryBank.findMany({
        where: { isActive: false },
        orderBy: { updatedAt: 'desc' },
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
      (await getTenantPrisma()).treasurySafe.findMany({
        where: { isActive: false },
        orderBy: { updatedAt: 'desc' },
        include: {
          account: {
            include: {
              journalItems: {
                select: { debit: true, credit: true }
              }
            }
          }
        }
      })
    ]);

    const processedBanks = banks.map(b => {
      let balance = b.balance;
      if (b.account) {
        const totalDebit = b.account.journalItems.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
        const totalCredit = b.account.journalItems.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
        balance = totalDebit - totalCredit;
      }
      return { ...b, balance, type: 'bank' as const };
    });

    const processedSafes = safes.map(s => {
      let balance = s.balance;
      if (s.account) {
        const totalDebit = s.account.journalItems.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
        const totalCredit = s.account.journalItems.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
        balance = totalDebit - totalCredit;
      }
      return { ...s, balance, type: 'safe' as const };
    });

    return { 
      success: true, 
      banks: processedBanks, 
      safes: processedSafes 
    };
  } catch (error) {
    console.error("Error fetching archived accounts:", error);
    return { success: false, error: "فشل في جلب الحسابات المؤرشفة" };
  }
}

// 11. إرجاع حساب من الأرشيف
export async function restoreAccount(id: number, type: 'safe' | 'bank') {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const canManage = await hasPermission(session.userId, "treasury_manage");
  if (!canManage) throw new Error("ليس لديك صلاحية استعادة الحسابات");

  try {
    if (type === 'bank') {
        const account = await (await getTenantPrisma()).treasuryBank.update({
          where: { id },
          data: { isActive: true }
        });
        if (session) {
          await triggerStaffActivityAlert(session.user, "استعادة حساب", `تم استعادة البنك: ${account.name}`);
        }
    } else {
        const account = await (await getTenantPrisma()).treasurySafe.update({
          where: { id },
          data: { isActive: true }
        });
        if (session && account) {
          await triggerStaffActivityAlert(session.user, "استعادة حساب", `تم استعادة الخزنة: ${account.name}`);
        }
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
      (await getTenantPrisma()).customer.findMany({ 
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true }
      }),
      (await getTenantPrisma()).treasurySafe.findMany({ 
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
      (await getTenantPrisma()).treasuryBank.findMany({ 
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
    
    return { customers, safes: processedSafes, banks: processedBanks };
  } catch (error) {
    console.error("Error fetching receipt initial data:", error);
    return { customers: [], safes: [], banks: [] };
  }
}

// 12. إنشاء خزنة جديدة
export async function createSafe(data: { name: string; initialBalance: number; description?: string }, skipApproval: boolean = false) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const canManage = await hasPermission(session.userId, "treasury_manage");
  if (!canManage) throw new Error("ليس لديك صلاحية إضافة خزائن");

  // Approval Interception
  if (!skipApproval) {
    const settings = await (await getTenantPrisma() as any).generalSettings.findUnique({ where: { id: 1 } });
    if (session.user.role === "WORKER" && (settings as any)?.requireApprovalForSafeCreation) {
      await (await getTenantPrisma() as any).treasuryActionRequest.create({
        data: {
          type: "CREATE_SAFE",
          data: data as any,
          requesterId: session.userId,
          status: "PENDING",
        },
      });
      return { success: true, pending: true, message: "تم إرسال طلب إضافة الخزنة للمدير للموافقة" };
    }
  }

  try {
    const result = await (await getTenantPrisma()).$transaction(async (tx) => {
      // 1. Find Safe Parent Account
      const parent = await tx.account.findUnique({
        where: { code: '1201' }
      });

      if (!parent) throw new Error("حساب النقدية بالخزينة الرئيسي (1201) غير موجود في شجرة الحسابات");

      // 2. Suggest Next Code
      const lastChild = await tx.account.findFirst({
        where: { parentId: parent.id },
        orderBy: { code: 'desc' },
        select: { code: true }
      });
      
      const newCode = lastChild 
        ? (parseInt(lastChild.code) + 1).toString() 
        : parent.code + "01";

      // 3. Create COA Account
      const account = await tx.account.create({
        data: {
          code: newCode,
          name: data.name,
          type: parent.type,
          parentId: parent.id,
          level: parent.level + 1,
          isSelectable: true,
          isTerminal: true,
        }
      });

      // 4. Create Safe and link accountId
      const safe = await tx.treasurySafe.create({
        data: {
          name: data.name,
          balance: data.initialBalance || 0,
          description: data.description || "",
          isPrimary: false,
          isActive: true,
          accountId: account.id, // Link to COA
        },
      });

      if (data.initialBalance > 0) {
        const openingBalanceAccount = await tx.account.findFirst({ where: { code: '31' } });
        const cap = await tx.account.findUnique({ where: { code: '3' } });
        let openingAccId = openingBalanceAccount?.id;
        if (!openingAccId && cap) {
          const newAcc = await tx.account.create({
            data: {
              code: '31', name: 'الأرصدة الافتتاحية', type: 'EQUITY',
              parentId: cap.id, level: 3, isSelectable: true, isTerminal: true
            }
          });
          openingAccId = newAcc.id;
        }

        if (openingAccId) {
          const entryNumber = await SequenceService.getNextSequenceValue(tx, "JournalEntry");
          await tx.journalEntry.create({
            data: {
              entryNumber,
              date: new Date(),
              description: `رصيد افتتاحي - ${data.name}`,
              sourceType: 'MANUAL',
              items: {
                create: [
                  { accountId: account.id, debit: data.initialBalance, credit: 0, description: 'رصيد افتتاحي' },
                  { accountId: openingAccId, debit: 0, credit: data.initialBalance, description: `رصيد افتتاحي - ${data.name}` }
                ]
              }
            }
          });
        }
      }

      return safe;
    });

    const session = await getSession();
    if (session) {
      await triggerStaffActivityAlert(
        session.user,
        "إضافة خزنة",
        `تم إضافة خزنة جديدة: ${result.name} (رصيد: ${result.balance})`
      );
    }

    revalidatePath("/treasury");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating safe:", error);
    return { success: false, error: "فشل في إضافة الخزنة وتزامن الحسابات" };
  }
}

// 13. أرشفة خزنة
export async function archiveSafe(safeId: number) {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const canManage = await hasPermission(session.userId, "treasury_manage");
  if (!canManage) throw new Error("ليس لديك صلاحية أرشفة الخزائن");

  try {
    const safe = await (await getTenantPrisma()).treasurySafe.findUnique({
      where: { id: safeId }
    });

    if (!safe) return { success: false, error: "الخزنة غير موجودة" };
    if (safe.isPrimary) return { success: false, error: "لا يمكن أرشفة الخزنة الرئيسية" };

    // تحقق من وجود معاملات
    const relatedVouchers = await (await getTenantPrisma()).paymentVoucher.count({ where: { safeId } });
    const relatedReceipts = await (await getTenantPrisma()).receiptVoucher.count({ where: { safeId } });
    const relatedSalesInvoices = await (await getTenantPrisma()).salesInvoice.count({ where: { safeId, status: 'cash' } });
    const relatedPurchaseInvoices = await (await getTenantPrisma()).purchaseInvoice.count({ where: { safeId, status: 'cash' } });
    
    const hasTransactions = relatedVouchers > 0 || relatedReceipts > 0 || relatedSalesInvoices > 0 || relatedPurchaseInvoices > 0;

    if (!hasTransactions) {
      await (await getTenantPrisma()).treasurySafe.delete({ where: { id: safeId } });
      revalidatePath("/treasury");
      return { success: true, message: "تم حذف الخزنة نهائياً", deleted: true };
    } else {
      const archivedSafe = await (await getTenantPrisma()).treasurySafe.update({
        where: { id: safeId },
        data: { isActive: false }
      });
      const session = await getSession();
      if (session && archivedSafe) {
        await triggerStaffActivityAlert(session.user, "أرشفة خزنة", `تم أرشفة الخزنة: ${archivedSafe.name}`);
      }
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
    const banks = await (await getTenantPrisma()).treasuryBank.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
      include: {
        account: {
          include: {
            journalItems: {
              select: { debit: true, credit: true }
            }
          }
        }
      }
    });

    const processedBanks = banks.map(b => {
      let balance = b.balance;
      if (b.account) {
        const totalDebit = b.account.journalItems.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
        const totalCredit = b.account.journalItems.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
        balance = totalDebit - totalCredit;
      }
      return { ...b, balance };
    });

    return processedBanks;
  } catch (error) {
    console.error("Error fetching banks:", error);
    return [];
  }
}
