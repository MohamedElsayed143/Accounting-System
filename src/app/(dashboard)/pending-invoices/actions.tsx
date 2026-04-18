"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { revalidatePath } from "next/cache";
import { triggerTreasuryAlert, triggerStockAlert } from "@/lib/notifications";
import { SequenceService } from "@/lib/services/SequenceService";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function getPendingInvoices() {
  const sales = await (await getTenantPrisma()).salesInvoice.findMany({
    where: { status: "pending" },
    include: { customer: { select: { name: true } }, items: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const purchases = await (await getTenantPrisma()).purchaseInvoice.findMany({
    where: { status: "pending" },
    include: { supplier: { select: { name: true } }, items: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return { sales, purchases };
}

export async function finalizeSalesInvoice(
  id: number,
  paymentData: {
    status: "cash" | "credit";
    safeId?: number;
    bankId?: number;
  },
) {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const canFinalize = await hasPermission(session.userId, "sales_create");
  if (!canFinalize) throw new Error("ليس لديك صلاحية تأكيد فواتير مبيعات");
    const result = await (await getTenantPrisma()).$transaction(async (tx) => {
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
      let treasuryAccountId: number | null = null;
      if (paymentData.safeId) {
        const updatedSafe = await tx.treasurySafe.update({
          where: { id: paymentData.safeId },
          data: { balance: { increment: invoice.total } },
        });
        treasuryAccountId = updatedSafe.accountId;
      } else if (paymentData.bankId) {
        const updatedBank = await tx.treasuryBank.update({
          where: { id: paymentData.bankId },
          data: { balance: { increment: invoice.total } },
        });
        treasuryAccountId = updatedBank.accountId;
      }

      // Add missing cash receipt journal entry
      const customer = await tx.customer.findUnique({
        where: { id: invoice.customerId },
        select: { accountId: true }
      });

      if (treasuryAccountId && customer?.accountId) {
        const receiptEntryNo = await SequenceService.getNextSequenceValue(tx, "JournalEntry");
        await tx.journalEntry.create({
          data: {
            entryNumber: receiptEntryNo,
            date: new Date(),
            description: `سداد نقدي (تأكيد) فاتورة #${invoice.invoiceNumber}`,
            sourceType: "RECEIPT_VOUCHER",
            sourceId: invoice.id,
            items: {
              create: [
                {
                  accountId: treasuryAccountId,
                  debit: invoice.total,
                  credit: 0,
                  description: `تحصيل نقدي فاتورة #${invoice.invoiceNumber}`,
                },
                {
                  accountId: customer.accountId,
                  debit: 0,
                  credit: invoice.total,
                  description: `تسوية سداد فاتورة #${invoice.invoiceNumber}`,
                },
              ],
            },
          },
        });
      }
    }

    // 2.5 قيد الإيراد الأساسي (مدين عميل / دائن مبيعات) - مضاف لضمان التكامل المحاسبي بعد التأكيد
    const customer = await tx.customer.findUnique({
      where: { id: invoice.customerId },
      select: { accountId: true }
    });
    const salesRevenueAccount = await tx.account.findUnique({
      where: { code: "4101" },
    });

    if (customer?.accountId && salesRevenueAccount) {
      const revenueEntryNo = await SequenceService.getNextSequenceValue(tx, "JournalEntry");
      await tx.journalEntry.create({
        data: {
          entryNumber: revenueEntryNo,
          date: new Date(),
          description: `إثبات إيراد (تأكيد) فاتورة #${invoice.invoiceNumber} - ${invoice.customerName}`,
          sourceType: "SALES_INVOICE",
          sourceId: invoice.id,
          items: {
            create: [
              {
                accountId: customer.accountId,
                debit: invoice.total,
                credit: 0,
                description: `قيمة فاتورة مبيعات #${invoice.invoiceNumber}`,
              },
              {
                accountId: salesRevenueAccount.id,
                debit: 0,
                credit: invoice.total,
                description: `إيراد مبيعات فاتورة #${invoice.invoiceNumber}`,
              },
            ],
          },
        },
      });
    }

    // 3. إنشاء حركات المخزون وتحديث الرصيد
    const inventoryAccount = await tx.account.findUnique({
      where: { code: "120301" },
    });
    const cogsAccount = await tx.account.findUnique({
      where: { code: "6101" },
    });

    if (!inventoryAccount) throw new Error("حساب المخزون 120301 غير موجود");
    if (!cogsAccount)
      throw new Error("حساب تكلفة البضاعة المباعة 6101 غير موجود");

    let salesCogsValue = 0;

    for (const item of invoice.items) {
      if (!item.productId) continue;

      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { currentStock: true, buyPrice: true },
      });
      const currentVal = product?.currentStock ?? 0;
      const actualDeduct = Math.min(currentVal, item.quantity);
      const shortage = item.quantity - actualDeduct;
      const unitCost = product?.buyPrice ?? 0;
      salesCogsValue += item.quantity * unitCost;

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

    if (salesCogsValue > 0) {
      const cogsEntryNo = await SequenceService.getNextSequenceValue(tx, "JournalEntry");
      await tx.journalEntry.create({
        data: {
          entryNumber: cogsEntryNo,
          date: new Date(),
          description: `قيد تكلفة البضاعة المباعة لفاتورة بيع رقم ${invoice.invoiceNumber}`,
          reference: `فاتورة بيع #${invoice.invoiceNumber}`,
          sourceType: "SALES_INVOICE",
          sourceId: invoice.id,
          items: {
            create: [
              {
                accountId: cogsAccount.id,
                debit: salesCogsValue,
                credit: 0,
                description: "تكلفة البضاعة المباعة",
              },
              {
                accountId: inventoryAccount.id,
                debit: 0,
                credit: salesCogsValue,
                description: "إخراج من مخزون البضاعة",
              },
            ],
          },
        },
      });
    }

    return {
      success: true,
      updatedAccount:
        paymentData.status === "cash"
          ? paymentData.safeId
            ? await tx.treasurySafe.findUnique({
                where: { id: paymentData.safeId },
                select: { name: true, balance: true },
              })
            : paymentData.bankId
              ? await tx.treasuryBank.findUnique({
                  where: { id: paymentData.bankId },
                  select: { name: true, balance: true },
                })
              : null
          : null,
      updatedProducts: await Promise.all(
        invoice.items
          .filter((i) => i.productId)
          .map(async (i) => {
            const p = await tx.product.findUnique({
              where: { id: i.productId! },
              select: { name: true, currentStock: true, minStock: true },
            });
            return p;
          }),
      ),
    };
  });

  // Fire alerts outside transaction
  if (result.updatedAccount) {
    await triggerTreasuryAlert(
      result.updatedAccount.name,
      result.updatedAccount.balance,
    );
  }
  if (result.updatedProducts) {
    for (const p of result.updatedProducts) {
      if (p) await triggerStockAlert(p.name, p.currentStock, p.minStock);
    }
  }

  revalidatePath("/pending-invoices");
  return result;
}

export async function finalizePurchaseInvoice(
  id: number,
  paymentData: {
    status: "cash" | "credit";
    safeId?: number;
    bankId?: number;
  },
) {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const canFinalize = await hasPermission(session.userId, "purchase_create");
  if (!canFinalize) throw new Error("ليس لديك صلاحية تأكيد فواتير مشتريات");
  const result = await (await getTenantPrisma()).$transaction(async (tx) => {
    const invoice = await tx.purchaseInvoice.findUnique({
      where: { id },
      include: {
        items: true,
        supplier: {
          select: { accountId: true },
        },
      },
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
        const safe = await tx.treasurySafe.findUnique({
          where: { id: paymentData.safeId },
        });
        if (!safe || safe.balance < invoice.total)
          throw new Error("رصيد الخزنة غير كافٍ");

        await tx.treasurySafe.update({
          where: { id: paymentData.safeId },
          data: { balance: { decrement: invoice.total } },
        });
      } else if (paymentData.bankId) {
        const bank = await tx.treasuryBank.findUnique({
          where: { id: paymentData.bankId },
        });
        if (!bank || bank.balance < invoice.total)
          throw new Error("رصيد البنك غير كافٍ");

        await tx.treasuryBank.update({
          where: { id: paymentData.bankId },
          data: { balance: { decrement: invoice.total } },
        });
      }
    }

    // 3. إنشاء حركات المخزون وتحديث الرصيد والأسعار
    const inventoryAccount = await tx.account.findUnique({
      where: { code: "120301" },
    });
    if (!inventoryAccount) throw new Error("حساب المخزون 120301 غير موجود");

    let goodsReceivedValue = 0;
    let paymentAccountId: number | null = null;

    if (paymentData.status === "credit") {
      paymentAccountId = invoice.supplier?.accountId ?? null;
      if (!paymentAccountId) {
        throw new Error(
          "لا يمكن إكمال القيد المحاسبي لفاتورة الشراء الائتمانية بدون حساب المورد المرتبط.",
        );
      }
    }

    for (const item of invoice.items) {
      if (!item.productId) continue;

      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { currentStock: true, buyPrice: true },
      });

      const currentStock = product?.currentStock ?? 0;
      const currentBuyPrice = product?.buyPrice ?? 0;
      const incomingQty = item.quantity;
      const incomingCost = item.unitPrice;
      const existingQty = Math.max(currentStock, 0);
      const totalQty = existingQty + incomingQty;
      const weightedCost =
        totalQty > 0
          ? (existingQty * currentBuyPrice + incomingQty * incomingCost) /
            totalQty
          : incomingCost;

      const lineValue = item.quantity * item.unitPrice;
      goodsReceivedValue += lineValue;

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
          buyPrice: weightedCost,
          sellPrice: item.sellingPrice,
          profitMargin: item.profitMargin,
        },
      });
    }

    if (goodsReceivedValue > 0) {
      if (paymentData.status === "cash") {
        if (paymentData.safeId) {
          const safe = await tx.treasurySafe.findUnique({
            where: { id: paymentData.safeId },
            select: { accountId: true },
          });
          if (!safe?.accountId)
            throw new Error("الخزنة المحددة غير مرتبطة بحساب مالي.");
          paymentAccountId = safe.accountId;
        } else if (paymentData.bankId) {
          const bank = await tx.treasuryBank.findUnique({
            where: { id: paymentData.bankId },
            select: { accountId: true },
          });
          if (!bank?.accountId)
            throw new Error("البنك المحدد غير مرتبط بحساب مالي.");
          paymentAccountId = bank.accountId;
        } else {
          throw new Error(
            "يجب اختيار خزنة أو بنك لتسجيل القيد المحاسبي لفاتورة الشراء النقدية.",
          );
        }
      }

      if (paymentAccountId) {
        const purchaseEntryNo = await SequenceService.getNextSequenceValue(tx, "JournalEntry");
        await tx.journalEntry.create({
          data: {
            entryNumber: purchaseEntryNo,
            date: new Date(),
            description: `قيد مخزون مشتريات فاتورة شراء رقم ${invoice.invoiceNumber}`,
            reference: `فاتورة شراء #${invoice.invoiceNumber}`,
            sourceType: "PURCHASE_INVOICE",
            sourceId: invoice.id,
            items: {
              create: [
                {
                  accountId: inventoryAccount.id,
                  debit: goodsReceivedValue,
                  credit: 0,
                  description: "إضافة مخزون مشتريات",
                },
                {
                  accountId: paymentAccountId,
                  debit: 0,
                  credit: goodsReceivedValue,
                  description: "دائن مقابل فاتورة شراء",
                },
              ],
            },
          },
        });
      }
    }

    return {
      success: true,
      updatedAccount:
        paymentData.status === "cash"
          ? paymentData.safeId
            ? await tx.treasurySafe.findUnique({
                where: { id: paymentData.safeId },
                select: { name: true, balance: true },
              })
            : paymentData.bankId
              ? await tx.treasuryBank.findUnique({
                  where: { id: paymentData.bankId },
                  select: { name: true, balance: true },
                })
              : null
          : null,
      updatedProducts: await Promise.all(
        invoice.items
          .filter((i) => i.productId)
          .map(async (i) => {
            const p = await tx.product.findUnique({
              where: { id: i.productId! },
              select: { name: true, currentStock: true, minStock: true },
            });
            return p;
          }),
      ),
    };
  });

  // Fire alerts outside transaction
  if (result.updatedAccount) {
    await triggerTreasuryAlert(
      result.updatedAccount.name,
      result.updatedAccount.balance,
    );
  }
  if (result.updatedProducts) {
    for (const p of result.updatedProducts) {
      if (p) await triggerStockAlert(p.name, p.currentStock, p.minStock);
    }
  }

  revalidatePath("/pending-invoices");
  return result;
}
