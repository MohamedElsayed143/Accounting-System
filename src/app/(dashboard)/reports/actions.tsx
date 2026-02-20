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
  type: "فاتورة" | "سند قبض" | "سند صرف" | "مرتجع";
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