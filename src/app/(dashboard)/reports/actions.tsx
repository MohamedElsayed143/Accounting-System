// app/(dashboard)/reports/actions.tsx
"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// أنواع البيانات
export type CustomerType = {
  id: number;
  code: number;
  name: string;
  phone: string | null;
  type: "customer" | "supplier";
};

export type SupplierType = {
  id: number;
  code: number;
  name: string;
  phone: string | null;
  type: "customer" | "supplier";
};

export type TransactionType = {
  id: string;
  date: Date;
  createdAt: Date;
  type: string;
  documentId: string;
  description: string | null;
  paymentMethod: string;
  debit: number;
  credit: number;
  runningBalance?: number;
};

// 1. جلب العملاء (مع إمكانية البحث)
export async function getCustomers(search?: string) {
  try {
    const customers = await prisma.customer.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { equals: parseInt(search) || undefined } },
          { phone: { contains: search } },
        ]
      } : {},
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
      }
    });
    
    return customers.map(c => ({ ...c, type: 'customer' as const }));
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
}

// 1.1 جلب عميل محدد
export async function getCustomerById(id: number) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
      }
    });
    return customer ? { ...customer, type: 'customer' as const } : null;
  } catch (error) {
    console.error("Error fetching customer by id:", error);
    return null;
  }
}

// 2. جلب الموردين (مع إمكانية البحث)
export async function getSuppliers(search?: string) {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { equals: parseInt(search) || undefined } },
          { phone: { contains: search } },
        ]
      } : {},
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
      }
    });
    
    return suppliers.map(s => ({ ...s, type: 'supplier' as const }));
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return [];
  }
}

// 2.1 جلب مورد محدد
export async function getSupplierById(id: number) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
      }
    });
    return supplier ? { ...supplier, type: 'supplier' as const } : null;
  } catch (error) {
    console.error("Error fetching supplier by id:", error);
    return null;
  }
}

// 3. جلب معاملات العميل
export async function getCustomerTransactions(
  customerId: number,
  fromDate?: Date,
  toDate?: Date,
  type?: string
) {
  try {
    // جلب فواتير البيع
    const invoices = await prisma.salesInvoice.findMany({
      where: {
        customerId,
        ...(fromDate && toDate ? {
          invoiceDate: {
            gte: fromDate,
            lte: toDate,
          }
        } : {}),
      },
      include: { customer: true },
      orderBy: { invoiceDate: 'asc' }
    });

    // جلب سندات القبض
    const receipts = await prisma.receiptVoucher.findMany({
      where: {
        customerId,
        ...(fromDate && toDate ? {
          date: {
            gte: fromDate,
            lte: toDate,
          }
        } : {}),
      },
      include: { customer: true, safe: true, bank: true },
      orderBy: { date: 'asc' }
    });

    // جلب مرتجعات المبيعات
    const returns = await prisma.salesReturn.findMany({
      where: {
        customerId,
        ...(fromDate && toDate ? {
          returnDate: {
            gte: fromDate,
            lte: toDate,
          }
        } : {}),
      },
      include: { customer: true, items: true },
      orderBy: { returnDate: 'asc' }
    });

    // تحويل الفواتير
    const invoiceTransactions: TransactionType[] = invoices.map(inv => ({
      id: `inv-${inv.id}`,
      date: inv.invoiceDate,
      createdAt: inv.createdAt,
      type: 'فاتورة',
      documentId: `INV-${inv.invoiceNumber}`,
      description: inv.description || `فاتورة بيع للعميل ${inv.customerName}`,
      paymentMethod: inv.status === 'cash' ? 'نقدي' : 'آجل',
      debit: inv.total,
      credit: 0,
    }));

    // تحويل سندات القبض
    const receiptTransactions: TransactionType[] = receipts.map(rec => ({
      id: `rec-${rec.id}`,
      date: rec.date,
      createdAt: rec.createdAt,
      type: 'سند قبض',
      documentId: rec.voucherNumber,
      description: rec.description || 'سند قبض',
      paymentMethod: rec.accountType === 'safe' ? 'نقدي' : 'بنك',
      debit: 0,
      credit: rec.amount,
    }));

    // تحويل المرتجعات
    const returnTransactions: TransactionType[] = returns.map(ret => ({
      id: `ret-${ret.id}`,
      date: ret.returnDate,
      createdAt: ret.createdAt,
      type: 'مرتجع',
      documentId: `RET-${ret.returnNumber}`,
      description: `مرتجع مبيعات - ${ret.reason || 'بدون سبب'}`,
      paymentMethod: ret.refundMethod === 'cash' ? 'نقدي' : ret.refundMethod === 'bank' ? 'بنك' : 'آجل',
      debit: 0,
      credit: ret.total,
    }));

    // دمج جميع المعاملات
    let allTransactions = [...invoiceTransactions, ...receiptTransactions, ...returnTransactions];

    // ترتيب تصاعدي حسب التاريخ
    allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    // فلترة حسب النوع إذا طلب (بدون خيار "مرتجعات" في الفلتر)
    if (type && type !== 'الكل') {
      const typeMap: Record<string, string> = {
        'فواتير': 'فاتورة',
        'سند قبض': 'سند قبض',
        // تم إزالة خيار 'مرتجعات' حتى لا يظهر في الفلتر
      };
      allTransactions = allTransactions.filter(t => t.type === typeMap[type]);
    }

    return allTransactions;
  } catch (error) {
    console.error("Error fetching customer transactions:", error);
    return [];
  }
}

