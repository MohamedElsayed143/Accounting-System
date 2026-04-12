"use server";

import { revalidatePath } from "next/cache";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { triggerTreasuryAlert } from "@/lib/notifications";

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
  const lastReturn = await (await getTenantPrisma()).purchaseReturn.findFirst({
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

    const returns = await (await getTenantPrisma()).purchaseReturn.findMany({
      where,
      include: {
        supplier: { select: { name: true, code: true } },
        invoice: { select: { invoiceNumber: true } },
        items: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
    const purchaseReturn = await (await getTenantPrisma()).purchaseReturn.findUnique({
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
    const invoice = await (await getTenantPrisma()).purchaseInvoice.findUnique({
      where: { id: data.invoiceId },
      include: { items: true },
    });
    if (!invoice) throw new Error("فاتورة الشراء غير موجودة");

    // ✅ التحقق من الكميات عبر مرتجعات سابقة
    const previousReturns = await (await getTenantPrisma()).purchaseReturn.findMany({
      where: { invoiceId: data.invoiceId },
      include: { items: true },
    });

    // حساب إجمالي المرتجعات لكل صنف سابقاً
    const previousReturnsByItem = new Map<number, number>();
    previousReturns.forEach(ret => {
      ret.items.forEach(item => {
        if (item.invoiceItemId) {
          const current = previousReturnsByItem.get(item.invoiceItemId) || 0;
          previousReturnsByItem.set(item.invoiceItemId, current + item.quantity);
        }
      });
    });

    // التحقق من أن الكمية المرتجعة لكل صنف لا تتجاوز الكمية المتاحة
    for (const returnItem of data.items) {
      if (!returnItem.invoiceItemId) continue;
      const originalItem = invoice.items.find(item => item.id === returnItem.invoiceItemId);
      if (!originalItem) {
        throw new Error(`الصنف غير موجود في فاتورة الشراء الأصلية`);
      }
      const returnedSoFar = previousReturnsByItem.get(returnItem.invoiceItemId) || 0;
      const available = originalItem.quantity - returnedSoFar;
      if (returnItem.quantity > available) {
        throw new Error(`الكمية المرتجعة للصنف "${originalItem.description}" (${returnItem.quantity}) تتجاوز المتاح (${available})`);
      }
    }

    // التحقق من أن قيمة المرتجع لا تتجاوز الرصيد المتبقي من الفاتورة
    const previousReturnsTotal = previousReturns.reduce((sum, ret) => sum + ret.total, 0);
    const availableTotal = invoice.total - previousReturnsTotal;
    if (data.total > availableTotal) {
      throw new Error(`إجمالي المرتجع (${data.total.toLocaleString()} ج.م) يتجاوز الرصيد المتبقي من الفاتورة (${availableTotal.toLocaleString()} ج.م)`);
    }

    // التحقق من صحة طريقة الرد
    if (data.refundMethod === 'safe' && !data.safeId) {
      throw new Error("يجب اختيار الخزنة");
    }
    if (data.refundMethod === 'bank' && !data.bankId) {
      throw new Error("يجب اختيار البنك");
    }

    // التحقق من كفاية الرصيد (لأننا سنقوم بإضافة رصيد للخزنة/البنك)
    if (data.refundMethod === 'safe' && data.safeId) {
      const safe = await (await getTenantPrisma()).treasurySafe.findUnique({
        where: { id: data.safeId },
      });
      if (!safe) throw new Error("الخزنة غير موجودة");
    } else if (data.refundMethod === 'bank' && data.bankId) {
      const bank = await (await getTenantPrisma()).treasuryBank.findUnique({
        where: { id: data.bankId },
      });
      if (!bank) throw new Error("البنك غير موجود");
    }

    // توليد رقم مرتجع
    let returnNumber = data.returnNumber;
    if (returnNumber === 0) {
      returnNumber = await generateReturnNumber();
    } else {
      const existing = await (await getTenantPrisma()).purchaseReturn.findUnique({
        where: { returnNumber },
      });
      if (existing) throw new Error(`رقم المرتجع ${returnNumber} مستخدم مسبقاً`);
    }

    const result = await (await getTenantPrisma()).$transaction(async (tx) => {
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

      // ✅ إنشاء حركات مخزون وتحديث الرصيد الحالي (مرتجع شراء = خروج -) - يعمل لجميع طرق الرد
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

      return {
        purchaseReturn,
        updatedAccount: ((data.refundMethod === 'safe' || data.refundMethod === 'cash') && data.safeId ? await tx.treasurySafe.findUnique({ where: { id: data.safeId }, select: { name: true, balance: true } }) : (data.refundMethod === 'bank' && data.bankId ? await tx.treasuryBank.findUnique({ where: { id: data.bankId }, select: { name: true, balance: true } }) : null))
      };
    });

    if (result.updatedAccount) {
      await triggerTreasuryAlert(result.updatedAccount.name, result.updatedAccount.balance);
    }

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
    const updated = await (await getTenantPrisma()).purchaseReturn.update({
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
    await (await getTenantPrisma()).$transaction(async (tx) => {
      // 1. استرجاع بيانات المرتجع مع الأصناف
      const purchaseReturn = await tx.purchaseReturn.findUnique({
        where: { id },
        include: { items: true, invoice: { include: { items: true } } }
      });
      if (!purchaseReturn) throw new Error("المرتجع غير موجود");

      // 2. عكس حركات المخزون (كان - خروج، سيصبح + دخول) وتحديث الرصيد - لجميع طرق الرد
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

      // 3. عكس حركة الخزنة/البنك (كان + قبض، سيصبح - صرف)
      if ((purchaseReturn.refundMethod === 'safe' || purchaseReturn.refundMethod === 'cash') && purchaseReturn.safeId) {
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