/*
  Warnings:

  - Made the column `treasuryId` on table `PaymentVoucher` required. This step will fail if there are existing NULL values in that column.
  - Made the column `treasuryId` on table `ReceiptVoucher` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "PaymentVoucher" DROP CONSTRAINT "PaymentVoucher_treasuryId_fkey";

-- DropForeignKey
ALTER TABLE "ReceiptVoucher" DROP CONSTRAINT "ReceiptVoucher_treasuryId_fkey";

-- AlterTable
ALTER TABLE "PaymentVoucher" ALTER COLUMN "treasuryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ReceiptVoucher" ALTER COLUMN "treasuryId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ReceiptVoucher" ADD CONSTRAINT "ReceiptVoucher_treasuryId_fkey" FOREIGN KEY ("treasuryId") REFERENCES "Treasury"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_treasuryId_fkey" FOREIGN KEY ("treasuryId") REFERENCES "Treasury"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
