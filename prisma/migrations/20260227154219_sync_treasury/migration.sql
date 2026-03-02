/*
  Warnings:

  - You are about to drop the column `accountType` on the `PaymentVoucher` table. All the data in the column will be lost.
  - You are about to drop the column `bankId` on the `PaymentVoucher` table. All the data in the column will be lost.
  - You are about to drop the column `safeId` on the `PaymentVoucher` table. All the data in the column will be lost.
  - You are about to drop the column `bankId` on the `PurchaseReturn` table. All the data in the column will be lost.
  - You are about to drop the column `safeId` on the `PurchaseReturn` table. All the data in the column will be lost.
  - You are about to drop the column `accountType` on the `ReceiptVoucher` table. All the data in the column will be lost.
  - You are about to drop the column `bankId` on the `ReceiptVoucher` table. All the data in the column will be lost.
  - You are about to drop the column `safeId` on the `ReceiptVoucher` table. All the data in the column will be lost.
  - You are about to drop the column `bankId` on the `SalesReturn` table. All the data in the column will be lost.
  - You are about to drop the column `safeId` on the `SalesReturn` table. All the data in the column will be lost.
  - You are about to drop the column `fromBankId` on the `TreasuryTransfer` table. All the data in the column will be lost.
  - You are about to drop the column `fromSafeId` on the `TreasuryTransfer` table. All the data in the column will be lost.
  - You are about to drop the column `fromType` on the `TreasuryTransfer` table. All the data in the column will be lost.
  - You are about to drop the column `toBankId` on the `TreasuryTransfer` table. All the data in the column will be lost.
  - You are about to drop the column `toSafeId` on the `TreasuryTransfer` table. All the data in the column will be lost.
  - You are about to drop the column `toType` on the `TreasuryTransfer` table. All the data in the column will be lost.
  - You are about to drop the `TreasuryBank` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TreasurySafe` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `fromTreasuryId` to the `TreasuryTransfer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toTreasuryId` to the `TreasuryTransfer` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TreasuryType" AS ENUM ('SAFE', 'BANK');

-- DropForeignKey
ALTER TABLE "PaymentVoucher" DROP CONSTRAINT "PaymentVoucher_bankId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentVoucher" DROP CONSTRAINT "PaymentVoucher_safeId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseReturn" DROP CONSTRAINT "PurchaseReturn_bankId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseReturn" DROP CONSTRAINT "PurchaseReturn_safeId_fkey";

-- DropForeignKey
ALTER TABLE "ReceiptVoucher" DROP CONSTRAINT "ReceiptVoucher_bankId_fkey";

-- DropForeignKey
ALTER TABLE "ReceiptVoucher" DROP CONSTRAINT "ReceiptVoucher_safeId_fkey";

-- DropForeignKey
ALTER TABLE "SalesReturn" DROP CONSTRAINT "SalesReturn_bankId_fkey";

-- DropForeignKey
ALTER TABLE "SalesReturn" DROP CONSTRAINT "SalesReturn_safeId_fkey";

-- DropForeignKey
ALTER TABLE "TreasuryTransfer" DROP CONSTRAINT "TreasuryTransfer_fromBankId_fkey";

-- DropForeignKey
ALTER TABLE "TreasuryTransfer" DROP CONSTRAINT "TreasuryTransfer_fromSafeId_fkey";

-- DropForeignKey
ALTER TABLE "TreasuryTransfer" DROP CONSTRAINT "TreasuryTransfer_toBankId_fkey";

-- DropForeignKey
ALTER TABLE "TreasuryTransfer" DROP CONSTRAINT "TreasuryTransfer_toSafeId_fkey";

-- DropIndex
DROP INDEX "PaymentVoucher_bankId_idx";

-- DropIndex
DROP INDEX "PaymentVoucher_safeId_idx";

-- DropIndex
DROP INDEX "ReceiptVoucher_bankId_idx";

-- DropIndex
DROP INDEX "ReceiptVoucher_safeId_idx";

-- DropIndex
DROP INDEX "TreasuryTransfer_fromBankId_idx";

-- DropIndex
DROP INDEX "TreasuryTransfer_fromSafeId_idx";

-- DropIndex
DROP INDEX "TreasuryTransfer_toBankId_idx";

-- DropIndex
DROP INDEX "TreasuryTransfer_toSafeId_idx";

-- AlterTable
ALTER TABLE "PaymentVoucher" DROP COLUMN "accountType",
DROP COLUMN "bankId",
DROP COLUMN "safeId",
ADD COLUMN     "treasuryId" INTEGER;

-- AlterTable
ALTER TABLE "PurchaseReturn" DROP COLUMN "bankId",
DROP COLUMN "safeId";

-- AlterTable
ALTER TABLE "ReceiptVoucher" DROP COLUMN "accountType",
DROP COLUMN "bankId",
DROP COLUMN "safeId",
ADD COLUMN     "treasuryId" INTEGER;

-- AlterTable
ALTER TABLE "SalesReturn" DROP COLUMN "bankId",
DROP COLUMN "safeId";

-- AlterTable
ALTER TABLE "TreasuryTransfer" DROP COLUMN "fromBankId",
DROP COLUMN "fromSafeId",
DROP COLUMN "fromType",
DROP COLUMN "toBankId",
DROP COLUMN "toSafeId",
DROP COLUMN "toType",
ADD COLUMN     "fromTreasuryId" INTEGER NOT NULL,
ADD COLUMN     "toTreasuryId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "TreasuryBank";

-- DropTable
DROP TABLE "TreasurySafe";

-- CreateTable
CREATE TABLE "Treasury" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "type" "TreasuryType" NOT NULL DEFAULT 'SAFE',
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treasury_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Treasury_code_key" ON "Treasury"("code");

-- CreateIndex
CREATE INDEX "PaymentVoucher_treasuryId_idx" ON "PaymentVoucher"("treasuryId");

-- CreateIndex
CREATE INDEX "ReceiptVoucher_treasuryId_idx" ON "ReceiptVoucher"("treasuryId");

-- CreateIndex
CREATE INDEX "TreasuryTransfer_fromTreasuryId_idx" ON "TreasuryTransfer"("fromTreasuryId");

-- CreateIndex
CREATE INDEX "TreasuryTransfer_toTreasuryId_idx" ON "TreasuryTransfer"("toTreasuryId");

-- AddForeignKey
ALTER TABLE "ReceiptVoucher" ADD CONSTRAINT "ReceiptVoucher_treasuryId_fkey" FOREIGN KEY ("treasuryId") REFERENCES "Treasury"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_treasuryId_fkey" FOREIGN KEY ("treasuryId") REFERENCES "Treasury"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryTransfer" ADD CONSTRAINT "TreasuryTransfer_fromTreasuryId_fkey" FOREIGN KEY ("fromTreasuryId") REFERENCES "Treasury"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryTransfer" ADD CONSTRAINT "TreasuryTransfer_toTreasuryId_fkey" FOREIGN KEY ("toTreasuryId") REFERENCES "Treasury"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
