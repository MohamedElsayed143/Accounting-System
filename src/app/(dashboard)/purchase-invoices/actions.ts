// app/(dashboard)/purchase-invoices/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  triggerStaffActivityAlert,
  triggerStockAlert,
  triggerTreasuryAlert,
} from "@/lib/notifications";

// ─── أنواع البيانات ─────────────────────────────────────────────────────────
export interface PurchaseInvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  sellingPrice: number;
  profitMargin: number;
  taxRate: number;

  discount: number;
  total: number;
  productId?: number | null;
}

export interface PurchaseInvoice {
  id: number;
  invoiceNumber: number;
  supplierName: string;
  supplierId: number;
  invoiceDate: Date | string;
  subtotal: number;
  totalTax: number;
  discount: number;
  total: number;
  status: "cash" | "credit" | "pending";
  items: PurchaseInvoiceItem[];
  topNotes?: string[];
  notes?: string[];
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date | string | null;
  returnsCount?: number;
  returnsTotal?: number;
  netTotal?: number;
  printableTitle?: string;
}

// ─── جلب كل الفواتير مع عدد المرتجعات وقيمتها ─────────────────────────────
export async function getPurchaseInvoices() {
  const session = await getSession();
  if (!session) return [];

  const canView = await hasPermission(session.userId, "purchase_view");
  if (!canView) return [];

  const invoices = await prisma.purchaseInvoice.findMany({
    orderBy: { invoiceDate: "desc" },
    include: {
      items: true,
      purchaseReturns: {
        select: { total: true },
      },
    },
  });

  return invoices.map((inv) => {
    const returnsTotal = inv.purchaseReturns.reduce(
      (sum, ret) => sum + ret.total,
      0,
    );
    return {
      ...inv,
      status: inv.status as "cash" | "credit" | "pending",
      returnsCount: inv.purchaseReturns.length,
      returnsTotal,
      netTotal: inv.total - returnsTotal,
    };
  });
}

// ─── جلب فاتورة واحدة بواسطة المعرف (مع المرتجعات) ──────────────────────────
export async function getPurchaseInvoiceById(id: number) {
  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      items: true,
      supplier: true,
      purchaseReturns: {
        select: { total: true },
      },
    },
  });

  if (!invoice) return null;

  const returnsTotal = invoice.purchaseReturns.reduce(
    (sum, ret) => sum + ret.total,
    0,
  );
  return {
    ...invoice,
    status: invoice.status as "cash" | "credit" | "pending",
    returnsCount: invoice.purchaseReturns.length,
    returnsTotal,
    netTotal: invoice.total - returnsTotal,
  };
}

