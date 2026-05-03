import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching all tenant schemas...");
  const tenants = await prisma.$queryRawUnsafe("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'") as any[];
  
  for (const t of tenants) {
    const s = t.schema_name;
    console.log(`Applying indexes to schema: ${s}...`);
    
    const indexes = [
      `CREATE INDEX IF NOT EXISTS "SalesInvoiceItem_invoiceId_idx" ON "${s}"."SalesInvoiceItem"("invoiceId")`,
      `CREATE INDEX IF NOT EXISTS "SalesInvoiceItem_productId_idx" ON "${s}"."SalesInvoiceItem"("productId")`,
      `CREATE INDEX IF NOT EXISTS "PurchaseInvoiceItem_invoiceId_idx" ON "${s}"."PurchaseInvoiceItem"("invoiceId")`,
      `CREATE INDEX IF NOT EXISTS "PurchaseInvoiceItem_productId_idx" ON "${s}"."PurchaseInvoiceItem"("productId")`,
      `CREATE INDEX IF NOT EXISTS "SalesReturnItem_returnId_idx" ON "${s}"."SalesReturnItem"("returnId")`,
      `CREATE INDEX IF NOT EXISTS "SalesReturnItem_invoiceItemId_idx" ON "${s}"."SalesReturnItem"("invoiceItemId")`,
      `CREATE INDEX IF NOT EXISTS "PurchaseReturnItem_returnId_idx" ON "${s}"."PurchaseReturnItem"("returnId")`,
      `CREATE INDEX IF NOT EXISTS "PurchaseReturnItem_invoiceItemId_idx" ON "${s}"."PurchaseReturnItem"("invoiceItemId")`,
      `CREATE INDEX IF NOT EXISTS "QuotationItem_quotationId_idx" ON "${s}"."QuotationItem"("quotationId")`,
      `CREATE INDEX IF NOT EXISTS "QuotationItem_productId_idx" ON "${s}"."QuotationItem"("productId")`,
      `CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "${s}"."Product"("categoryId")`,
      `CREATE INDEX IF NOT EXISTS "Product_code_idx" ON "${s}"."Product"("code")`,
      `CREATE INDEX IF NOT EXISTS "JournalItem_accountId_idx" ON "${s}"."JournalItem"("accountId")`,
      `CREATE INDEX IF NOT EXISTS "JournalItem_journalEntryId_idx" ON "${s}"."JournalItem"("journalEntryId")`,
    ];

    for (const sql of indexes) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e: any) {
        console.error(`Error applying index in ${s}:`, e.message);
      }
    }
  }
  
  // also apply to public just in case
  const publicIndexes = [
      `CREATE INDEX IF NOT EXISTS "SalesInvoiceItem_invoiceId_idx" ON "public"."SalesInvoiceItem"("invoiceId")`,
      `CREATE INDEX IF NOT EXISTS "SalesInvoiceItem_productId_idx" ON "public"."SalesInvoiceItem"("productId")`,
      `CREATE INDEX IF NOT EXISTS "PurchaseInvoiceItem_invoiceId_idx" ON "public"."PurchaseInvoiceItem"("invoiceId")`,
      `CREATE INDEX IF NOT EXISTS "PurchaseInvoiceItem_productId_idx" ON "public"."PurchaseInvoiceItem"("productId")`,
      `CREATE INDEX IF NOT EXISTS "SalesReturnItem_returnId_idx" ON "public"."SalesReturnItem"("returnId")`,
      `CREATE INDEX IF NOT EXISTS "SalesReturnItem_invoiceItemId_idx" ON "public"."SalesReturnItem"("invoiceItemId")`,
      `CREATE INDEX IF NOT EXISTS "PurchaseReturnItem_returnId_idx" ON "public"."PurchaseReturnItem"("returnId")`,
      `CREATE INDEX IF NOT EXISTS "PurchaseReturnItem_invoiceItemId_idx" ON "public"."PurchaseReturnItem"("invoiceItemId")`,
      `CREATE INDEX IF NOT EXISTS "QuotationItem_quotationId_idx" ON "public"."QuotationItem"("quotationId")`,
      `CREATE INDEX IF NOT EXISTS "QuotationItem_productId_idx" ON "public"."QuotationItem"("productId")`,
      `CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "public"."Product"("categoryId")`,
      `CREATE INDEX IF NOT EXISTS "Product_code_idx" ON "public"."Product"("code")`,
      `CREATE INDEX IF NOT EXISTS "JournalItem_accountId_idx" ON "public"."JournalItem"("accountId")`,
      `CREATE INDEX IF NOT EXISTS "JournalItem_journalEntryId_idx" ON "public"."JournalItem"("journalEntryId")`,
  ];
  for (const sql of publicIndexes) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e: any) {
        // ignore if public doesn't have the tables yet
      }
  }

  console.log("Indexes applied successfully to all existing schemas!");
  await prisma.$disconnect();
}

main().catch(console.error);
