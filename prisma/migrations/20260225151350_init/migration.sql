-- AlterEnum
ALTER TYPE "RefundMethod" ADD VALUE 'credit';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "profitMargin" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "topNotes" JSONB;

-- AlterTable
ALTER TABLE "PurchaseInvoiceItem" ADD COLUMN     "profitMargin" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN     "topNotes" JSONB;