// ─── الحصول على رقم الفاتورة التالي (تلقائي) ───────────────────────────────
export async function getNextPurchaseInvoiceNumber(): Promise<number> {
  const last = await prisma.purchaseInvoice.findFirst({
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  return (last?.invoiceNumber ?? 0) + 1;
}

// ─── التحقق من وجود رقم الفاتورة ───────────────────────────────────────────
export async function checkPurchaseInvoiceNumberExists(
  invoiceNumber: number,
): Promise<boolean> {
  const found = await prisma.purchaseInvoice.findUnique({
    where: { invoiceNumber },
    select: { id: true },
  });
  return !!found;
}

// ─── إنشاء فاتورة جديدة (مع حركات المخزون) ─────────────────────────────────
export async function createPurchaseInvoice(data: {
  invoiceNumber: number;
  supplierId: number;
  supplierName: string;
  invoiceDate: string;
  subtotal: number;
  totalTax: number;
  discount: number;
  total: number;
  status: "cash" | "credit" | "pending";
  safeId?: number;
  bankId?: number;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    sellingPrice: number;
    profitMargin: number;
    taxRate: number;
    discount: number;
    total: number;
    productId: number;
  }[];
  topNotes?: string[];
  notes?: string[];
  dueDate?: string;
  printableTitle?: string;
}) {
  const user_session = await getSession();
  if (!user_session) throw new Error("يجب تسجيل الدخول أولاً");

  const canCreate = await hasPermission(user_session.userId, "purchase_create");
  if (!canCreate) throw new Error("ليس لديك صلاحية إنشاء فواتير مشتريات");

  if (!data.supplierId) throw new Error("يجب اختيار المورد أولاً");
  if (data.items.length === 0) throw new Error("لا يمكن حفظ فاتورة فارغة");
  if (data.status === "cash" && !data.safeId && !data.bankId) {
    throw new Error("يجب تحديد جهة الصرف (الخزنة أو البنك) للفواتير النقدية");
  }

  const pendingAlerts: {
    type: "treasury" | "stock";
    name: string;
    value: number;
    limit?: number;
  }[] = [];

  const result = await (prisma as any).$transaction(async (tx: any) => {
    // 1. التحقق من رقم الفاتورة
    const taken = await tx.purchaseInvoice.findUnique({
      where: { invoiceNumber: data.invoiceNumber },
      select: { id: true },
    });
    if (taken)
      throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);

    // 2. التحقق من الأصناف (يجب أن تكون نشطة)
    for (const item of data.items) {
      const exists = await tx.product.findUnique({
        where: { id: item.productId, isActive: true },
        select: { name: true },
      });
      if (!exists)
        throw new Error(
          `أحد الأصناف المختارة غير متوفر أو تم إيقاف التعامل معه`,
        );
    }

    // 3. إنشاء الفاتورة
    const invoice = await tx.purchaseInvoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        invoiceDate: new Date(data.invoiceDate),
        subtotal: data.subtotal,
        totalTax: data.totalTax,
        discount: data.discount,
        total: data.total,
        status: data.status,
        safeId: data.status === "cash" && data.safeId ? data.safeId : null,
        bankId: data.status === "cash" && data.bankId ? data.bankId : null,
        printableTitle: data.printableTitle,
        topNotes: data.topNotes || [],
        notes: data.notes || [],
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sellingPrice: item.sellingPrice,
            profitMargin: item.profitMargin,
            taxRate: item.taxRate,
            discount: item.discount,
            total: item.total,
            productId: item.productId,
          })),
        },
      },
      include: {
        supplier: { select: { accountId: true, name: true } },
        items: true,
      },
    });

    // 3.1. إنشاء حركات المخزون وتحديث الأسعار إذا كانت الفاتورة نهائية
    const inventoryAccount = await tx.account.findUnique({
      where: { code: "120301" },
    });
    if (!inventoryAccount)
      throw new Error("حساب مخزون البضاعة 120301 غير موجود");

    if (data.status !== "pending") {
      const invoiceItems = invoice.items ?? [];
      for (const item of invoiceItems) {
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
    }

    // 3.2. إنشاء قيد المحاسبي لفاتورة الشراء
    const supplierAccountId = invoice.supplier?.accountId;
    if (!supplierAccountId) throw new Error("المورد غير مربوط بحساب محاسبي");

    const lastEntry = await tx.journalEntry.findFirst({
      orderBy: { entryNumber: "desc" },
      select: { entryNumber: true },
    });
    const entryNumber = (lastEntry?.entryNumber || 0) + 1;

    await tx.journalEntry.create({
      data: {
        entryNumber,
        date: invoice.invoiceDate,
        description: `فاتورة مشتريات #${invoice.invoiceNumber} - ${invoice.supplierName}`,
        sourceType: "PURCHASE_INVOICE",
        sourceId: invoice.id,
        items: {
          create: [
            {
              accountId: inventoryAccount.id,
              debit: invoice.total,
              credit: 0,
              description: `قيمة فاتورة مشتريات #${invoice.invoiceNumber}`,
            },
            {
              accountId: supplierAccountId,
              debit: 0,
              credit: invoice.total,
              description: `استحقاق مورد فاتورة #${invoice.invoiceNumber}`,
            },
          ],
        },
      },
    });

    // 3.2. إذا كانت الفاتورة كاش، نسجل سند الصرف آلياً
    if (data.status === "cash") {
      let treasuryAccountId: number | null = null;
      if (data.safeId) {
        const safe = await tx.treasurySafe.findUnique({
          where: { id: data.safeId },
          select: { accountId: true },
        });
        treasuryAccountId = safe?.accountId || null;
      } else if (data.bankId) {
        const bank = await tx.treasuryBank.findUnique({
          where: { id: data.bankId },
          select: { accountId: true },
        });
        treasuryAccountId = bank?.accountId || null;
      }

      if (treasuryAccountId) {
        const lastEntryCash = await tx.journalEntry.findFirst({
          orderBy: { entryNumber: "desc" },
          select: { entryNumber: true },
        });
        const entryNumberCash = (lastEntryCash?.entryNumber || 0) + 1;

        await tx.journalEntry.create({
          data: {
            entryNumber: entryNumberCash,
            date: invoice.invoiceDate,
            description: `سداد نقدي فاتورة مشتريات #${invoice.invoiceNumber} - ${invoice.supplierName}`,
            sourceType: "PAYMENT_VOUCHER",
            sourceId: invoice.id,
            items: {
              create: [
                {
                  accountId: supplierAccountId,
                  debit: invoice.total,
                  credit: 0,
                  description: `تسوية سداد فاتورة مشتريات #${invoice.invoiceNumber}`,
                },
                {
                  accountId: treasuryAccountId,
                  debit: 0,
                  credit: invoice.total,
                  description: `صرف نقدي فاتورة مشتريات #${invoice.invoiceNumber}`,
                },
              ],
            },
          },
        });
      }
    }

    // 3.5 تحديث الخزنة أو البنك إذا كانت الفاتورة كاش (خصم للمشتريات) (فقط إذا لم تكن معلقة)
    if (data.status === "cash" && (data.safeId || data.bankId)) {
      if (data.safeId) {
        // التحقق من الرصيد
        const safe = await tx.treasurySafe.findUnique({
          where: { id: data.safeId },
        });
        if (!safe) throw new Error("الخزنة المختارة غير موجودة");
        if (safe.balance < data.total)
          throw new Error(`رصيد الخزنة غير كافٍ (المتاح: ${safe.balance})`);

        const updatedSafe = await tx.treasurySafe.update({
          where: { id: data.safeId },
          data: { balance: { decrement: data.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedSafe.name,
          value: updatedSafe.balance,
        });
      } else if (data.bankId) {
        // التحقق من الرصيد
        const bank = await tx.treasuryBank.findUnique({
          where: { id: data.bankId },
        });
        if (!bank) throw new Error("البنك المختار غير موجود");
        if (bank.balance < data.total)
          throw new Error(`رصيد البنك غير كافٍ (المتاح: ${bank.balance})`);

        const updatedBank = await tx.treasuryBank.update({
          where: { id: data.bankId },
          data: { balance: { decrement: data.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedBank.name,
          value: updatedBank.balance,
        });
      }
    }

    // 4. إنشاء حركات مخزون وتحديث الرصيد الحالي وتحديث أسعار المنتج (فقط إذا لم تكن معلقة)
    if (data.status !== "pending") {
      for (const item of data.items) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "PURCHASE",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            reference: `فاتورة شراء #${data.invoiceNumber}`,
            purchaseInvoiceId: invoice.id,
          },
        });

        // تحديث الرصيد في بطاقة الصنف وتحديث الأسعار
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.quantity },
            buyPrice: item.unitPrice,
            sellPrice: item.sellingPrice,
            profitMargin: item.profitMargin,
            taxRate: item.taxRate,
          },
        });
        pendingAlerts.push({
          type: "stock",
          name: updatedProduct.name,
          value: updatedProduct.currentStock,
          limit: updatedProduct.minStock,
        });
      }
    }

    revalidatePath("/purchase-invoices");
    revalidatePath("/inventory/stock");
    revalidatePath("/suppliers");
    revalidatePath("/ledger");
    revalidatePath("/ledger/coa");

    return invoice;
  });

  if (user_session && result) {
    await triggerStaffActivityAlert(
      user_session.user,
      "فاتورة مشتريات جديدة",
      `تم إنشاء فاتورة مشتريات #${result.invoiceNumber} من المورد ${result.supplierName} بقيمة ${result.total}`,
    );
  }

  for (const alert of pendingAlerts) {
    if (alert.type === "treasury") {
      await triggerTreasuryAlert(alert.name, alert.value);
    } else if (alert.type === "stock") {
      await triggerStockAlert(alert.name, alert.value, alert.limit || 0);
    }
  }

  return result;
}

