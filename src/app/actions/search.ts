"use server";

import { getTenantPrisma, publicPrisma } from "@/lib/tenant-prisma";
import { getSession } from "@/lib/auth";

export type SearchResult = {
  id: number | string;
  title: string;
  type: "product" | "customer" | "supplier" | "sales-invoice" | "purchase-invoice" | "nav";
  href: string;
};

const NAV_ITEMS: { title: string; href: string; keywords: string[] }[] = [
  { title: "الرئيسية", href: "/statistics", keywords: ["home", "dashboard", "الرئيسية", "احصائيات"] },
  { title: "العملاء", href: "/customers", keywords: ["العملاء", "customers"] },
  { title: "الموردين", href: "/suppliers", keywords: ["الموردين", "suppliers"] },
  { title: "فواتير المبيعات", href: "/sales-invoices", keywords: ["مبيعات", "فواتير", "sales", "invoices"] },
  { title: "فواتير المشتريات", href: "/purchase-invoices", keywords: ["مشتريات", "فواتير", "purchase"] },
  { title: "عروض الأسعار", href: "/sales-quotations", keywords: ["عروض", "أسعار", "quotations"] },
  { title: "الفواتير المعلقة", href: "/pending-invoices", keywords: ["معلقة", "pending"] },
  { title: "مرتجعات المبيعات", href: "/sales-returns", keywords: ["مرتجعات", "مبيعات", "returns"] },
  { title: "مرتجعات المشتريات", href: "/purchase-returns", keywords: ["مرتجعات", "مشتريات", "returns"] },
  { title: "إدارة النقدية", href: "/treasury", keywords: ["نقدية", "خزنة", "بنوك", "treasury"] },
  { title: "سند قبض", href: "/treasury/receipt-voucher", keywords: ["قبض", "سند"] },
  { title: "سند صرف", href: "/treasury/payment-voucher", keywords: ["صرف", "سند"] },
  { title: "المخزون", href: "/inventory", keywords: ["مخزون", "inventory"] },
  { title: "الأصناف", href: "/inventory/products", keywords: ["أصناف", "منتجات", "products"] },
  { title: "التصنيفات", href: "/inventory/categories", keywords: ["تصنيفات", "categories"] },
  { title: "التقارير", href: "/reports", keywords: ["تقارير", "reports"] },
  { title: "إعدادات النظام", href: "/settings", keywords: ["إعدادات", "settings"] },
];

export async function globalSearchAction(query: string): Promise<SearchResult[]> {
  const session = await getSession();
  if (!session) return [];

  const trimmedQueryString = query.trim();
  if (!trimmedQueryString) return [];

  const queryAsNumber = parseInt(trimmedQueryString);
  const isNumeric = !isNaN(queryAsNumber);

  try {
    const [products, customers, suppliers, salesInvoices, purchaseInvoices] = await Promise.all([
      (await getTenantPrisma()).product.findMany({
        where: {
          OR: [
            { name: { contains: trimmedQueryString, mode: 'insensitive' } },
            { code: { contains: trimmedQueryString, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true },
      }),
      (await getTenantPrisma()).customer.findMany({
        where: {
          OR: [
            { name: { contains: trimmedQueryString, mode: 'insensitive' } },
            isNumeric ? { code: queryAsNumber } : undefined,
            { phone: { contains: trimmedQueryString } },
          ].filter(Boolean) as any,
        },
        take: 5,
        select: { id: true, name: true },
      }),
      (await getTenantPrisma()).supplier.findMany({
        where: {
          OR: [
            { name: { contains: trimmedQueryString, mode: 'insensitive' } },
            isNumeric ? { code: queryAsNumber } : undefined,
            { phone: { contains: trimmedQueryString } },
          ].filter(Boolean) as any,
        },
        take: 5,
        select: { id: true, name: true },
      }),
      (await getTenantPrisma()).salesInvoice.findMany({
        where: isNumeric ? { invoiceNumber: queryAsNumber } : { id: -1 }, // Only search by number if numeric
        take: 5,
        select: { id: true, invoiceNumber: true },
      }),
      (await getTenantPrisma()).purchaseInvoice.findMany({
        where: isNumeric ? { invoiceNumber: queryAsNumber } : { id: -1 }, // Only search by number if numeric
        take: 5,
        select: { id: true, invoiceNumber: true },
      }),
    ]);

    const navResults: SearchResult[] = NAV_ITEMS.filter(item => 
      item.title.toLowerCase().includes(trimmedQueryString.toLowerCase()) ||
      item.keywords.some(k => k.toLowerCase().includes(trimmedQueryString.toLowerCase()))
    ).map(item => ({
      id: item.href,
      title: item.title,
      type: "nav" as const,
      href: item.href,
    }));

    const results: SearchResult[] = [
      ...navResults,
      ...products.map(p => ({
        id: p.id,
        title: p.name,
        type: "product" as const,
        href: `/inventory/products/${p.id}`,
      })),
      ...customers.map(c => ({
        id: c.id,
        title: c.name,
        type: "customer" as const,
        href: `/customers`, // Or specific customer page if it exists
      })),
      ...suppliers.map(s => ({
        id: s.id,
        title: s.name,
        type: "supplier" as const,
        href: `/suppliers`, // Or specific supplier page if it exists
      })),
      ...salesInvoices.map(i => ({
        id: i.id,
        title: `فاتورة مبيعات #${i.invoiceNumber}`,
        type: "sales-invoice" as const,
        href: `/sales-invoices/${i.id}`,
      })),
      ...purchaseInvoices.map(i => ({
        id: i.id,
        title: `فاتورة مشتريات #${i.invoiceNumber}`,
        type: "purchase-invoice" as const,
        href: `/purchase-invoices/${i.id}`,
      })),
    ];

    return results;
  } catch (error) {
    console.error("Global search error:", error);
    return [];
  }
}