// 4. جلب معاملات المورد
export async function getSupplierTransactions(
  supplierId: number,
  fromDate?: Date,
  toDate?: Date,
  type?: string
) {
  try {
    // جلب فواتير الشراء
    const invoices = await prisma.purchaseInvoice.findMany({
      where: {
        supplierId,
        ...(fromDate && toDate ? {
          invoiceDate: {
            gte: fromDate,
            lte: toDate,
          }
        } : {}),
      },
      include: { supplier: true },
      orderBy: { invoiceDate: 'asc' }
    });

    // جلب سندات الصرف
    const payments = await prisma.paymentVoucher.findMany({
      where: {
        supplierId,
        ...(fromDate && toDate ? {
          date: {
            gte: fromDate,
            lte: toDate,
          }
        } : {}),
      },
      include: { supplier: true, safe: true, bank: true },
      orderBy: { date: 'asc' }
    });

    // جلب مرتجعات المشتريات
    const purchaseReturns = await prisma.purchaseReturn.findMany({
      where: {
        supplierId,
        ...(fromDate && toDate ? {
          returnDate: {
            gte: fromDate,
            lte: toDate,
          }
        } : {}),
      },
      include: { supplier: true, items: true },
      orderBy: { returnDate: 'asc' }
    });

    // تحويل الفواتير
    const invoiceTransactions: TransactionType[] = invoices.map(inv => ({
      id: `purch-${inv.id}`,
      date: inv.invoiceDate,
      createdAt: inv.createdAt,
      type: 'فاتورة',
      documentId: `PUR-${inv.invoiceNumber}`,
      description: inv.description || `فاتورة شراء من المورد ${inv.supplierName}`,
      paymentMethod: inv.status === 'cash' ? 'نقدي' : 'آجل',
      debit: inv.total,
      credit: 0,
    }));

    // تحويل سندات الصرف
    const paymentTransactions: TransactionType[] = payments.map(pay => ({
      id: `pay-${pay.id}`,
      date: pay.date,
      createdAt: pay.createdAt,
      type: 'سند صرف',
      documentId: pay.voucherNumber,
      description: pay.description || 'سند صرف',
      paymentMethod: pay.accountType === 'safe' ? 'نقدي' : 'بنك',
      debit: 0,
      credit: pay.amount,
    }));

    // تحويل مرتجعات المشتريات (تظهر كمعاملات دائنة للمورد)
    const returnTransactions: TransactionType[] = purchaseReturns.map(ret => ({
      id: `purchRet-${ret.id}`,
      date: ret.returnDate,
      createdAt: ret.createdAt,
      type: 'مرتجع',
      documentId: `RET-${ret.returnNumber}`,
      description: `مرتجع مشتريات - ${ret.reason || 'بدون سبب'}`,
      paymentMethod: ret.refundMethod === 'cash' ? 'نقدي' : ret.refundMethod === 'bank' ? 'بنك' : 'آجل',
      debit: 0,
      credit: ret.total,
    }));

    // دمج جميع المعاملات
    let allTransactions = [...invoiceTransactions, ...paymentTransactions, ...returnTransactions];

    // ترتيب تصاعدي حسب التاريخ
    allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (type && type !== 'الكل') {
      const typeMap: Record<string, string> = {
        'فواتير': 'فاتورة',
        'سند صرف': 'سند صرف',
      };
      allTransactions = allTransactions.filter(t => t.type === typeMap[type]);
    }

    return allTransactions;
  } catch (error) {
    console.error("Error fetching supplier transactions:", error);
    return [];
  }
}



