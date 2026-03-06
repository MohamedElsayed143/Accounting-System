"use server";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "../settings/actions";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// ========== KPI Summary ==========
export async function getStatisticsSummary(fromDate?: Date, toDate?: Date) {
  const session = await getSession();
  if (!session) return { totalRevenue: 0, totalPurchases: 0, netProfit: 0, customerCount: 0, supplierCount: 0, treasuryBalance: 0, salesCount: 0, purchasesCount: 0, pendingTotal: 0, pendingCount: 0 };

  const canView = await hasPermission(session.userId, "statistics_view");
  if (!canView) return { totalRevenue: 0, totalPurchases: 0, netProfit: 0, customerCount: 0, supplierCount: 0, treasuryBalance: 0, salesCount: 0, purchasesCount: 0, pendingTotal: 0, pendingCount: 0 };

  try {
    const dateFilterInvoice =
      fromDate && toDate
        ? { invoiceDate: { gte: fromDate, lte: toDate } }
        : {};
    const dateFilterReturn =
      fromDate && toDate
        ? { returnDate: { gte: fromDate, lte: toDate } }
        : {};

    const [
      salesAgg,
      purchasesAgg,
      salesReturnsAgg,
      purchaseReturnsAgg,
      customerCount,
      supplierCount,
      safes,
      banks,
      pendingInvoicesAgg,
    ] = await Promise.all([
      prisma.salesInvoice.aggregate({
        where: {
          status: { in: ["cash", "credit"] },
          ...dateFilterInvoice,
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.purchaseInvoice.aggregate({
        where: {
          status: { in: ["cash", "credit"] },
          ...dateFilterInvoice,
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.salesReturn.aggregate({
        where: { status: "completed", ...dateFilterReturn },
        _sum: { total: true },
      }),
      prisma.purchaseReturn.aggregate({
        where: { status: "completed", ...dateFilterReturn },
        _sum: { total: true },
      }),
      prisma.customer.count(),
      prisma.supplier.count(),
      prisma.treasurySafe.findMany({
        where: { isActive: true },
        select: { balance: true },
      }),
      prisma.treasuryBank.findMany({
        where: { isActive: true },
        select: { balance: true },
      }),
      prisma.salesInvoice.aggregate({
        where: { status: "pending", ...dateFilterInvoice },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    const totalRevenue = (salesAgg._sum.total ?? 0) - (salesReturnsAgg._sum.total ?? 0);
    const totalPurchases = (purchasesAgg._sum.total ?? 0) - (purchaseReturnsAgg._sum.total ?? 0);
    const netProfit = totalRevenue - totalPurchases;
    const treasuryBalance =
      safes.reduce((s, x) => s + x.balance, 0) +
      banks.reduce((s, x) => s + x.balance, 0);

    return {
      totalRevenue,
      totalPurchases,
      netProfit,
      customerCount,
      supplierCount,
      treasuryBalance,
      salesCount: salesAgg._count,
      purchasesCount: purchasesAgg._count,
      pendingTotal: pendingInvoicesAgg._sum.total ?? 0,
      pendingCount: pendingInvoicesAgg._count,
    };
  } catch (error) {
    console.error("getStatisticsSummary error:", error);
    return {
      totalRevenue: 0,
      totalPurchases: 0,
      netProfit: 0,
      customerCount: 0,
      supplierCount: 0,
      treasuryBalance: 0,
      salesCount: 0,
      purchasesCount: 0,
      pendingTotal: 0,
      pendingCount: 0,
    };
  }
}

// ========== Monthly Revenue vs Purchases ==========
export async function getMonthlyTrend(year: number) {
  try {
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year}-12-31T23:59:59.999Z`);

    const [salesInvoices, purchaseInvoices] = await Promise.all([
      prisma.salesInvoice.findMany({
        where: {
          invoiceDate: { gte: start, lte: end },
          status: { in: ["cash", "credit"] },
        },
        select: { invoiceDate: true, total: true },
      }),
      prisma.purchaseInvoice.findMany({
        where: {
          invoiceDate: { gte: start, lte: end },
          status: { in: ["cash", "credit"] },
        },
        select: { invoiceDate: true, total: true },
      }),
    ]);

    const monthNames = [
      "يناير","فبراير","مارس","أبريل","مايو","يونيو",
      "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
    ];

    const data = monthNames.map((name, i) => ({
      month: name,
      revenue: 0,
      purchases: 0,
    }));

    salesInvoices.forEach((inv) => {
      const m = new Date(inv.invoiceDate).getMonth();
      data[m].revenue += inv.total;
    });
    purchaseInvoices.forEach((inv) => {
      const m = new Date(inv.invoiceDate).getMonth();
      data[m].purchases += inv.total;
    });

    return data;
  } catch (error) {
    console.error("getMonthlyTrend error:", error);
    return [];
  }
}

// ========== Top Customers ==========
export async function getTopCustomers(
  limit: number = 5,
  fromDate?: Date,
  toDate?: Date
) {
  try {
    const dateFilter =
      fromDate && toDate
        ? { invoiceDate: { gte: fromDate, lte: toDate } }
        : {};

    const invoices = await prisma.salesInvoice.findMany({
      where: { status: { in: ["cash", "credit"] }, ...dateFilter },
      select: { customerId: true, customerName: true, total: true },
    });

    const map = new Map<number, { name: string; total: number; count: number }>();
    invoices.forEach((inv) => {
      const existing = map.get(inv.customerId) ?? { name: inv.customerName, total: 0, count: 0 };
      existing.total += inv.total;
      existing.count += 1;
      map.set(inv.customerId, existing);
    });

    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  } catch (error) {
    console.error("getTopCustomers error:", error);
    return [];
  }
}

// ========== Top Suppliers ==========
export async function getTopSuppliers(
  limit: number = 5,
  fromDate?: Date,
  toDate?: Date
) {
  try {
    const dateFilter =
      fromDate && toDate
        ? { invoiceDate: { gte: fromDate, lte: toDate } }
        : {};

    const invoices = await prisma.purchaseInvoice.findMany({
      where: { status: { in: ["cash", "credit"] }, ...dateFilter },
      select: { supplierId: true, supplierName: true, total: true },
    });

    const map = new Map<number, { name: string; total: number; count: number }>();
    invoices.forEach((inv) => {
      const existing = map.get(inv.supplierId) ?? { name: inv.supplierName, total: 0, count: 0 };
      existing.total += inv.total;
      existing.count += 1;
      map.set(inv.supplierId, existing);
    });

    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  } catch (error) {
    console.error("getTopSuppliers error:", error);
    return [];
  }
}

// ========== Sales by Payment Method ==========
export async function getSalesByPaymentMethod(
  fromDate?: Date,
  toDate?: Date
) {
  try {
    const dateFilter =
      fromDate && toDate
        ? { invoiceDate: { gte: fromDate, lte: toDate } }
        : {};

    const [cash, credit, pending] = await Promise.all([
      prisma.salesInvoice.aggregate({
        where: { status: "cash", ...dateFilter },
        _sum: { total: true },
        _count: true,
      }),
      prisma.salesInvoice.aggregate({
        where: { status: "credit", ...dateFilter },
        _sum: { total: true },
        _count: true,
      }),
      prisma.salesInvoice.aggregate({
        where: { status: "pending", ...dateFilter },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    return [
      { label: "نقدي", value: cash._sum.total ?? 0, count: cash._count, color: "#10b981" },
      { label: "آجل", value: credit._sum.total ?? 0, count: credit._count, color: "#3b82f6" },
      { label: "معلقة", value: pending._sum.total ?? 0, count: pending._count, color: "#f59e0b" },
    ];
  } catch (error) {
    console.error("getSalesByPaymentMethod error:", error);
    return [];
  }
}

// ========== Inventory Alerts (below minimum stock OR zero stock) ==========
export async function getInventoryAlerts() {
  try {
    const settings = await getSystemSettings();
    
    // الدفاع ضد القيم الفارغة أو غير المعرفة
    const alertsEnabled = settings?.inventory?.lowStockAlertEnabled ?? true;
    const defaultThreshold = settings?.inventory?.lowStockThreshold ?? 5;

    if (!alertsEnabled) return [];

    // جلب المنتجات النشطة
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        minStock: true,
        unit: true,
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    if (products.length === 0) return [];

    // حساب الرصيد الفعلي من الحركات للتأكد من الدقة
    const stockGroups = await prisma.stockMovement.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: {
        productId: { in: products.map((p) => p.id) },
      },
    });

    const qtyMap = new Map<number, number>();
    for (const g of stockGroups) {
      qtyMap.set(g.productId, g._sum.quantity ?? 0);
    }

    const alerts = products
      .map((p) => {
        const rawQty = qtyMap.get(p.id) ?? 0;
        const qty = Math.max(0, rawQty);
        return {
          ...p,
          currentStock: qty,
        };
      })
      .filter((p) => {
        const threshold = Math.max(p.minStock, defaultThreshold);
        return p.currentStock <= threshold;
      });

    return alerts.sort((a, b) => a.currentStock - b.currentStock);
  } catch (error) {
    console.error("getInventoryAlerts error:", error);
    return [];
  }
}

// ========== Best-Selling Products ==========
export async function getBestSellingProducts(
  limit: number = 10,
  fromDate?: Date,
  toDate?: Date
) {
  try {
    const dateFilter =
      fromDate && toDate
        ? { invoice: { invoiceDate: { gte: fromDate, lte: toDate } } }
        : {};

    const items = await prisma.salesInvoiceItem.findMany({
      where: {
        productId: { not: null },
        ...dateFilter,
      },
      select: {
        productId: true,
        quantity: true,
        total: true,
        product: { select: { name: true, code: true, unit: true, sellPrice: true } },
      },
    });

    // Aggregate by productId
    const map = new Map<
      number,
      { name: string; code: string; unit: string | null; sellPrice: number; totalQty: number; totalRevenue: number; orderCount: number }
    >();

    items.forEach((item) => {
      if (!item.productId || !item.product) return;
      const existing = map.get(item.productId) ?? {
        name: item.product.name,
        code: item.product.code,
        unit: item.product.unit,
        sellPrice: item.product.sellPrice,
        totalQty: 0,
        totalRevenue: 0,
        orderCount: 0,
      };
      existing.totalQty += item.quantity;
      existing.totalRevenue += item.total;
      existing.orderCount += 1;
      map.set(item.productId, existing);
    });

    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, limit);
  } catch (error) {
    console.error("getBestSellingProducts error:", error);
    return [];
  }
}

// ========== Recent Activity ==========
export async function getRecentActivity(limit: number = 10) {
  try {
    const [sales, purchases] = await Promise.all([
      prisma.salesInvoice.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          total: true,
          status: true,
          invoiceDate: true,
        },
      }),
      prisma.purchaseInvoice.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          supplierName: true,
          total: true,
          status: true,
          invoiceDate: true,
        },
      }),
    ]);

    const combined = [
      ...sales.map((s) => ({
        id: `s-${s.id}`,
        number: s.invoiceNumber,
        party: s.customerName,
        total: s.total,
        status: s.status,
        date: s.invoiceDate,
        type: "sale" as const,
      })),
      ...purchases.map((p) => ({
        id: `p-${p.id}`,
        number: p.invoiceNumber,
        party: p.supplierName,
        total: p.total,
        status: p.status,
        date: p.invoiceDate,
        type: "purchase" as const,
      })),
    ];

    return combined
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error("getRecentActivity error:", error);
    return [];
  }
}

// ========== Returns Summary ==========
export async function getReturnsSummary(fromDate?: Date, toDate?: Date) {
  try {
    const dateFilter =
      fromDate && toDate ? { returnDate: { gte: fromDate, lte: toDate } } : {};

    const [salesReturns, purchaseReturns] = await Promise.all([
      prisma.salesReturn.aggregate({
        where: { status: "completed", ...dateFilter },
        _sum: { total: true },
        _count: true,
      }),
      prisma.purchaseReturn.aggregate({
        where: { status: "completed", ...dateFilter },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    return {
      salesReturnsTotal: salesReturns._sum.total ?? 0,
      salesReturnsCount: salesReturns._count,
      purchaseReturnsTotal: purchaseReturns._sum.total ?? 0,
      purchaseReturnsCount: purchaseReturns._count,
    };
  } catch (error) {
    console.error("getReturnsSummary error:", error);
    return {
      salesReturnsTotal: 0,
      salesReturnsCount: 0,
      purchaseReturnsTotal: 0,
      purchaseReturnsCount: 0,
    };
  }
}
