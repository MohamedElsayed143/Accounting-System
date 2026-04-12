"use server";
import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { revalidatePath } from "next/cache";

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
    const customers = await (await getTenantPrisma()).customer.findMany({
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
    const customer = await (await getTenantPrisma()).customer.findUnique({
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
    const suppliers = await (await getTenantPrisma()).supplier.findMany({
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
    const supplier = await (await getTenantPrisma()).supplier.findUnique({
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
    const invoices = await (await getTenantPrisma()).salesInvoice.findMany({
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
    const receipts = await (await getTenantPrisma()).receiptVoucher.findMany({
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
    const returns = await (await getTenantPrisma()).salesReturn.findMany({
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

    // جلب إعدادات الشركة للبادئات
    const settings = await (await getTenantPrisma()).companySettings.findUnique({ where: { id: 1 } });

    // تحويل الفواتير
    const invoiceTransactions: TransactionType[] = [];
    (invoices || []).forEach(inv => {
      invoiceTransactions.push({
        id: `inv-${inv.id}`,
        date: inv.invoiceDate,
        createdAt: inv.createdAt,
        type: inv.status === 'pending' ? 'مسودة' : 'فاتورة',
        documentId: `${settings?.salesPrefix || 'INV'}-${String(inv.invoiceNumber).padStart(4, "0")}`,
        description: inv.description || (inv.status === 'pending' ? `مسودة فاتورة بيع للعميل ${inv.customerName}` : `فاتورة بيع للعميل ${inv.customerName}`),
        paymentMethod: inv.status === 'cash' ? 'نقدي' : inv.status === 'credit' ? 'آجل' : 'معلقة',
        debit: inv.status === 'pending' ? 0 : inv.total,
        credit: 0,
      });

      // إدراج سداد آلي للفواتير النقدية ليتطابق التقرير مع القيود المحاسبية
      if (inv.status === 'cash') {
        invoiceTransactions.push({
          id: `auto-rec-${inv.id}`,
          date: inv.invoiceDate,
          createdAt: new Date(inv.createdAt.getTime() + 1000), // add 1 ms offset for display consistency
          type: 'سند قبض',
          documentId: `SET-${String(inv.invoiceNumber).padStart(4, "0")}`,
          description: `تسوية أوتوماتيكية لفاتورة المبيعات النقدية #${inv.invoiceNumber}`,
          paymentMethod: 'نقدي',
          debit: 0,
          credit: inv.total,
        });
      }
    });

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
      documentId: `RET-${String(ret.returnNumber).padStart(4, "0")}`,
      description: `مرتجع مبيعات - ${ret.reason || 'بدون سبب'}`,
      paymentMethod: ret.refundMethod === 'cash' ? 'نقدي' : ret.refundMethod === 'bank' ? 'بنك' : 'آجل',
      debit: 0,
      credit: ret.total,
    }));

    // جلب القيود اليدوية للعميل
    const customer = await (await getTenantPrisma()).customer.findUnique({ where: { id: customerId } });
    const manualEntries = customer?.accountId ? await (await getTenantPrisma()).journalItem.findMany({
      where: {
        accountId: customer.accountId,
        journalEntry: {
          sourceType: "MANUAL",
          ...(fromDate && toDate ? { date: { gte: fromDate, lte: toDate } } : {})
        }
      },
      include: { journalEntry: true }
    }) : [];

    const manualTransactions: TransactionType[] = manualEntries.map(item => ({
      id: `manual-${item.id}`,
      date: item.journalEntry.date,
      createdAt: item.journalEntry.createdAt,
      type: "قيد يدوي",
      documentId: `JV-${item.journalEntry.entryNumber}`,
      description: item.description || item.journalEntry.description || "قيد يدوي",
      paymentMethod: "أخرى",
      debit: item.debit,
      credit: item.credit,
    }));

    // دمج جميع المعاملات
    let allTransactions = [...invoiceTransactions, ...receiptTransactions, ...returnTransactions, ...manualTransactions];

    // ترتيب تنازلي حسب التاريخ والوقت (الأحدث أولاً)
    allTransactions.sort((a, b) => {
      const dateCompare = b.date.getTime() - a.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

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
    const invoices = await (await getTenantPrisma()).purchaseInvoice.findMany({
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
    const payments = await (await getTenantPrisma()).paymentVoucher.findMany({
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
    const purchaseReturns = await (await getTenantPrisma()).purchaseReturn.findMany({
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

    // جلب إعدادات الشركة للبادئات
    const settings = await (await getTenantPrisma()).companySettings.findUnique({ where: { id: 1 } });

    // تحويل الفواتير
    const invoiceTransactions: TransactionType[] = [];
    invoices.forEach(inv => {
      invoiceTransactions.push({
        id: `purch-${inv.id}`,
        date: inv.invoiceDate,
        createdAt: inv.createdAt,
        type: inv.status === 'pending' ? 'مسودة' : 'فاتورة',
        documentId: `${settings?.purchasePrefix || 'PUR'}-${String(inv.invoiceNumber).padStart(4, "0")}`,
        description: inv.description || (inv.status === 'pending' ? `مسودة فاتورة شراء من المورد ${inv.supplierName}` : `فاتورة شراء من المورد ${inv.supplierName}`),
        paymentMethod: inv.status === 'cash' ? 'نقدي' : inv.status === 'credit' ? 'آجل' : 'معلقة',
        debit: inv.status === 'pending' ? 0 : inv.total, // Suppliers are Liabilities: adding to their balance is a credit originally, but in reports we flip it so debit = bill, credit = payment
        credit: 0,
      });

      if (inv.status === 'cash') {
        invoiceTransactions.push({
          id: `auto-pay-${inv.id}`,
          date: inv.invoiceDate,
          createdAt: new Date(inv.createdAt.getTime() + 1000), // add 1 ms offset for display consistency
          type: 'سند صرف',
          documentId: `SET-${String(inv.invoiceNumber).padStart(4, "0")}`,
          description: `تسوية أوتوماتيكية لفاتورة المشتريات النقدية #${inv.invoiceNumber}`,
          paymentMethod: 'نقدي',
          debit: 0,
          credit: inv.total,
        });
      }
    });

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
      documentId: `RET-${String(ret.returnNumber).padStart(4, "0")}`,
      description: `مرتجع مشتريات - ${ret.reason || 'بدون سبب'}`,
      paymentMethod: ret.refundMethod === 'cash' ? 'نقدي' : ret.refundMethod === 'bank' ? 'بنك' : 'آجل',
      debit: 0,
      credit: ret.total,
    }));

    // جلب القيود اليدوية للمورد
    const supplier = await (await getTenantPrisma()).supplier.findUnique({ where: { id: supplierId } });
    const manualEntries = supplier?.accountId ? await (await getTenantPrisma()).journalItem.findMany({
      where: {
        accountId: supplier.accountId,
        journalEntry: {
          sourceType: "MANUAL",
          ...(fromDate && toDate ? { date: { gte: fromDate, lte: toDate } } : {})
        }
      },
      include: { journalEntry: true }
    }) : [];

    const manualTransactions: TransactionType[] = manualEntries.map(item => ({
      id: `manual-${item.id}`,
      date: item.journalEntry.date,
      createdAt: item.journalEntry.createdAt,
      type: "قيد يدوي",
      documentId: `JV-${item.journalEntry.entryNumber}`,
      description: item.description || item.journalEntry.description || "قيد يدوي",
      paymentMethod: "أخرى",
      debit: item.credit,   // Reversed for supplier (Suppliers are Liability) -> Credit means we owe them more, so treating like a bill (debit in report)
      credit: item.debit,   // Debit means we owe them less, so treating like a payment (credit in report)
    }));

    // دمج جميع المعاملات
    let allTransactions = [...invoiceTransactions, ...paymentTransactions, ...returnTransactions, ...manualTransactions];

    // ترتيب تنازلي حسب التاريخ والوقت (الأحدث أولاً)
    allTransactions.sort((a, b) => {
      const dateCompare = b.date.getTime() - a.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

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
    return await (await getTenantPrisma()).treasurySafe.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, balance: true, accountId: true }
    });
  } catch (error) {
    console.error("Error fetching safes:", error);
    return [];
  }
}

// 6. جلب البنوك
export async function getBanks() {
  try {
    return await (await getTenantPrisma()).treasuryBank.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, balance: true, accountNumber: true, accountId: true }
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
      return await (await getTenantPrisma()).treasurySafe.findUnique({ where: { id } });
    } else {
      return await (await getTenantPrisma()).treasuryBank.findUnique({ where: { id } });
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

    // جلب الـ accountId الخاص بالخزنة أو البنك
    const account =
      accountType === "safe"
        ? await (await getTenantPrisma()).treasurySafe.findUnique({
            where: { id: accountId },
            select: { accountId: true },
          })
        : await (await getTenantPrisma()).treasuryBank.findUnique({
            where: { id: accountId },
            select: { accountId: true },
          });

    const safeBankAccountId = account?.accountId || 0;

    // 1. حساب الرصيد الافتتاحي
    let openingBalance = 0;
    if (fromDate) {
      const [
        prevReceipts,
        prevPayments,
        prevSalesReturns,
        prevPurchReturns,
        prevTransfersFrom,
        prevTransfersTo,
        prevSalesInvoices,
        prevPurchInvoices,
        prevManualEntries,
      ] = await Promise.all([
        (await getTenantPrisma()).receiptVoucher.aggregate({
          where: { ...whereAccount, date: { lt: fromDate } },
          _sum: { amount: true },
        }),
        (await getTenantPrisma()).paymentVoucher.aggregate({
          where: { ...whereAccount, date: { lt: fromDate } },
          _sum: { amount: true },
        }),
        (await getTenantPrisma()).salesReturn.aggregate({
          where: { ...whereAccount, returnDate: { lt: fromDate } },
          _sum: { total: true },
        }),
        (await getTenantPrisma()).purchaseReturn.aggregate({
          where: { ...whereAccount, returnDate: { lt: fromDate } },
          _sum: { total: true },
        }),
        (await getTenantPrisma()).treasuryTransfer.aggregate({
          where: { ...whereAccountFrom, date: { lt: fromDate } },
          _sum: { amount: true },
        }),
        (await getTenantPrisma()).treasuryTransfer.aggregate({
          where: { ...whereAccountTo, date: { lt: fromDate } },
          _sum: { amount: true },
        }),
        (await getTenantPrisma()).salesInvoice.aggregate({
          where: {
            ...whereAccount,
            invoiceDate: { lt: fromDate },
            status: "cash",
          },
          _sum: { total: true },
        }),
        (await getTenantPrisma()).purchaseInvoice.aggregate({
          where: {
            ...whereAccount,
            invoiceDate: { lt: fromDate },
            status: "cash",
          },
          _sum: { total: true },
        }),
        (await getTenantPrisma()).journalItem.aggregate({
          where: {
            accountId: safeBankAccountId,
            journalEntry: {
              sourceType: "MANUAL",
              date: { lt: fromDate },
            },
          },
          _sum: { debit: true, credit: true },
        }),
      ]);

      const totalDebitManual = prevManualEntries._sum.debit || 0;
      const totalCreditManual = prevManualEntries._sum.credit || 0;

      const totalDebit =
        (prevReceipts._sum.amount || 0) +
        (prevPurchReturns._sum.total || 0) +
        (prevTransfersTo._sum.amount || 0) +
        (prevSalesInvoices._sum.total || 0) +
        totalDebitManual;

      const totalCredit =
        (prevPayments._sum.amount || 0) +
        (prevSalesReturns._sum.total || 0) +
        (prevTransfersFrom._sum.amount || 0) +
        (prevPurchInvoices._sum.total || 0) +
        totalCreditManual;

      openingBalance = totalDebit - totalCredit;
    }

    // 2. جلب المعاملات في الفترة المحددة
    const dateFilterVoucher = fromDate && toDate ? { date: { gte: fromDate, lte: toDate } } : {};
    const dateFilterReturn = fromDate && toDate ? { returnDate: { gte: fromDate, lte: toDate } } : {};
    const dateFilterInvoice = fromDate && toDate ? { invoiceDate: { gte: fromDate, lte: toDate } } : {};

    const [
      receipts,
      payments,
      salesReturns,
      purchReturns,
      transfersFrom,
      transfersTo,
      salesInvoices,
      purchaseInvoices,
      manualItems,
    ] = await Promise.all([
      (await getTenantPrisma()).receiptVoucher.findMany({
        where: { ...whereAccount, ...dateFilterVoucher },
        include: { customer: { select: { name: true } } },
        orderBy: { date: "asc" },
      }),
      (await getTenantPrisma()).paymentVoucher.findMany({
        where: { ...whereAccount, ...dateFilterVoucher },
        include: { supplier: { select: { name: true } } },
        orderBy: { date: "asc" },
      }),
      (await getTenantPrisma()).salesReturn.findMany({
        where: { ...whereAccount, ...dateFilterReturn },
        include: { customer: { select: { name: true } } },
        orderBy: { returnDate: "asc" },
      }),
      (await getTenantPrisma()).purchaseReturn.findMany({
        where: { ...whereAccount, ...dateFilterReturn },
        include: { supplier: { select: { name: true } } },
        orderBy: { returnDate: "asc" },
      }),
      (await getTenantPrisma()).treasuryTransfer.findMany({
        where: { ...whereAccountFrom, ...dateFilterVoucher },
        include: { toSafe: true, toBank: true },
        orderBy: { date: "asc" },
      }),
      (await getTenantPrisma()).treasuryTransfer.findMany({
        where: { ...whereAccountTo, ...dateFilterVoucher },
        include: { fromSafe: true, fromBank: true },
        orderBy: { date: "asc" },
      }),
      (await getTenantPrisma()).salesInvoice.findMany({
        where: { ...whereAccount, ...dateFilterInvoice, status: "cash" },
        include: { customer: { select: { name: true } } },
        orderBy: { invoiceDate: "asc" },
      }),
      (await getTenantPrisma()).purchaseInvoice.findMany({
        where: { ...whereAccount, ...dateFilterInvoice, status: "cash" },
        include: { supplier: { select: { name: true } } },
        orderBy: { invoiceDate: "asc" },
      }),
      (await getTenantPrisma()).journalItem.findMany({
        where: {
          accountId: safeBankAccountId,
          journalEntry: {
            sourceType: "MANUAL",
            ...(fromDate && toDate
              ? { date: { gte: fromDate, lte: toDate } }
              : {}),
          },
        },
        include: { journalEntry: true },
        orderBy: { journalEntry: { date: "asc" } },
      }),
    ]);

    // جلب إعدادات الشركة للبادئات
    const settings = await (await getTenantPrisma()).companySettings.findUnique({
      where: { id: 1 },
    });

    // 3. تحويل المعاملات
    const mappedReceipts: TransactionType[] = receipts.map((r: any) => ({
      id: `rec-${r.id}`,
      date: r.date,
      createdAt: r.createdAt,
      type: "سند قبض",
      documentId: r.voucherNumber,
      description: r.description || `قبض من العميل ${r.customer.name}`,
      paymentMethod: accountType === "safe" ? "نقدي" : "بنك",
      debit: r.amount,
      credit: 0,
    }));

    const mappedPayments: TransactionType[] = payments.map((p: any) => ({
      id: `pay-${p.id}`,
      date: p.date,
      createdAt: p.createdAt,
      type: "سند صرف",
      documentId: p.voucherNumber,
      description: p.description || `صرف للمورد ${p.supplier.name}`,
      paymentMethod: accountType === "safe" ? "نقدي" : "بنك",
      debit: 0,
      credit: p.amount,
    }));

    const mappedSalesReturns: TransactionType[] = salesReturns.map((r: any) => ({
      id: `sret-${r.id}`,
      date: r.returnDate,
      createdAt: r.createdAt,
      type: "مرتجع مبيعات",
      documentId: `SR-${String(r.returnNumber).padStart(4, "0")}`,
      description: `مرتجع مبيعات من العميل ${r.customer.name}`,
      paymentMethod: "نقدي",
      debit: 0,
      credit: r.total,
    }));

    const mappedPurchReturns: TransactionType[] = purchReturns.map((r: any) => ({
      id: `pret-${r.id}`,
      date: r.returnDate,
      createdAt: r.createdAt,
      type: "مرتجع مشتريات",
      documentId: `PR-${String(r.returnNumber).padStart(4, "0")}`,
      description: `مرتجع مشتريات من المورد ${r.supplier.name}`,
      paymentMethod: "نقدي",
      debit: r.total,
      credit: 0,
    }));

    const mappedTransfersFrom: TransactionType[] = transfersFrom.map(
      (t: any) => ({
        id: `tr-out-${t.id}`,
        date: t.date,
        createdAt: t.createdAt,
        type: "تحويل صادر",
        documentId: t.transferNumber,
        description: t.description || `تحويل إلى ${t.toSafe?.name || t.toBank?.name}`,
        paymentMethod: "تحويل",
        debit: 0,
        credit: t.amount,
      })
    );

    const mappedTransfersTo: TransactionType[] = transfersTo.map((t: any) => ({
      id: `tr-in-${t.id}`,
      date: t.date,
      createdAt: t.createdAt,
      type: "تحويل وارد",
      documentId: t.transferNumber,
      description: t.description || `تحويل من ${t.fromSafe?.name || t.fromBank?.name}`,
      paymentMethod: "تحويل",
      debit: t.amount,
      credit: 0,
    }));

    const mappedSalesInvoices: TransactionType[] = salesInvoices.map(
      (s: any) => ({
        id: `si-${s.id}`,
        date: s.invoiceDate,
        createdAt: s.createdAt,
        type: "فاتورة مبيعات",
        documentId: `${settings?.salesPrefix || "INV"}-${String(s.invoiceNumber).padStart(4, "0")}`,
        description: `فاتورة مبيعات كاش - ${s.customerName}`,
        paymentMethod: "نقدي",
        debit: s.total,
        credit: 0,
      })
    );

    const mappedPurchaseInvoices: TransactionType[] = purchaseInvoices.map(
      (p: any) => ({
        id: `pi-${p.id}`,
        date: p.invoiceDate,
        createdAt: p.createdAt,
        type: "فاتورة مشتريات",
        documentId: `${settings?.purchasePrefix || "PUR"}-${String(p.invoiceNumber).padStart(4, "0")}`,
        description: `فاتورة مشتريات كاش - ${p.supplierName}`,
        paymentMethod: "نقدي",
        debit: 0,
        credit: p.total,
      })
    );

    const mappedManualEntries: TransactionType[] = manualItems.map(
      (item: any) => ({
        id: `manual-${item.id}`,
        date: item.journalEntry.date,
        createdAt: item.journalEntry.createdAt,
        type: "قيد يدوي",
        documentId: `JV-${item.journalEntry.entryNumber}`,
        description: item.description || item.journalEntry.description,
        paymentMethod: "أخرى",
        debit: item.debit,
        credit: item.credit,
      })
    );

    // دمج وترتيب وحساب الرصيد التراكمي
    let allTransactions = [
      ...mappedReceipts,
      ...mappedPayments,
      ...mappedSalesReturns,
      ...mappedPurchReturns,
      ...mappedTransfersFrom,
      ...mappedTransfersTo,
      ...mappedSalesInvoices,
      ...mappedPurchaseInvoices,
      ...mappedManualEntries,
    ].sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    if (filterType !== "الكل") {
      allTransactions = allTransactions.filter((t) => t.type === filterType);
    }

    let currentBalance = openingBalance;
    allTransactions = allTransactions.map((t) => {
      currentBalance += t.debit - t.credit;
      return { ...t, runningBalance: currentBalance };
    });

    // عكس القائمة لتصبح الأحدث أولاً بعد حساب الرصيد التراكمي
    allTransactions.reverse();

    return { transactions: allTransactions, openingBalance };
  } catch (error) {
    console.error("Error fetching account transactions:", error);
    return { transactions: [], openingBalance: 0 };
  }
}