// ─── تحديث فاتورة موجودة (مع تحديث حركات المخزون) ────────────────────────
export async function updatePurchaseInvoice(
  id: number,
  data: {
    invoiceNumber: number;
    supplierId: number;
    supplierName: string;
    invoiceDate: string;
    subtotal: number;
    totalTax: number;
    discount: number;
    total: number;
    status: "cash" | "credit" | "pending";
    safeId?: number;
    bankId?: number;
    items: {
      description: string;
      quantity: number;
      unitPrice: number;
      sellingPrice: number;
      profitMargin: number;
      taxRate: number;
      discount: number;
      total: number;
      productId: number;
    }[];
    topNotes?: string[];
    notes?: string[];
    dueDate?: string;
    printableTitle?: string;
  },
) {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً");

  const pendingAlerts: {
    type: "treasury" | "stock";
    name: string;
    value: number;
    limit?: number;
  }[] = [];

  const canEdit = await hasPermission(session.userId, "purchase_edit");
  if (!canEdit) throw new Error("ليس لديك صلاحية تعديل فواتير مشتريات");

  if (!data.supplierId) throw new Error("يجب اختيار المورد أولاً");
  if (data.status === "cash" && !data.safeId && !data.bankId) {
    throw new Error("يجب تحديد جهة الصرف (الخزنة أو البنك) للفواتير النقدية");
  }

  const result = await (prisma as any).$transaction(async (tx: any) => {
    const existingInvoice = await tx.purchaseInvoice.findUnique({
      where: { id },
      select: {
        status: true,
        total: true,
        safeId: true,
        bankId: true,
        invoiceNumber: true,
      },
    });

    if (!existingInvoice) throw new Error("الفاتورة غير موجودة");

    if (existingInvoice.status !== data.status) {
      throw new Error(
        "لا يمكن تغيير نوع الفاتورة بعد الحفظ لحماية حركات الخزنة والبنك",
      );
    }

    if (existingInvoice.status === "cash") {
      if (
        existingInvoice.safeId !== data.safeId ||
        existingInvoice.bankId !== data.bankId
      ) {
        throw new Error(
          "لا يمكن تغيير جهة الدفع (الخزنة/البنك) بعد الحفظ لضمان سلامة العمليات المالية",
        );
      }
    }

    if (existingInvoice.invoiceNumber !== data.invoiceNumber) {
      const numberTaken = await tx.purchaseInvoice.findUnique({
        where: { invoiceNumber: data.invoiceNumber },
        select: { id: true },
      });
      if (numberTaken)
        throw new Error(`رقم الفاتورة #${data.invoiceNumber} مستخدم مسبقاً`);
    }

    // 0. عكس أثر الخزنة القديم إذا كانت كاش
    if (existingInvoice.status === "cash") {
      if (existingInvoice.safeId) {
        const updatedSafe = await tx.treasurySafe.update({
          where: { id: existingInvoice.safeId },
          data: { balance: { increment: existingInvoice.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedSafe.name,
          value: updatedSafe.balance,
        });
      } else if (existingInvoice.bankId) {
        const updatedBank = await tx.treasuryBank.update({
          where: { id: existingInvoice.bankId },
          data: { balance: { increment: existingInvoice.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedBank.name,
          value: updatedBank.balance,
        });
      }
    }

    // 1. استرجاع الكميات القديمة لتعديل الرصيد (مع منع الرصيد السالب)
    const oldItems = await tx.purchaseInvoiceItem.findMany({
      where: { invoiceId: id },
      select: { productId: true, quantity: true },
    });

    for (const oldItem of oldItems) {
      if (oldItem.productId) {
        const product = await tx.product.findUnique({
          where: { id: oldItem.productId },
          select: { currentStock: true },
        });
        const currentVal = product?.currentStock ?? 0;
        const actualDeduct = Math.min(currentVal, oldItem.quantity);
        const shortage = oldItem.quantity - actualDeduct;

        if (shortage > 0) {
          // تسجيل تسوية تعويضية لأننا سحبنا رصيداً غير موجود (مثلاً تم بيعه)
          await tx.stockMovement.create({
            data: {
              productId: oldItem.productId,
              movementType: "ADJUSTMENT",
              quantity: shortage,
              unitPrice: 0,
              reference: `تعديل تلقائي (تحديث فاتورة مشتريات #${existingInvoice.invoiceNumber})`,
              notes: "تمت التسوية آلياً لمنع الرصيد السالب عند تعديل الفاتورة",
              purchaseInvoiceId: id,
            },
          });
        }

        if (actualDeduct > 0) {
          const updatedProduct = await tx.product.update({
            where: { id: oldItem.productId },
            data: { currentStock: { decrement: actualDeduct } },
          });
          pendingAlerts.push({
            type: "stock",
            name: updatedProduct.name,
            value: updatedProduct.currentStock,
            limit: updatedProduct.minStock,
          });
        }
      }
    }

    // 2. حذف الأصناف القديمة وحركات المخزون
    await tx.purchaseInvoiceItem.deleteMany({ where: { invoiceId: id } });
    await tx.stockMovement.deleteMany({ where: { purchaseInvoiceId: id } });

    // 3. التحقق من الأصناف
    for (const item of data.items) {
      const exists = await tx.product.findUnique({
        where: { id: item.productId, isActive: true },
        select: { id: true },
      });
      if (!exists) throw new Error(`أحد الأصناف المختارة تم إيقاف التعامل معه`);
    }

    const invoice = await tx.purchaseInvoice.update({
      where: { id },
      data: {
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        invoiceDate: new Date(data.invoiceDate),
        subtotal: data.subtotal,
        totalTax: data.totalTax,
        discount: data.discount,
        total: data.total,
        status: data.status,
        safeId: data.status === "cash" && data.safeId ? data.safeId : null,
        bankId: data.status === "cash" && data.bankId ? data.bankId : null,
        printableTitle: data.printableTitle,
        topNotes: data.topNotes || [],
        notes: data.notes || [],
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sellingPrice: item.sellingPrice,
            profitMargin: item.profitMargin,
            taxRate: item.taxRate,
            discount: item.discount,
            total: item.total,
            productId: item.productId,
          })),
        },
      },
      include: {
        supplier: { select: { accountId: true } },
      },
    });

    // 3.6. تحديث قيد المحاسبة (حذف القديم وإنشاء جديد)
    await tx.journalEntry.deleteMany({
      where: { sourceType: "PURCHASE_INVOICE", sourceId: id },
    });
    // أيضاً حذف أي سند صرف نظامي مرتبط بهذه الفاتورة
    await tx.journalEntry.deleteMany({
      where: {
        sourceType: "PAYMENT_VOUCHER",
        sourceId: id,
        description: {
          contains: `سداد نقدي فاتورة مشتريات #${invoice.invoiceNumber}`,
        },
      },
    });

    const supplierAccountId = invoice.supplier?.accountId;
    if (supplierAccountId) {
      const purchasesAccount = await tx.account.findUnique({
        where: { code: "610401" },
      });
      if (purchasesAccount) {
        const lastEntry = await tx.journalEntry.findFirst({
          orderBy: { entryNumber: "desc" },
          select: { entryNumber: true },
        });
        const entryNumber = (lastEntry?.entryNumber || 0) + 1;

        await tx.journalEntry.create({
          data: {
            entryNumber,
            date: invoice.invoiceDate,
            description: `تعديل فاتورة مشتريات #${invoice.invoiceNumber} - ${invoice.supplierName}`,
            sourceType: "PURCHASE_INVOICE",
            sourceId: invoice.id,
            items: {
              create: [
                {
                  accountId: purchasesAccount.id,
                  debit: invoice.total,
                  credit: 0,
                  description: `تعديل قيمة فاتورة مشتريات #${invoice.invoiceNumber}`,
                },
                {
                  accountId: supplierAccountId,
                  debit: 0,
                  credit: invoice.total,
                  description: `تعديل استحقاق مورد فاتورة #${invoice.invoiceNumber}`,
                },
              ],
            },
          },
        });

        if (data.status === "cash") {
          let treasuryAccountId: number | null = null;
          if (data.safeId) {
            const safe = await tx.treasurySafe.findUnique({
              where: { id: data.safeId },
              select: { accountId: true },
            });
            treasuryAccountId = safe?.accountId || null;
          } else if (data.bankId) {
            const bank = await tx.treasuryBank.findUnique({
              where: { id: data.bankId },
              select: { accountId: true },
            });
            treasuryAccountId = bank?.accountId || null;
          }

          if (treasuryAccountId) {
            const lastEntryCash = await tx.journalEntry.findFirst({
              orderBy: { entryNumber: "desc" },
              select: { entryNumber: true },
            });
            const entryNumberCash = (lastEntryCash?.entryNumber || 0) + 1;

            await tx.journalEntry.create({
              data: {
                entryNumber: entryNumberCash,
                date: invoice.invoiceDate,
                description: `سداد نقدي فاتورة مشتريات #${invoice.invoiceNumber} - ${invoice.supplierName}`,
                sourceType: "PAYMENT_VOUCHER",
                sourceId: invoice.id,
                items: {
                  create: [
                    {
                      accountId: supplierAccountId,
                      debit: invoice.total,
                      credit: 0,
                      description: `تسوية سداد فاتورة مشتريات #${invoice.invoiceNumber}`,
                    },
                    {
                      accountId: treasuryAccountId,
                      debit: 0,
                      credit: invoice.total,
                      description: `صرف نقدي فاتورة مشتريات #${invoice.invoiceNumber}`,
                    },
                  ],
                },
              },
            });
          }
        }
      }
    }

    // 4. تطبيق أثر الخزنة الجديد إذا كانت كاش
    if (data.status === "cash" && (data.safeId || data.bankId)) {
      if (data.safeId) {
        // التحقق من الرصيد
        const safe = await tx.treasurySafe.findUnique({
          where: { id: data.safeId },
        });
        if (!safe) throw new Error("الخزنة المختارة غير موجودة");
        if (safe.balance < data.total)
          throw new Error(`رصيد الخزنة غير كافٍ (المتاح: ${safe.balance})`);

        const updatedSafe = await tx.treasurySafe.update({
          where: { id: data.safeId },
          data: { balance: { decrement: data.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedSafe.name,
          value: updatedSafe.balance,
        });
      } else if (data.bankId) {
        // التحقق من الرصيد
        const bank = await tx.treasuryBank.findUnique({
          where: { id: data.bankId },
        });
        if (!bank) throw new Error("البنك المختار غير موجود");
        if (bank.balance < data.total)
          throw new Error(`رصيد البنك غير كافٍ (المتاح: ${bank.balance})`);

        const updatedBank = await tx.treasuryBank.update({
          where: { id: data.bankId },
          data: { balance: { decrement: data.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedBank.name,
          value: updatedBank.balance,
        });
      }
    }

    for (const item of data.items) {
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: "PURCHASE",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          reference: `فاتورة شراء #${data.invoiceNumber}`,
          purchaseInvoiceId: invoice.id,
        },
      });

      // تحديث الرصيد الجديد والأسعار
      const updatedProduct = await tx.product.update({
        where: { id: item.productId },
        data: {
          currentStock: { increment: item.quantity },
          buyPrice: item.unitPrice,
          sellPrice: item.sellingPrice,
          profitMargin: item.profitMargin,
          taxRate: item.taxRate,
        },
      });
      pendingAlerts.push({
        type: "stock",
        name: updatedProduct.name,
        value: updatedProduct.currentStock,
        limit: updatedProduct.minStock,
      });
    }

    return invoice;
  });

  if (session) {
    await triggerStaffActivityAlert(
      session.user,
      "تعديل فاتورة مشتريات",
      `تم تعديل فاتورة مشتريات #${data.invoiceNumber} للمورد ${data.supplierName} بقيمة ${data.total}`,
    );
  }

  for (const alert of pendingAlerts) {
    if (alert.type === "treasury") {
      await triggerTreasuryAlert(alert.name, alert.value);
    } else if (alert.type === "stock") {
      await triggerStockAlert(alert.name, alert.value, alert.limit || 0);
    }
  }

  revalidatePath("/purchase-invoices");
  revalidatePath("/inventory/stock");
  revalidatePath("/suppliers");
  revalidatePath("/ledger");
  revalidatePath("/ledger/coa");

  return { invoice: result };
}

// ─── حذف فاتورة (مع حذف حركات المخزون المرتبطة) ─────────────────────────
export async function deletePurchaseInvoice(id: number) {
  const user_session = await getSession();
  if (!user_session) throw new Error("يجب تسجيل الدخول أولاً");

  const canDelete = await hasPermission(user_session.userId, "purchase_delete");
  if (!canDelete) throw new Error("ليس لديك صلاحية حذف فواتير مشتريات");

  const pendingAlerts: { type: "treasury"; name: string; value: number }[] = [];

  await prisma.$transaction(async (tx) => {
    // 0. جلب بيانات الفاتورة لمعرفة حالتها וחساباتها
    const invoice = await tx.purchaseInvoice.findUnique({
      where: { id },
      select: { status: true, total: true, safeId: true, bankId: true },
    });

    if (invoice && invoice.status === "cash") {
      if (invoice.safeId) {
        const updatedSafe = await tx.treasurySafe.update({
          where: { id: invoice.safeId },
          data: { balance: { increment: invoice.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedSafe.name,
          value: updatedSafe.balance,
        });
      } else if (invoice.bankId) {
        const updatedBank = await tx.treasuryBank.update({
          where: { id: invoice.bankId },
          data: { balance: { increment: invoice.total } },
        });
        pendingAlerts.push({
          type: "treasury",
          name: updatedBank.name,
          value: updatedBank.balance,
        });
      }
    }

    // تعديل الرصيد قبل الحذف (مع منع الرصيد السالب)
    const items = await tx.purchaseInvoiceItem.findMany({
      where: { invoiceId: id },
      select: { productId: true, quantity: true },
    });

    for (const item of items) {
      if (item.productId) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { currentStock: true },
        });
        const currentVal = product?.currentStock ?? 0;
        const actualDeduct = Math.min(currentVal, item.quantity);

        if (actualDeduct > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: actualDeduct } },
          });
        }
      }
    }

    // تحقق من وجود معاملات مرتبطة
    const relatedVouchers = await prisma.paymentVoucher.count({
      where: { bankId: invoice?.bankId || -1 }, // Use a placeholder if bankId is null
    });

    const relatedReceipts = await prisma.receiptVoucher.count({
      where: { bankId: invoice?.bankId || -1 },
    });

    const relatedSalesInvoices = await prisma.salesInvoice.count({
      where: { bankId: invoice?.bankId || -1, status: "cash" },
    });

    const relatedPurchaseInvoices = await prisma.purchaseInvoice.count({
      where: { bankId: invoice?.bankId || -1, status: "cash" },
    });

    const hasTransactions =
      relatedVouchers > 0 ||
      relatedReceipts > 0 ||
      relatedSalesInvoices > 0 ||
      relatedPurchaseInvoices > 0;

    await tx.stockMovement.deleteMany({ where: { purchaseInvoiceId: id } });

    // 3. حذف القيود المحاسبية المرتبطة
    await tx.journalEntry.deleteMany({
      where: { sourceType: "PURCHASE_INVOICE", sourceId: id },
    });
    // حذف أي سند صرف نظامي مرتبط بهذه الفاتورة
    await tx.journalEntry.deleteMany({
      where: {
        sourceType: "PAYMENT_VOUCHER",
        sourceId: id,
        description: { contains: `سداد نقدي فاتورة` },
      },
    });

    const deletedInvoice = await tx.purchaseInvoice.delete({
      where: { id: id },
    });

    if (user_session && deletedInvoice) {
      await triggerStaffActivityAlert(
        user_session.user,
        "حذف فاتورة مشتريات",
        `تم حذف فاتورة مشتريات #${deletedInvoice.invoiceNumber} من المورد ${deletedInvoice.supplierName} بقيمة ${deletedInvoice.total}`,
      );
    }
    revalidatePath("/purchase-invoices");
    revalidatePath("/inventory/stock");
  });

  for (const alert of pendingAlerts) {
    if (alert.type === "treasury") {
      await triggerTreasuryAlert(alert.name, alert.value);
    }
  }
}

// ─── جلب فاتورة معينة مع أصنافها ومرتجعاتها (لصفحة العرض) ───────────────────
export async function getPurchaseInvoiceWithReturns(id: number) {
  return prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: true },
      },
      supplier: true,
      purchaseReturns: {
        include: { items: true },
      },
    },
  });
}

// ─── جلب فواتير مورد معين (للمرتجعات) ──────────────────────────────────────
export async function getPurchaseInvoicesBySupplier(supplierId: number) {
  return prisma.purchaseInvoice.findMany({
    where: { supplierId },
    orderBy: { invoiceDate: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      supplierName: true,
      invoiceDate: true,
      total: true,
    },
  });
}
