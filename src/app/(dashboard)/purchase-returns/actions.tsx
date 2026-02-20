"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// تعريف الأنواع
export type PurchaseReturnItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
  invoiceItemId?: number;
};

export type PurchaseReturnInput = {
  returnNumber: number; // 0 يعني توليد تلقائي
  invoiceId: number;
  supplierId: number;
  returnDate: Date;
  subtotal: number;
  discount: number;
  totalTax: number;
  total: number;
  reason?: string;
  status: "pending" | "completed" | "rejected";
  refundMethod: "cash" | "safe" | "bank" | "credit";
  safeId?: number;
  bankId?: number;
  description?: string;
  items: PurchaseReturnItemInput[];
};

// توليد رقم مرتجع فريد
async function generateReturnNumber(): Promise<number> {
  const lastReturn = await prisma.purchaseReturn.findFirst({
    orderBy: { returnNumber: 'desc' },
  });
  return lastReturn ? lastReturn.returnNumber + 1 : 1;
}

// جلب جميع مرتجعات المشتريات
export async function getPurchaseReturns(
  supplierId?: number,
  fromDate?: Date,
  toDate?: Date,
  status?: string
) {
  try {
    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    if (status && status !== 'الكل') where.status = status;
    if (fromDate && toDate) {
      where.returnDate = { gte: fromDate, lte: toDate };
    }

    const returns = await prisma.purchaseReturn.findMany({
      where,
      include: {
        supplier: { select: { name: true, code: true } },
        invoice: { select: { invoiceNumber: true } },
        items: true,
      },
      orderBy: { returnDate: 'desc' },
    });
    return { success: true, data: returns };
  } catch (error) {
    console.error("Error fetching purchase returns:", error);
    return { success: false, error: "فشل في جلب المرتجعات" };
  }
}

// جلب مرتجع شراء واحد بالتفاصيل
export async function getPurchaseReturnById(id: number) {
  try {
    const purchaseReturn = await prisma.purchaseReturn.findUnique({
      where: { id },
      include: {
        supplier: true,
        invoice: { include: { supplier: true } },
        items: true,
        receiptVouchers: true,
      },
    });
    if (!purchaseReturn) throw new Error("المرتجع غير موجود");
    return { success: true, data: purchaseReturn };
  } catch (error) {
    console.error("Error fetching purchase return:", error);
    return { success: false, error: "فشل في جلب بيانات المرتجع" };
  }
}

// إنشاء مرتجع شراء جديد
export async function createPurchaseReturn(data: PurchaseReturnInput) {
  try {
    // التحقق من وجود الفاتورة
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id: data.invoiceId },
      include: { items: true },
    });
    if (!invoice) throw new Error("فاتورة الشراء غير موجودة");

    // التحقق من صحة طريقة الرد
    if (data.refundMethod === 'safe' && !data.safeId) {
      throw new Error("يجب اختيار الخزنة");
    }
    if (data.refundMethod === 'bank' && !data.bankId) {
      throw new Error("يجب اختيار البنك");
    }

    // التحقق من كفاية الرصيد (لأننا سنقوم بإضافة رصيد للخزنة/البنك)
    if (data.refundMethod === 'safe' && data.safeId) {
      // لا نحتاج للتحقق لأننا سنضيف رصيداً، ولكن يمكن التأكد من وجود الخزنة
      const safe = await prisma.treasurySafe.findUnique({
        where: { id: data.safeId },
      });
      if (!safe) throw new Error("الخزنة غير موجودة");
    } else if (data.refundMethod === 'bank' && data.bankId) {
      const bank = await prisma.treasuryBank.findUnique({
        where: { id: data.bankId },
      });
      if (!bank) throw new Error("البنك غير موجود");
    }

    // توليد رقم مرتجع
    let returnNumber = data.returnNumber;
    if (returnNumber === 0) {
      returnNumber = await generateReturnNumber();
    } else {
      const existing = await prisma.purchaseReturn.findUnique({
        where: { returnNumber },
      });
      if (existing) throw new Error(`رقم المرتجع ${returnNumber} مستخدم مسبقاً`);
    }

    const result = await prisma.$transaction(async (tx) => {
      // إنشاء المرتجع
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          returnNumber,
          invoiceId: data.invoiceId,
          supplierId: data.supplierId,
          returnDate: data.returnDate,
          subtotal: data.subtotal,
          discount: data.discount,
          totalTax: data.totalTax,
          total: data.total,
          reason: data.reason,
          status: data.status,
          refundMethod: data.refundMethod,
          safeId: data.refundMethod === 'safe' ? data.safeId : null,
          bankId: data.refundMethod === 'bank' ? data.bankId : null,
          description: data.description,
          items: {
            create: data.items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              total: item.total,
              invoiceItemId: item.invoiceItemId,
            })),
          },
        },
        include: { items: true },
      });

      // إنشاء سند قبض إذا كانت طريقة الرد نقدية (خزنة/بنك)
      if (data.refundMethod === 'safe' && data.safeId) {
        await tx.receiptVoucher.create({
          data: {
            voucherNumber: `RV-${Date.now()}`,
            date: data.returnDate,
            amount: data.total,
            description: `سند قبض لمرتجع مشتريات رقم ${returnNumber}`,
            accountType: 'safe',
            safeId: data.safeId,
            customerId: data.supplierId, // قد تحتاج لتعديل العلاقة
          },
        });
        // زيادة رصيد الخزنة
        await tx.treasurySafe.update({
          where: { id: data.safeId },
          data: { balance: { increment: data.total } },
        });
      } else if (data.refundMethod === 'bank' && data.bankId) {
        await tx.receiptVoucher.create({
          data: {
            voucherNumber: `RV-${Date.now()}`,
            date: data.returnDate,
            amount: data.total,
            description: `سند قبض لمرتجع مشتريات رقم ${returnNumber}`,
            accountType: 'bank',
            bankId: data.bankId,
            customerId: data.supplierId,
          },
        });
        await tx.treasuryBank.update({
          where: { id: data.bankId },
          data: { balance: { increment: data.total } },
        });
      }

      return purchaseReturn;
    });

    revalidatePath("/purchase-returns");
    revalidatePath("/treasury");
    revalidatePath(`/treasury/${data.safeId || data.bankId}`);
    revalidatePath(`/suppliers/${data.supplierId}`);
    revalidatePath(`/purchase-invoices/${data.invoiceId}`);
    revalidatePath("/reports");

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error creating purchase return:", error);
    return { success: false, error: error.message };
  }
}

// تحديث حالة مرتجع
export async function updatePurchaseReturnStatus(id: number, status: string) {
  try {
    const updated = await prisma.purchaseReturn.update({
      where: { id },
      data: { status: status as any },
    });
    revalidatePath("/purchase-returns");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating status:", error);
    return { success: false, error: "فشل في تحديث الحالة" };
  }
}

// حذف مرتجع
export async function deletePurchaseReturn(id: number) {
  try {
    await prisma.purchaseReturn.delete({ where: { id } });
    revalidatePath("/purchase-returns");
    return { success: true };
  } catch (error) {
    console.error("Error deleting purchase return:", error);
    return { success: false, error: "فشل في حذف المرتجع" };
  }
}