// 5. جلب الخزائن
export async function getSafes() {
  try {
    return await prisma.treasurySafe.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, balance: true }
    });
  } catch (error) {
    console.error("Error fetching safes:", error);
    return [];
  }
}

// 6. جلب البنوك
export async function getBanks() {
  try {
    return await prisma.treasuryBank.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, balance: true, accountNumber: true }
    });
  } catch (error) {
    console.error("Error fetching banks:", error);
    return [];
  }
}

// 7. جلب بيانات الحساب (خزنة أو بنك)
export async function getAccountById(id: number, type: 'safe' | 'bank') {
  try {
    if (type === 'safe') {
      return await prisma.treasurySafe.findUnique({ where: { id } });
    } else {
      return await prisma.treasuryBank.findUnique({ where: { id } });
    }
  } catch (error) {
    console.error("Error fetching account:", error);
    return null;
  }
}

// 8. جلب معاملات الحساب (خزنة أو بنك) مع الرصيد الافتتاحي
export async function getAccountTransactions(
  accountId: number,
  accountType: 'safe' | 'bank',
  fromDate?: Date,
  toDate?: Date,
  filterType: string = 'الكل'
) {
  try {
    const whereAccount = accountType === 'safe' ? { safeId: accountId } : { bankId: accountId };
    const whereAccountFrom = accountType === 'safe' ? { fromSafeId: accountId } : { fromBankId: accountId };
    const whereAccountTo = accountType === 'safe' ? { toSafeId: accountId } : { toBankId: accountId };

    // 1. حساب الرصيد الافتتاحي (كل المعاملات قبل من تاريخ)
    let openingBalance = 0;
    if (fromDate) {
      const [prevReceipts, prevPayments, prevSalesReturns, prevPurchReturns, prevTransfersFrom, prevTransfersTo] = await Promise.all([
        prisma.receiptVoucher.aggregate({
          where: { ...whereAccount, date: { lt: fromDate } },
          _sum: { amount: true }
        }),
        prisma.paymentVoucher.aggregate({
          where: { ...whereAccount, date: { lt: fromDate } },
          _sum: { amount: true }
        }),
        prisma.salesReturn.aggregate({
          where: { ...whereAccount, returnDate: { lt: fromDate } },
          _sum: { total: true }
        }),
        prisma.purchaseReturn.aggregate({
          where: { ...whereAccount, returnDate: { lt: fromDate } },
          _sum: { total: true }
        }),
        prisma.treasuryTransfer.aggregate({
          where: { ...whereAccountFrom, date: { lt: fromDate } },
          _sum: { amount: true }
        }),
        prisma.treasuryTransfer.aggregate({
          where: { ...whereAccountTo, date: { lt: fromDate } },
          _sum: { amount: true }
        }),
      ]);

      const totalDebit = (prevReceipts._sum.amount || 0) + (prevPurchReturns._sum.total || 0) + (prevTransfersTo._sum.amount || 0);
      const totalCredit = (prevPayments._sum.amount || 0) + (prevSalesReturns._sum.total || 0) + (prevTransfersFrom._sum.amount || 0);
      openingBalance = totalDebit - totalCredit;
    }

    // 2. جلب المعاملات في الفترة المحددة
    const dateFilterVoucher = fromDate && toDate ? { date: { gte: fromDate, lte: toDate } } : {};
    const dateFilterReturn = fromDate && toDate ? { returnDate: { gte: fromDate, lte: toDate } } : {};

    const [receipts, payments, salesReturns, purchReturns, transfersFrom, transfersTo] = await Promise.all([
      prisma.receiptVoucher.findMany({
        where: { ...whereAccount, ...dateFilterVoucher },
        include: { customer: { select: { name: true } } },
        orderBy: { date: 'asc' }
      }),
      prisma.paymentVoucher.findMany({
        where: { ...whereAccount, ...dateFilterVoucher },
        include: { supplier: { select: { name: true } } },
        orderBy: { date: 'asc' }
      }),
      prisma.salesReturn.findMany({
        where: { ...whereAccount, ...dateFilterReturn },
        include: { customer: { select: { name: true } } },
        orderBy: { returnDate: 'asc' }
      }),
      prisma.purchaseReturn.findMany({
        where: { ...whereAccount, ...dateFilterReturn },
        include: { supplier: { select: { name: true } } },
        orderBy: { returnDate: 'asc' }
      }),
      prisma.treasuryTransfer.findMany({
        where: { ...whereAccountFrom, ...dateFilterVoucher },
        include: { toSafe: true, toBank: true },
        orderBy: { date: 'asc' }
      }),
      prisma.treasuryTransfer.findMany({
        where: { ...whereAccountTo, ...dateFilterVoucher },
        include: { fromSafe: true, fromBank: true },
        orderBy: { date: 'asc' }
      }),
    ]);

    // 3. تحويل المعاملات إلى تنسيق موحد
    const mappedReceipts: TransactionType[] = receipts.map(r => ({
      id: `rec-${r.id}`,
      date: r.date,
      createdAt: r.createdAt,
      type: 'سند قبض',
      documentId: r.voucherNumber,
      description: r.description || `قبض من العميل ${r.customer.name}`,
      paymentMethod: accountType === 'safe' ? 'نقدي' : 'بنك',
      debit: r.amount,
      credit: 0
    }));

    const mappedPayments: TransactionType[] = payments.map(p => ({
      id: `pay-${p.id}`,
      date: p.date,
      createdAt: p.createdAt,
      type: 'سند صرف',
      documentId: p.voucherNumber,
      description: p.description || `صرف للمورد ${p.supplier.name}`,
      paymentMethod: accountType === 'safe' ? 'نقدي' : 'بنك',
      debit: 0,
      credit: p.amount
    }));

    const mappedSalesReturns: TransactionType[] = salesReturns.map(r => ({
      id: `sret-${r.id}`,
      date: r.returnDate,
      createdAt: r.createdAt,
      type: 'مرتجع',
      documentId: `SRET-${r.returnNumber}`,
      description: `مرتجع مبيعات من العميل ${r.customer.name}`,
      paymentMethod: 'نقدي',
      debit: 0,
      credit: r.total
    }));

    const mappedPurchReturns: TransactionType[] = purchReturns.map(r => ({
      id: `pret-${r.id}`,
      date: r.returnDate,
      createdAt: r.createdAt,
      type: 'مرتجع',
      documentId: `PRET-${r.returnNumber}`,
      description: `مرتجع مشتريات من المورد ${r.supplier.name}`,
      paymentMethod: 'نقدي',
      debit: r.total,
      credit: 0
    }));

    const mappedTransfersFrom: TransactionType[] = transfersFrom.map(t => ({
      id: `tr-out-${t.id}`,
      date: t.date,
      createdAt: t.createdAt,
      type: 'تحويل صادر',
      documentId: t.transferNumber,
      description: t.description || `تحويل إلى ${t.toSafe?.name || t.toBank?.name}`,
      paymentMethod: 'تحويل',
      debit: 0,
      credit: t.amount
    }));

    const mappedTransfersTo: TransactionType[] = transfersTo.map(t => ({
      id: `tr-in-${t.id}`,
      date: t.date,
      createdAt: t.createdAt,
      type: 'تحويل وارد',
      documentId: t.transferNumber,
      description: t.description || `تحويل من ${t.fromSafe?.name || t.fromBank?.name}`,
      paymentMethod: 'تحويل',
      debit: t.amount,
      credit: 0
    }));

    // دمج وترتيب وحساب الرصيد التراكمي
    let allTransactions = [
      ...mappedReceipts,
      ...mappedPayments,
      ...mappedSalesReturns,
      ...mappedPurchReturns,
      ...mappedTransfersFrom,
      ...mappedTransfersTo
    ].sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // فلترة حسب النوع إذا طلب
    if (filterType !== 'الكل') {
      allTransactions = allTransactions.filter(t => t.type === filterType);
    }

    // حساب الرصيد التراكمي
    let currentBalance = openingBalance;
    allTransactions = allTransactions.map(t => {
      currentBalance += (t.debit - t.credit);
      return { ...t, runningBalance: currentBalance };
    });

    return {
      transactions: allTransactions,
      openingBalance
    };

  } catch (error) {
    console.error("Error fetching account transactions:", error);
    return { transactions: [], openingBalance: 0 };
  }
}