-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseInvoiceItem" ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SalesInvoiceItem" ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;
