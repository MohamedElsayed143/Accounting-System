-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('PURCHASE', 'SALE', 'PURCHASE_RETURN', 'SALE_RETURN', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "PurchaseInvoiceItem" ADD COLUMN     "productId" INTEGER;

-- AlterTable
ALTER TABLE "SalesInvoiceItem" ADD COLUMN     "productId" INTEGER;

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "location" VARCHAR(255),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(50),
    "buyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reference" VARCHAR(100),
    "notes" TEXT,
    "warehouseId" INTEGER,
    "purchaseInvoiceId" INTEGER,
    "salesInvoiceId" INTEGER,
    "purchaseReturnId" INTEGER,
    "salesReturnId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_movementType_idx" ON "StockMovement"("movementType");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_warehouseId_idx" ON "StockMovement"("warehouseId");

-- AddForeignKey
ALTER TABLE "SalesInvoiceItem" ADD CONSTRAINT "SalesInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
