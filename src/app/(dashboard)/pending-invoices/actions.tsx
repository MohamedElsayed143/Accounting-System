"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { triggerTreasuryAlert, triggerStockAlert } from "@/lib/notifications";

export async function getPendingInvoices() {
  const sales = await prisma.salesInvoice.findMany({
    where: { status: "pending" },
    include: { customer: { select: { name: true } }, items: true },
    orderBy: { invoiceDate: "desc" },
  });

  const purchases = await prisma.purchaseInvoice.findMany({
    where: { status: "pending" },
    include: { supplier: { select: { name: true } }, items: true },
    orderBy: { invoiceDate: "desc" },
  });

  return { sales, purchases };
}

export async function finalizeSalesInvoice(id: number, paymentData: {
  status: "cash" | "credit";
  safeId?: number;
  bankId?: number;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.salesInvoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.status !== "pending") throw new Error("الفاتورة مؤكدة بالفعل");

    // 1. تحديث حالة الفاتورة
    await tx.salesInvoice.update({
      where: { id },
      data: {
        status: paymentData.status,
        safeId: paymentData.status === "cash" ? paymentData.safeId : null,
        bankId: paymentData.status === "cash" ? paymentData.bankId : null,
      },
    });

    // 2. تحديث الخزنة/البنك إذا كان الدفع نقدي
    if (paymentData.status === "cash") {
      if (paymentData.safeId) {
        await tx.treasurySafe.update({
          where: { id: paymentData.safeId },
          data: { balance: { increment: invoice.total } },
        });
      } else if (paymentData.bankId) {
        await tx.treasuryBank.update({
          where: { id: paymentData.bankId },
          data: { balance: { increment: invoice.total } },
        });
      }
    }

    // 3. إنشاء حركات المخزون وتحديث الرصيد
    for (const item of invoice.items) {
      if (!item.productId) continue;

      // فحص الرصيد الحالي قبل التخصيم
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { currentStock: true }
      });
      const currentVal = product?.currentStock ?? 0;
      const actualDeduct = Math.min(currentVal, item.quantity);
      const shortage = item.quantity - actualDeduct;

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: "SALE",
          quantity: -item.quantity,
          unitPrice: item.unitPrice,
          reference: `فاتورة بيع مؤكدة #${invoice.invoiceNumber}`,
          salesInvoiceId: invoice.id,
        },
      });

      if (shortage > 0) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "ADJUSTMENT",
            quantity: shortage,
            unitPrice: 0,
            reference: `تعديل تلقائي رصيد سالب #${invoice.invoiceNumber}`,
            notes: "تمت التسوية آلياً لأن الرصيد لا يمكن أن يقل عن الصفر",
            salesInvoiceId: invoice.id,
          },
        });
      }

      if (actualDeduct > 0) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: actualDeduct } },
        });
      }
    }

    return { 
      success: true,
      updatedAccount: (paymentData.status === "cash" ? (paymentData.safeId ? await tx.treasurySafe.findUnique({ where: { id: paymentData.safeId }, select: { name: true, balance: true } }) : (paymentData.bankId ? await tx.treasuryBank.findUnique({ where: { id: paymentData.bankId }, select: { name: true, balance: true } }) : null)) : null),
      updatedProducts: await Promise.all(invoice.items.filter(i => i.productId).map(async i => {
        const p = await tx.product.findUnique({ where: { id: i.productId! }, select: { name: true, currentStock: true, minStock: true } });
        return p;
      }))
    };
  });

  // Fire alerts outside transaction
  if (result.updatedAccount) {
    await triggerTreasuryAlert(result.updatedAccount.name, result.updatedAccount.balance);
  }
  if (result.updatedProducts) {
    for (const p of result.updatedProducts) {
      if (p) await triggerStockAlert(p.name, p.currentStock, p.minStock);
    }
  }

  revalidatePath("/pending-invoices");
}

export async function finalizePurchaseInvoice(id: number, paymentData: {
  status: "cash" | "credit";
  safeId?: number;
  bankId?: number;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.purchaseInvoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.status !== "pending") throw new Error("الفاتورة مؤكدة بالفعل");

    // 1. تحديث حالة الفاتورة
    await tx.purchaseInvoice.update({
      where: { id },
      data: {
        status: paymentData.status,
        safeId: paymentData.status === "cash" ? paymentData.safeId : null,
        bankId: paymentData.status === "cash" ? paymentData.bankId : null,
      },
    });

    // 2. تحديث الخزنة/البنك إذا كان الدفع نقدي
    if (paymentData.status === "cash") {
      if (paymentData.safeId) {
        const safe = await tx.treasurySafe.findUnique({ where: { id: paymentData.safeId } });
        if (!safe || safe.balance < invoice.total) throw new Error("رصيد الخزنة غير كافٍ");
        
        await tx.treasurySafe.update({
          where: { id: paymentData.safeId },
          data: { balance: { decrement: invoice.total } },
        });
      } else if (paymentData.bankId) {
        const bank = await tx.treasuryBank.findUnique({ where: { id: paymentData.bankId } });
        if (!bank || bank.balance < invoice.total) throw new Error("رصيد البنك غير كافٍ");

        await tx.treasuryBank.update({
          where: { id: paymentData.bankId },
          data: { balance: { decrement: invoice.total } },
        });
      }
    }

    // 3. إنشاء حركات المخزون وتحديث الرصيد والأسعار
    for (const item of invoice.items) {
      if (!item.productId) continue;

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: "PURCHASE",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          reference: `فاتورة شراء مؤكدة #${invoice.invoiceNumber}`,
          purchaseInvoiceId: invoice.id,
        },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { 
          currentStock: { increment: item.quantity },
          buyPrice: item.unitPrice,
          sellPrice: item.sellingPrice,
          profitMargin: item.profitMargin
        },
      });
    }

    return { 
      success: true,
      updatedAccount: (paymentData.status === "cash" ? (paymentData.safeId ? await tx.treasurySafe.findUnique({ where: { id: paymentData.safeId }, select: { name: true, balance: true } }) : (paymentData.bankId ? await tx.treasuryBank.findUnique({ where: { id: paymentData.bankId }, select: { name: true, balance: true } }) : null)) : null),
      updatedProducts: await Promise.all(invoice.items.filter(i => i.productId).map(async i => {
        const p = await tx.product.findUnique({ where: { id: i.productId! }, select: { name: true, currentStock: true, minStock: true } });
        return p;
      }))
    };
  });

  // Fire alerts outside transaction
  if (result.updatedAccount) {
    await triggerTreasuryAlert(result.updatedAccount.name, result.updatedAccount.balance);
  }
  if (result.updatedProducts) {
    for (const p of result.updatedProducts) {
      if (p) await triggerStockAlert(p.name, p.currentStock, p.minStock);
    }
  }

  revalidatePath("/pending-invoices");
}
