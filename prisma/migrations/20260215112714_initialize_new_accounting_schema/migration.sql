-- CreateTable
CREATE TABLE "PurchaseInvoice" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" INTEGER NOT NULL,
    "supplierName" VARCHAR(255) NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "totalTax" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'cash',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoiceItem" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PurchaseInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasurySafe" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreasurySafe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryBank" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "accountNumber" VARCHAR(100),
    "branch" VARCHAR(255),
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreasuryBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptVoucher" (
    "id" SERIAL NOT NULL,
    "voucherNumber" VARCHAR(50) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "customerId" INTEGER NOT NULL,
    "accountType" VARCHAR(10) NOT NULL,
    "safeId" INTEGER,
    "bankId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentVoucher" (
    "id" SERIAL NOT NULL,
    "voucherNumber" VARCHAR(50) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "accountType" VARCHAR(10) NOT NULL,
    "safeId" INTEGER,
    "bankId" INTEGER,
    "supplierId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_invoiceNumber_key" ON "PurchaseInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptVoucher_voucherNumber_key" ON "ReceiptVoucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "ReceiptVoucher_customerId_idx" ON "ReceiptVoucher"("customerId");

-- CreateIndex
CREATE INDEX "ReceiptVoucher_safeId_idx" ON "ReceiptVoucher"("safeId");

-- CreateIndex
CREATE INDEX "ReceiptVoucher_bankId_idx" ON "ReceiptVoucher"("bankId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentVoucher_voucherNumber_key" ON "PaymentVoucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "PaymentVoucher_supplierId_idx" ON "PaymentVoucher"("supplierId");

-- CreateIndex
CREATE INDEX "PaymentVoucher_safeId_idx" ON "PaymentVoucher"("safeId");

-- CreateIndex
CREATE INDEX "PaymentVoucher_bankId_idx" ON "PaymentVoucher"("bankId");

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptVoucher" ADD CONSTRAINT "ReceiptVoucher_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptVoucher" ADD CONSTRAINT "ReceiptVoucher_safeId_fkey" FOREIGN KEY ("safeId") REFERENCES "TreasurySafe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptVoucher" ADD CONSTRAINT "ReceiptVoucher_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "TreasuryBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_safeId_fkey" FOREIGN KEY ("safeId") REFERENCES "TreasurySafe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "TreasuryBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
