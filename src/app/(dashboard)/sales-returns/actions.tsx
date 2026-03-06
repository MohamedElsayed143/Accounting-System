"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

// تعريف الأنواع المستخدمة
export type SalesReturnItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
  invoiceItemId?: number;
};

export type SalesReturnInput = {
  returnNumber: number;
  invoiceId: number;
  customerId: number;
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
  items: SalesReturnItemInput[];
};

async function generateReturnNumber(): Promise<number> {
  const lastReturn = await prisma.salesReturn.findFirst({
    orderBy: { returnNumber: 'desc' },
  });
  return lastReturn ? lastReturn.returnNumber + 1 : 1;
}

export async function getNextSalesReturnNumber(): Promise<number> {
  const lastReturn = await prisma.salesReturn.findFirst({
    orderBy: { returnNumber: 'desc' },
    select: { returnNumber: true },
  });
  return lastReturn ? lastReturn.returnNumber + 1 : 1;
}

export async function getSalesReturns(
  customerId?: number,
  fromDate?: Date,
  toDate?: Date,
  status?: string
) {
  try {
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status && status !== 'الكل') where.status = status;
    if (fromDate && toDate) {
      where.returnDate = { gte: fromDate, lte: toDate };
    }

    const returns = await prisma.salesReturn.findMany({
      where,
      include: {
        customer: { select: { name: true, code: true } },
        invoice: { select: { invoiceNumber: true } },
        items: true,
      },
      orderBy: { returnDate: 'desc' },
    });
    return { success: true, data: returns };
  } catch (error) {
    console.error("Error fetching sales returns:", error);
    return { success: false, error: "فشل في جلب المرتجعات" };
  }
}

export async function getSalesReturnById(id: number) {
  try {
    const salesReturn = await prisma.salesReturn.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: { include: { customer: true } },
        items: true,
        paymentVouchers: true,
      },
    });
    if (!salesReturn) throw new Error("المرتجع غير موجود");
    return { success: true, data: salesReturn };
  } catch (error) {
    console.error("Error fetching sales return:", error);
    return { success: false, error: "فشل في جلب بيانات المرتجع" };
  }
}

