import { publicPrisma, getPrismaForSchema } from "@/lib/tenant-prisma";
import { seedTenantData } from "../../prisma/seed";

export async function setupNewTenantSchema(tenantSchema: string): Promise<void> {
  const s = tenantSchema;

  // 1. Create schema
  await publicPrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${s}"`);

  // 2. Create ENUMs (ignore if already exist)
  const enums = [
    `DO $$ BEGIN CREATE TYPE "${s}"."InvoiceStatus" AS ENUM ('cash','credit','pending'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "${s}"."ReturnStatus" AS ENUM ('pending','completed','rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "${s}"."RefundMethod" AS ENUM ('cash','safe','bank','credit'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "${s}"."MovementType" AS ENUM ('PURCHASE','SALE','PURCHASE_RETURN','SALE_RETURN','ADJUSTMENT'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "${s}"."QuotationStatus" AS ENUM ('Draft','Sent','Approved','Rejected','Converted'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "${s}"."TaxType" AS ENUM ('INCLUSIVE','EXCLUSIVE'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "${s}"."NotificationType" AS ENUM ('INFO','WARNING','SUCCESS','ERROR'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "${s}"."TreasuryActionType" AS ENUM ('TRANSFER','CREATE_SAFE','CREATE_BANK','RECEIPT_VOUCHER','PAYMENT_VOUCHER'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "${s}"."RequestStatus" AS ENUM ('PENDING','APPROVED','REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "${s}"."AccountType" AS ENUM ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `DO $$ BEGIN CREATE TYPE "${s}"."SourceType" AS ENUM ('MANUAL','SALES_INVOICE','PURCHASE_INVOICE','RECEIPT_VOUCHER','PAYMENT_VOUCHER','SALES_RETURN','PURCHASE_RETURN','TRANSFER'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  ];
  for (const sql of enums) await publicPrisma.$executeRawUnsafe(sql);

  // 3. Create tables
  const tables = [
    `CREATE TABLE IF NOT EXISTS "${s}"."User" (
      "id" SERIAL PRIMARY KEY, "username" VARCHAR(50) NOT NULL UNIQUE,
      "password" VARCHAR(255) NOT NULL, "role" VARCHAR(20) NOT NULL DEFAULT 'WORKER',
      "authorizedDevices" TEXT[] DEFAULT ARRAY[]::TEXT[], "maxDevices" INT DEFAULT 1,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "email" VARCHAR(255) UNIQUE, "tenantSchema" VARCHAR(100), "parentId" INT
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."Session" (
      "id" TEXT PRIMARY KEY, "userId" INT NOT NULL, "expiresAt" TIMESTAMPTZ NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY ("userId") REFERENCES "${s}"."User"("id") ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."Account" (
      "id" SERIAL PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "name" VARCHAR(255) NOT NULL,
      "nameEn" VARCHAR(255), "type" "${s}"."AccountType" NOT NULL,
      "parentId" INT, "isSelectable" BOOL DEFAULT TRUE, "isTerminal" BOOL DEFAULT FALSE,
      "level" INT DEFAULT 1, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "lastModifiedById" INT,
      FOREIGN KEY ("parentId") REFERENCES "${s}"."Account"("id"),
      FOREIGN KEY ("lastModifiedById") REFERENCES "${s}"."User"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."Customer" (
      "id" SERIAL PRIMARY KEY, "name" VARCHAR(255) NOT NULL, "code" INT NOT NULL UNIQUE,
      "phone" VARCHAR(20), "address" TEXT, "category" VARCHAR(100),
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "accountId" INT UNIQUE, FOREIGN KEY ("accountId") REFERENCES "${s}"."Account"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."Supplier" (
      "id" SERIAL PRIMARY KEY, "name" VARCHAR(255) NOT NULL, "code" INT NOT NULL UNIQUE,
      "phone" VARCHAR(20), "address" TEXT, "category" VARCHAR(100),
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "accountId" INT UNIQUE, FOREIGN KEY ("accountId") REFERENCES "${s}"."Account"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."TreasurySafe" (
      "id" SERIAL PRIMARY KEY, "name" VARCHAR(255) NOT NULL, "balance" FLOAT DEFAULT 0,
      "description" TEXT, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "isPrimary" BOOL DEFAULT FALSE, "isActive" BOOL DEFAULT TRUE,
      "accountId" INT UNIQUE, FOREIGN KEY ("accountId") REFERENCES "${s}"."Account"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."TreasuryBank" (
      "id" SERIAL PRIMARY KEY, "name" VARCHAR(255) NOT NULL, "accountNumber" VARCHAR(100),
      "branch" VARCHAR(255), "balance" FLOAT DEFAULT 0, "description" TEXT,
      "isActive" BOOL DEFAULT TRUE, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "accountId" INT UNIQUE, FOREIGN KEY ("accountId") REFERENCES "${s}"."Account"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."SalesInvoice" (
      "id" SERIAL PRIMARY KEY, "invoiceNumber" INT NOT NULL UNIQUE, "customerName" VARCHAR(255) NOT NULL,
      "customerId" INT NOT NULL, "invoiceDate" TIMESTAMPTZ NOT NULL, "subtotal" FLOAT NOT NULL,
      "totalTax" FLOAT NOT NULL, "discount" FLOAT DEFAULT 0, "total" FLOAT NOT NULL,
      "status" "${s}"."InvoiceStatus" DEFAULT 'cash', "safeId" INT, "bankId" INT,
      "description" TEXT, "topNotes" JSONB, "notes" JSONB, "printableTitle" TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(), "dueDate" TIMESTAMPTZ,
      FOREIGN KEY ("customerId") REFERENCES "${s}"."Customer"("id"),
      FOREIGN KEY ("safeId") REFERENCES "${s}"."TreasurySafe"("id"),
      FOREIGN KEY ("bankId") REFERENCES "${s}"."TreasuryBank"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."SalesInvoiceItem" (
      "id" SERIAL PRIMARY KEY, "invoiceId" INT NOT NULL, "description" VARCHAR(255) NOT NULL,
      "quantity" FLOAT NOT NULL, "unitPrice" FLOAT NOT NULL, "taxRate" FLOAT DEFAULT 0,
      "discount" FLOAT DEFAULT 0, "total" FLOAT NOT NULL, "productId" INT, "profitMargin" FLOAT DEFAULT 0,
      FOREIGN KEY ("invoiceId") REFERENCES "${s}"."SalesInvoice"("id") ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."PurchaseInvoice" (
      "id" SERIAL PRIMARY KEY, "invoiceNumber" INT NOT NULL UNIQUE, "supplierName" VARCHAR(255) NOT NULL,
      "supplierId" INT NOT NULL, "invoiceDate" TIMESTAMPTZ NOT NULL, "subtotal" FLOAT NOT NULL,
      "totalTax" FLOAT NOT NULL, "discount" FLOAT DEFAULT 0, "total" FLOAT NOT NULL,
      "status" "${s}"."InvoiceStatus" DEFAULT 'cash', "safeId" INT, "bankId" INT,
      "description" TEXT, "topNotes" JSONB, "notes" JSONB, "printableTitle" TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(), "dueDate" TIMESTAMPTZ,
      FOREIGN KEY ("supplierId") REFERENCES "${s}"."Supplier"("id"),
      FOREIGN KEY ("safeId") REFERENCES "${s}"."TreasurySafe"("id"),
      FOREIGN KEY ("bankId") REFERENCES "${s}"."TreasuryBank"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."PurchaseInvoiceItem" (
      "id" SERIAL PRIMARY KEY, "invoiceId" INT NOT NULL, "description" VARCHAR(255) NOT NULL,
      "quantity" FLOAT NOT NULL, "unitPrice" FLOAT NOT NULL, "sellingPrice" FLOAT DEFAULT 0,
      "profitMargin" FLOAT DEFAULT 0, "taxRate" FLOAT DEFAULT 0, "discount" FLOAT DEFAULT 0,
      "total" FLOAT NOT NULL, "productId" INT,
      FOREIGN KEY ("invoiceId") REFERENCES "${s}"."PurchaseInvoice"("id") ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."ReceiptVoucher" (
      "id" SERIAL PRIMARY KEY, "voucherNumber" VARCHAR(50) NOT NULL UNIQUE, "date" TIMESTAMPTZ NOT NULL,
      "amount" FLOAT NOT NULL, "description" TEXT, "customerId" INT NOT NULL,
      "accountType" VARCHAR(10) NOT NULL, "safeId" INT, "bankId" INT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY ("customerId") REFERENCES "${s}"."Customer"("id"),
      FOREIGN KEY ("safeId") REFERENCES "${s}"."TreasurySafe"("id"),
      FOREIGN KEY ("bankId") REFERENCES "${s}"."TreasuryBank"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."PaymentVoucher" (
      "id" SERIAL PRIMARY KEY, "voucherNumber" VARCHAR(50) NOT NULL UNIQUE, "date" TIMESTAMPTZ NOT NULL,
      "amount" FLOAT NOT NULL, "description" TEXT, "accountType" VARCHAR(10) NOT NULL,
      "safeId" INT, "bankId" INT, "supplierId" INT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY ("supplierId") REFERENCES "${s}"."Supplier"("id"),
      FOREIGN KEY ("safeId") REFERENCES "${s}"."TreasurySafe"("id"),
      FOREIGN KEY ("bankId") REFERENCES "${s}"."TreasuryBank"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."SalesReturn" (
      "id" SERIAL PRIMARY KEY, "returnNumber" INT NOT NULL UNIQUE, "invoiceId" INT NOT NULL,
      "customerId" INT NOT NULL, "returnDate" TIMESTAMPTZ NOT NULL, "subtotal" FLOAT NOT NULL,
      "discount" FLOAT DEFAULT 0, "totalTax" FLOAT DEFAULT 0, "total" FLOAT NOT NULL,
      "reason" TEXT, "status" "${s}"."ReturnStatus" DEFAULT 'pending',
      "refundMethod" "${s}"."RefundMethod" DEFAULT 'cash', "safeId" INT, "bankId" INT, "description" TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY ("invoiceId") REFERENCES "${s}"."SalesInvoice"("id"),
      FOREIGN KEY ("customerId") REFERENCES "${s}"."Customer"("id"),
      FOREIGN KEY ("safeId") REFERENCES "${s}"."TreasurySafe"("id"),
      FOREIGN KEY ("bankId") REFERENCES "${s}"."TreasuryBank"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."SalesReturnItem" (
      "id" SERIAL PRIMARY KEY, "returnId" INT NOT NULL, "invoiceItemId" INT,
      "description" VARCHAR(255) NOT NULL, "quantity" FLOAT NOT NULL, "unitPrice" FLOAT NOT NULL,
      "taxRate" FLOAT DEFAULT 0, "total" FLOAT NOT NULL,
      FOREIGN KEY ("returnId") REFERENCES "${s}"."SalesReturn"("id") ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."PurchaseReturn" (
      "id" SERIAL PRIMARY KEY, "returnNumber" INT NOT NULL UNIQUE, "invoiceId" INT NOT NULL,
      "supplierId" INT NOT NULL, "returnDate" TIMESTAMPTZ NOT NULL, "subtotal" FLOAT NOT NULL,
      "discount" FLOAT DEFAULT 0, "totalTax" FLOAT DEFAULT 0, "total" FLOAT NOT NULL,
      "reason" TEXT, "status" "${s}"."ReturnStatus" DEFAULT 'pending',
      "refundMethod" "${s}"."RefundMethod" DEFAULT 'cash', "safeId" INT, "bankId" INT, "description" TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY ("invoiceId") REFERENCES "${s}"."PurchaseInvoice"("id"),
      FOREIGN KEY ("supplierId") REFERENCES "${s}"."Supplier"("id"),
      FOREIGN KEY ("safeId") REFERENCES "${s}"."TreasurySafe"("id"),
      FOREIGN KEY ("bankId") REFERENCES "${s}"."TreasuryBank"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."PurchaseReturnItem" (
      "id" SERIAL PRIMARY KEY, "returnId" INT NOT NULL, "invoiceItemId" INT,
      "description" VARCHAR(255) NOT NULL, "quantity" FLOAT NOT NULL, "unitPrice" FLOAT NOT NULL,
      "taxRate" FLOAT DEFAULT 0, "total" FLOAT NOT NULL,
      FOREIGN KEY ("returnId") REFERENCES "${s}"."PurchaseReturn"("id") ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."Category" (
      "id" SERIAL PRIMARY KEY, "name" VARCHAR(100) NOT NULL,
      "code" VARCHAR(50) UNIQUE, "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW(), "imageUrl" TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."Warehouse" (
      "id" SERIAL PRIMARY KEY, "name" VARCHAR(100) NOT NULL, "location" VARCHAR(255),
      "isDefault" BOOL DEFAULT FALSE, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."Product" (
      "id" SERIAL PRIMARY KEY, "code" VARCHAR(50) NOT NULL UNIQUE, "name" VARCHAR(255) NOT NULL,
      "unit" VARCHAR(50), "buyPrice" FLOAT DEFAULT 0, "sellPrice" FLOAT DEFAULT 0,
      "profitMargin" FLOAT DEFAULT 0, "taxRate" FLOAT DEFAULT 0, "minStock" FLOAT DEFAULT 0,
      "currentStock" FLOAT DEFAULT 0, "isActive" BOOL DEFAULT TRUE, "categoryId" INT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(), "imageUrl" TEXT,
      FOREIGN KEY ("categoryId") REFERENCES "${s}"."Category"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."StockMovement" (
      "id" SERIAL PRIMARY KEY, "productId" INT NOT NULL, "movementType" "${s}"."MovementType" NOT NULL,
      "quantity" FLOAT NOT NULL, "unitPrice" FLOAT DEFAULT 0, "reference" VARCHAR(100),
      "notes" TEXT, "warehouseId" INT, "purchaseInvoiceId" INT, "salesInvoiceId" INT,
      "purchaseReturnId" INT, "salesReturnId" INT, "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY ("productId") REFERENCES "${s}"."Product"("id"),
      FOREIGN KEY ("warehouseId") REFERENCES "${s}"."Warehouse"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."Quotation" (
      "id" SERIAL PRIMARY KEY, "code" VARCHAR(20) NOT NULL UNIQUE, "customerId" INT,
      "customerName" VARCHAR(255), "date" TIMESTAMPTZ NOT NULL, "subtotal" FLOAT NOT NULL,
      "totalTax" FLOAT DEFAULT 0, "discount" FLOAT DEFAULT 0, "total" FLOAT NOT NULL,
      "topNotes" JSONB, "notes" JSONB, "printableTitle" TEXT,
      "status" "${s}"."QuotationStatus" DEFAULT 'Draft',
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY ("customerId") REFERENCES "${s}"."Customer"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."QuotationItem" (
      "id" SERIAL PRIMARY KEY, "quotationId" INT NOT NULL, "productId" INT,
      "description" VARCHAR(255) NOT NULL, "quantity" FLOAT NOT NULL, "unitPrice" FLOAT NOT NULL,
      "taxRate" FLOAT DEFAULT 0, "discount" FLOAT DEFAULT 0, "total" FLOAT NOT NULL,
      FOREIGN KEY ("quotationId") REFERENCES "${s}"."Quotation"("id") ON DELETE CASCADE,
      FOREIGN KEY ("productId") REFERENCES "${s}"."Product"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."TreasuryTransfer" (
      "id" SERIAL PRIMARY KEY, "transferNumber" VARCHAR(50) NOT NULL UNIQUE,
      "date" TIMESTAMPTZ NOT NULL, "amount" FLOAT NOT NULL, "description" TEXT,
      "fromType" VARCHAR(10) NOT NULL, "fromSafeId" INT, "fromBankId" INT,
      "toType" VARCHAR(10) NOT NULL, "toSafeId" INT, "toBankId" INT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY ("fromSafeId") REFERENCES "${s}"."TreasurySafe"("id"),
      FOREIGN KEY ("fromBankId") REFERENCES "${s}"."TreasuryBank"("id"),
      FOREIGN KEY ("toSafeId") REFERENCES "${s}"."TreasurySafe"("id"),
      FOREIGN KEY ("toBankId") REFERENCES "${s}"."TreasuryBank"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."JournalEntry" (
      "id" SERIAL PRIMARY KEY, "entryNumber" INT NOT NULL UNIQUE, "date" TIMESTAMPTZ NOT NULL,
      "description" TEXT, "reference" VARCHAR(100), "sourceType" "${s}"."SourceType" DEFAULT 'MANUAL',
      "sourceId" INT, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "createdById" INT, FOREIGN KEY ("createdById") REFERENCES "${s}"."User"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."JournalItem" (
      "id" SERIAL PRIMARY KEY, "journalEntryId" INT NOT NULL, "accountId" INT NOT NULL,
      "description" TEXT, "debit" FLOAT DEFAULT 0, "credit" FLOAT DEFAULT 0,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY ("journalEntryId") REFERENCES "${s}"."JournalEntry"("id") ON DELETE CASCADE,
      FOREIGN KEY ("accountId") REFERENCES "${s}"."Account"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."SystemSettings" (
      "id" INT PRIMARY KEY DEFAULT 1, "settings" JSONB NOT NULL, "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."CompanySettings" (
      "id" INT PRIMARY KEY DEFAULT 1, "companyName" TEXT DEFAULT 'شركة المحاسبة الحديثة',
      "companyNameEn" TEXT DEFAULT 'Modern Accounting Co.', "companyLogo" TEXT, "companyStamp" TEXT,
      "showLogoOnPrint" BOOL DEFAULT TRUE, "showStampOnPrint" BOOL DEFAULT TRUE,
      "salesPrefix" TEXT DEFAULT 'INV', "purchasePrefix" TEXT DEFAULT 'PUR',
      "quotationPrefix" TEXT DEFAULT 'QUO', "invoiceName" TEXT DEFAULT 'فاتورة ضريبية',
      "startNumber" INT DEFAULT 1, "termsAndConditions" TEXT, "taxEnabled" BOOL DEFAULT TRUE,
      "taxName" TEXT DEFAULT 'VAT', "taxPercentage" FLOAT DEFAULT 15,
      "taxType" "${s}"."TaxType" DEFAULT 'EXCLUSIVE', "currencyCode" TEXT DEFAULT 'ج.م',
      "decimalPlaces" INT DEFAULT 2, "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "purchaseInvoiceName" TEXT DEFAULT 'فاتورة مشتريات',
      "salesInvoiceName" TEXT DEFAULT 'فاتورة مبيعات',
      "companyBarcode" TEXT, "showBarcodeOnPrint" BOOL DEFAULT TRUE, "invoiceFooterNotes" TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."GeneralSettings" (
      "id" INT PRIMARY KEY DEFAULT 1, "staffActivityAlerts" BOOL DEFAULT TRUE,
      "inventoryAlerts" BOOL DEFAULT TRUE, "vaultBankAlerts" BOOL DEFAULT TRUE,
      "minVaultBalance" FLOAT DEFAULT 1000, "financialAlerts" BOOL DEFAULT TRUE,
      "showDueDateOnInvoices" BOOL DEFAULT FALSE, "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      "requireApprovalForTransfers" BOOL DEFAULT FALSE,
      "requireApprovalForSafeCreation" BOOL DEFAULT FALSE,
      "requireApprovalForBankCreation" BOOL DEFAULT FALSE,
      "requireApprovalForVouchers" BOOL DEFAULT FALSE,
      "allowWorkersManualJournals" BOOL DEFAULT FALSE
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."Notification" (
      "id" SERIAL PRIMARY KEY, "title" VARCHAR(255) NOT NULL, "message" TEXT NOT NULL,
      "type" "${s}"."NotificationType" DEFAULT 'INFO', "isRead" BOOL DEFAULT FALSE,
      "userId" INT, "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY ("userId") REFERENCES "${s}"."User"("id") ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."TreasuryActionRequest" (
      "id" SERIAL PRIMARY KEY, "type" "${s}"."TreasuryActionType" NOT NULL,
      "data" JSONB NOT NULL, "status" "${s}"."RequestStatus" DEFAULT 'PENDING',
      "reason" TEXT, "requesterId" INT NOT NULL, "approverId" INT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY ("requesterId") REFERENCES "${s}"."User"("id") ON DELETE CASCADE,
      FOREIGN KEY ("approverId") REFERENCES "${s}"."User"("id") ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."SystemSequence" (
      "id" TEXT PRIMARY KEY, "lastValue" INT DEFAULT 0, "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Many-to-many join tables
    `CREATE TABLE IF NOT EXISTS "${s}"."_PaymentVoucherToSalesReturn" (
      "A" INT NOT NULL, "B" INT NOT NULL,
      FOREIGN KEY ("A") REFERENCES "${s}"."PaymentVoucher"("id") ON DELETE CASCADE,
      FOREIGN KEY ("B") REFERENCES "${s}"."SalesReturn"("id") ON DELETE CASCADE,
      UNIQUE("A","B")
    )`,
    `CREATE TABLE IF NOT EXISTS "${s}"."_PurchaseReturnToReceiptVoucher" (
      "A" INT NOT NULL, "B" INT NOT NULL,
      FOREIGN KEY ("A") REFERENCES "${s}"."PurchaseReturn"("id") ON DELETE CASCADE,
      FOREIGN KEY ("B") REFERENCES "${s}"."ReceiptVoucher"("id") ON DELETE CASCADE,
      UNIQUE("A","B")
    )`,
  ];

  for (const sql of tables) {
    await publicPrisma.$executeRawUnsafe(sql);
  }

  // 4. Seed default CompanySettings & GeneralSettings rows
  await publicPrisma.$executeRawUnsafe(
    `INSERT INTO "${s}"."CompanySettings" ("id","updatedAt") VALUES (1,NOW()) ON CONFLICT DO NOTHING`
  );
  await publicPrisma.$executeRawUnsafe(
    `INSERT INTO "${s}"."GeneralSettings" ("id","updatedAt") VALUES (1,NOW()) ON CONFLICT DO NOTHING`
  );

  // 5. Sync owner user into tenant schema
  const ownerUsers = await publicPrisma.user.findMany({ where: { tenantSchema } });
  for (const u of ownerUsers) {
    await publicPrisma.$executeRawUnsafe(
      `INSERT INTO "${s}"."User"
         ("id","username","password","role","authorizedDevices","maxDevices","email","tenantSchema","parentId","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT ("id") DO UPDATE SET "username"=EXCLUDED."username","password"=EXCLUDED."password"`,
      u.id, u.username, u.password, u.role,
      u.authorizedDevices, u.maxDevices,
      u.email ?? null, u.tenantSchema ?? null, u.parentId ?? null,
      u.createdAt, u.updatedAt
    );
  }

  // 6. Seed Chart of Accounts and default data (Inside Transaction)
  console.log(`[Multi-Tenant] Seeding default data for: ${tenantSchema}...`);
  const tenantPrisma = getPrismaForSchema(tenantSchema);
  await tenantPrisma.$transaction(async (tx) => {
    await seedTenantData(tx, tenantSchema);
  }, {
    timeout: 60000 // Increase timeout to 60 seconds
  });

  console.log(`[Multi-Tenant] Setup complete for: ${tenantSchema}`);
}
