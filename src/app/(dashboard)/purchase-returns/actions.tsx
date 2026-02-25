"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

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
          safeId: (data.refundMethod === 'safe' || data.refundMethod === 'cash') ? data.safeId : null,
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

      // ✅ إنشاء حركات مخزون (مرتجع شراء = خروج -) - فقط إذا كان المرتجع آجل (deferred)
      if (data.refundMethod === 'credit') {
        for (const returnItem of data.items) {
          if (!returnItem.invoiceItemId) continue;
          const invoiceItem = invoice.items.find(i => i.id === returnItem.invoiceItemId);
          if (!(invoiceItem as any)?.productId) continue;

          const productId = (invoiceItem as any).productId;

          // فحص المخزون — منع الرصيد السالب
          const product = await tx.product.findUnique({
            where: { id: productId },
            select: { name: true, currentStock: true }
          });

          if (!product) throw new Error("الصنف غير موجود");

          if (product.currentStock < returnItem.quantity) {
            throw new Error(`لا يوجد رصيد كافي في المخزون — المتوفر: ${product.currentStock}, المطلوب: ${returnItem.quantity}`);
          }

          await tx.stockMovement.create({
            data: {
              productId,
              movementType: "PURCHASE_RETURN",
              quantity: -returnItem.quantity, // خروج
              unitPrice: returnItem.unitPrice,
              reference: `مرتجع شراء #${returnNumber}`,
              purchaseReturnId: purchaseReturn.id,
            },
          });

          // تحديث الرصيد الحالي (خصم)
          await tx.product.update({
            where: { id: productId },
            data: { currentStock: { decrement: returnItem.quantity } }
          });
        }
      }

      // تحديث رصيد الخزنة/البنك مباشرة (بدون إنشاء سند قبض لأن سندات القبض مرتبطة بالعملاء وليس الموردين)
      if ((data.refundMethod === 'safe' || data.refundMethod === 'cash') && data.safeId) {
        await tx.treasurySafe.update({
          where: { id: data.safeId },
          data: { balance: { increment: data.total } },
        });
      } else if (data.refundMethod === 'bank' && data.bankId) {
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
    revalidatePath("/inventory/stock");
    revalidatePath("/inventory/movements");

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
    await prisma.$transaction(async (tx) => {
      // 1. استرجاع بيانات المرتجع مع الأصناف
      const purchaseReturn = await tx.purchaseReturn.findUnique({
        where: { id },
        include: { items: true, invoice: { include: { items: true } } }
      });
      if (!purchaseReturn) throw new Error("المرتجع غير موجود");

      // 2. عكس حركات المخزون (كان - خروج، سيصبح + دخول) وتحديث الرصيد - فقط للمرتجع الآجل
      if (purchaseReturn.refundMethod === 'credit') {
        for (const returnItem of purchaseReturn.items) {
          if (!returnItem.invoiceItemId) continue;
          const invoiceItem = purchaseReturn.invoice.items.find(i => i.id === returnItem.invoiceItemId);
          if (!(invoiceItem as any)?.productId) continue;

          const productId = (invoiceItem as any).productId;

          // إضافة للرصيد (لأننا نحذف المرتجع الذي أخرج كمية من المخزون)
          await tx.product.update({
            where: { id: productId },
            data: { currentStock: { increment: returnItem.quantity } }
          });
        }
      }

      // 3. عكس حركة الخزنة/البنك (كان + قبض، سيصبح - صرف)
      if (purchaseReturn.refundMethod === 'safe' && purchaseReturn.safeId) {
        await tx.treasurySafe.update({
          where: { id: purchaseReturn.safeId },
          data: { balance: { decrement: purchaseReturn.total } },
        });
      } else if (purchaseReturn.refundMethod === 'bank' && purchaseReturn.bankId) {
        await tx.treasuryBank.update({
          where: { id: purchaseReturn.bankId },
          data: { balance: { decrement: purchaseReturn.total } },
        });
      }

      // 4. حذف حركات المخزون وحذف المرتجع نفسه
      await tx.stockMovement.deleteMany({ where: { purchaseReturnId: id } });
      await tx.purchaseReturn.delete({ where: { id } });
    });

    revalidatePath("/purchase-returns");
    revalidatePath("/inventory/stock");
    revalidatePath("/treasury");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting purchase return:", error);
    return { success: false, error: error.message || "فشل في حذف المرتجع" };
  }
}