export async function createSalesReturn(data: SalesReturnInput) {
  try {
    // التحقق من وجود الفاتورة مع المرتجعات السابقة والأصناف
    const invoice = await prisma.salesInvoice.findUnique({
      where: { id: data.invoiceId },
      include: { 
        items: true,
        salesReturns: { 
          include: { items: true } // لجلب تفاصيل المرتجعات السابقة
        }
      },
    });
    if (!invoice) throw new Error("الفاتورة غير موجودة");

    // حساب إجمالي المرتجعات السابقة لكل صنف والكمية المتبقية
    const previousReturnsByItem = new Map<number, number>();
    invoice.salesReturns.forEach(ret => {
      ret.items.forEach(item => {
        if (item.invoiceItemId) {
          const current = previousReturnsByItem.get(item.invoiceItemId) || 0;
          previousReturnsByItem.set(item.invoiceItemId, current + item.quantity);
        }
      });
    });

    // التحقق من أن الكمية المرتجعة لكل صنف لا تتجاوز المتاح
    for (const returnItem of data.items) {
      if (!returnItem.invoiceItemId) continue; // إذا لم يكن مرتبطاً بصنف معين، نتجاوز (يفضل ربطه دائماً)
      const originalItem = invoice.items.find(item => item.id === returnItem.invoiceItemId);
      if (!originalItem) {
        throw new Error(`الصنف غير موجود في الفاتورة الأصلية`);
      }
      const returnedSoFar = previousReturnsByItem.get(returnItem.invoiceItemId) || 0;
      const available = originalItem.quantity - returnedSoFar;
      if (returnItem.quantity > available) {
        throw new Error(`الكمية المرتجعة للصنف "${originalItem.description}" (${returnItem.quantity}) تتجاوز المتاح (${available})`);
      }
    }

    // حساب إجمالي المرتجعات السابقة للفاتورة
    const previousReturnsTotal = invoice.salesReturns.reduce((sum, ret) => sum + ret.total, 0);
    const availableTotal = invoice.total - previousReturnsTotal;

    // التحقق من أن قيمة المرتجع الجديد لا تتجاوز الرصيد المتبقي
    if (data.total > availableTotal) {
      throw new Error(`إجمالي المرتجع (${data.total.toLocaleString()} ج.م) يتجاوز الرصيد المتبقي من الفاتورة (${availableTotal.toLocaleString()} ج.م)`);
    }

    // التحقق من صحة طريقة الرد
    const isSafeRefund = data.refundMethod === 'safe' || data.refundMethod === 'cash';
    if (isSafeRefund && !data.safeId) {
      throw new Error("يجب اختيار الخزنة للرد النقدي");
    }
    if (data.refundMethod === 'bank' && !data.bankId) {
      throw new Error("يجب اختيار البنك");
    }

    // التحقق من كفاية الرصيد إذا كانت طريقة الرد safe أو bank
    if (isSafeRefund && data.safeId) {
      const safe = await prisma.treasurySafe.findUnique({
        where: { id: data.safeId },
        select: { balance: true }
      });
      if (!safe) throw new Error("الخزنة غير موجودة");
      if (safe.balance < data.total) {
        throw new Error(`⚠️ رصيد الخزنة غير كافٍ. الرصيد المتاح: ${safe.balance.toLocaleString()} ج.م`);
      }
    } else if (data.refundMethod === 'bank' && data.bankId) {
      const bank = await prisma.treasuryBank.findUnique({
        where: { id: data.bankId },
        select: { balance: true }
      });
      if (!bank) throw new Error("البنك غير موجود");
      if (bank.balance < data.total) {
        throw new Error(`⚠️ رصيد البنك غير كافٍ. الرصيد المتاح: ${bank.balance.toLocaleString()} ج.م`);
      }
    }

    // توليد رقم مرتجع إذا كان 0
    let returnNumber = data.returnNumber;
    if (returnNumber === 0) {
      returnNumber = await generateReturnNumber();
    } else {
      const existing = await prisma.salesReturn.findUnique({
        where: { returnNumber },
      });
      if (existing) throw new Error(`رقم المرتجع ${returnNumber} مستخدم مسبقاً`);
    }

    const result = await prisma.$transaction(async (tx) => {
      const salesReturn = await tx.salesReturn.create({
        data: {
          returnNumber,
          invoiceId: data.invoiceId,
          customerId: data.customerId,
          returnDate: data.returnDate,
          subtotal: data.subtotal,
          discount: data.discount,
          totalTax: data.totalTax,
          total: data.total,
          reason: data.reason,
          status: data.status,
          refundMethod: data.refundMethod,
          safeId: isSafeRefund ? data.safeId : null,
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

      // ✅ إنشاء حركات مخزون وتحديث الرصيد الحالي (مرتجع بيع = دخول +)
      for (const returnItem of data.items) {
        if (!returnItem.invoiceItemId) continue;
        const invoiceItem = invoice.items.find(i => i.id === returnItem.invoiceItemId);
        if (!(invoiceItem as any)?.productId) continue;

        const productId = (invoiceItem as any).productId;

        // 1. حساب كمية "البيع بدون رصيد" المتبقية لهذه الفاتورة وهذا المنتج
        const relatedMovements = await tx.stockMovement.findMany({
          where: {
            productId,
            salesInvoiceId: data.invoiceId,
            movementType: "ADJUSTMENT"
          }
        });
        
        // إجمالي التسويات الموجبة (النقص الأصلي) + إجمالي التسويات السالبة (المرتجعات الافتراضية السابقة)
        const remainingVirtual = relatedMovements.reduce((sum, m) => sum + m.quantity, 0);
        
        const virtualPart = Math.max(0, Math.min(returnItem.quantity, remainingVirtual));
        const realPart = returnItem.quantity - virtualPart;

        // الحركة الأساسية للمرتجع (للتوثيق والتقارير المالية)
        await tx.stockMovement.create({
          data: {
            productId,
            movementType: "SALE_RETURN",
            quantity: returnItem.quantity, // + دخول
            unitPrice: returnItem.unitPrice,
            reference: `مرتجع بيع #${returnNumber}`,
            salesReturnId: salesReturn.id,
          },
        });

        // إذا كان هناك جزء "افتراضي"، نقوم بعمل تسوية عكسية له لكي لا يزيد الرصيد الفعلي
        if (virtualPart > 0) {
          await tx.stockMovement.create({
            data: {
              productId,
              movementType: "ADJUSTMENT",
              quantity: -virtualPart,
              unitPrice: 0,
              reference: `تعديل تلقائي مرتجع بدون رصيد #${returnNumber}`,
              notes: "هذا الجزء تم بيعه أصلاً بدون رصيد لذا لا يضاف للمخزون عند إرجاعه",
              salesReturnId: salesReturn.id,
              salesInvoiceId: data.invoiceId, // نربطه بالفاتورة أيضاً لتسهيل الحساب مستقبلاً
            },
          });
        }

        // تحديث الرصيد الفعلي (الزيادة بالباقي فقط)
        if (realPart > 0) {
          await tx.product.update({
            where: { id: productId },
            data: { currentStock: { increment: realPart } }
          });
        }
      }

      // تحديث رصيد الخزنة/البنك مباشرة (بدون إنشاء سند صرف لأن سندات الصرف مرتبطة بالموردين وليس العملاء)
      if (isSafeRefund && data.safeId) {
        await tx.treasurySafe.update({
          where: { id: data.safeId },
          data: { balance: { decrement: data.total } },
        });
      } else if (data.refundMethod === 'bank' && data.bankId) {
        await tx.treasuryBank.update({
          where: { id: data.bankId },
          data: { balance: { decrement: data.total } },
        });
      }

      return salesReturn;
    });

    revalidatePath("/sales-returns");
    revalidatePath("/treasury");
    revalidatePath(`/treasury/${data.safeId || data.bankId}`);
    revalidatePath(`/customers/${data.customerId}`);
    revalidatePath(`/sales-invoices/${data.invoiceId}`);
    revalidatePath("/reports");
    revalidatePath("/inventory/stock");
    revalidatePath("/inventory/movements");

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error creating sales return:", error);
    return { success: false, error: error.message };
  }
}

export async function updateSalesReturnStatus(id: number, status: string) {
  try {
    const updated = await prisma.salesReturn.update({
      where: { id },
      data: { status: status as any },
    });
    revalidatePath("/sales-returns");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating status:", error);
    return { success: false, error: "فشل في تحديث الحالة" };
  }
}

export async function deleteSalesReturn(id: number) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. استرجاع بيانات المرتجع مع الأصناف
      const salesReturn = await tx.salesReturn.findUnique({
        where: { id },
        include: { items: true, invoice: { include: { items: true } } }
      });
      if (!salesReturn) throw new Error("المرتجع غير موجود");

      // 2. عكس أثر المخزون بالاعتماد على كامل الحركات المرتبطة بالمرتجع (مع مراعاة الأجزاء الافتراضية)
      const returnMovements = await tx.stockMovement.findMany({
        where: { salesReturnId: id },
        select: { productId: true, quantity: true }
      });

      const impacts: Record<number, number> = {};
      for (const mv of returnMovements) {
        impacts[mv.productId] = (impacts[mv.productId] || 0) + mv.quantity;
      }

      for (const [pId, qty] of Object.entries(impacts)) {
        if (qty > 0) { // الكمية الصافية التي أضيفت فعلياً للمخزون
          const product = await tx.product.findUnique({
            where: { id: Number(pId) },
            select: { currentStock: true }
          });
          const currentVal = product?.currentStock ?? 0;
          const actualDeduct = Math.min(currentVal, qty);

          if (actualDeduct > 0) {
            await tx.product.update({
              where: { id: Number(pId) },
              data: { currentStock: { decrement: actualDeduct } }
            });
          }
        }
      }

      // 3. عكس حركة الخزنة/البنك (كان - صرف، سيصبح + قبض)
      if ((salesReturn.refundMethod === 'safe' || salesReturn.refundMethod === 'cash') && salesReturn.safeId) {
        await tx.treasurySafe.update({
          where: { id: salesReturn.safeId },
          data: { balance: { increment: salesReturn.total } },
        });
      } else if (salesReturn.refundMethod === 'bank' && salesReturn.bankId) {
        await tx.treasuryBank.update({
          where: { id: salesReturn.bankId },
          data: { balance: { increment: salesReturn.total } },
        });
      }

      // 4. حذف حركات المخزون وحذف المرتجع نفسه
      await tx.stockMovement.deleteMany({ where: { salesReturnId: id } });
      await tx.salesReturn.delete({ where: { id } });
    });

    revalidatePath("/sales-returns");
    revalidatePath("/inventory/stock");
    revalidatePath("/treasury");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting sales return:", error);
    return { success: false, error: error.message || "فشل في حذف المرتجع" };
  }
}