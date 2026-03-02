-- CreateTable
CREATE TABLE "TreasuryTransfer" (
    "id" SERIAL NOT NULL,
    "transferNumber" VARCHAR(50) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "fromType" VARCHAR(10) NOT NULL,
    "fromSafeId" INTEGER,
    "fromBankId" INTEGER,
    "toType" VARCHAR(10) NOT NULL,
    "toSafeId" INTEGER,
    "toBankId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreasuryTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TreasuryTransfer_transferNumber_key" ON "TreasuryTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "TreasuryTransfer_fromSafeId_idx" ON "TreasuryTransfer"("fromSafeId");

-- CreateIndex
CREATE INDEX "TreasuryTransfer_fromBankId_idx" ON "TreasuryTransfer"("fromBankId");

-- CreateIndex
CREATE INDEX "TreasuryTransfer_toSafeId_idx" ON "TreasuryTransfer"("toSafeId");

-- CreateIndex
CREATE INDEX "TreasuryTransfer_toBankId_idx" ON "TreasuryTransfer"("toBankId");

-- AddForeignKey
ALTER TABLE "TreasuryTransfer" ADD CONSTRAINT "TreasuryTransfer_fromSafeId_fkey" FOREIGN KEY ("fromSafeId") REFERENCES "TreasurySafe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryTransfer" ADD CONSTRAINT "TreasuryTransfer_fromBankId_fkey" FOREIGN KEY ("fromBankId") REFERENCES "TreasuryBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryTransfer" ADD CONSTRAINT "TreasuryTransfer_toSafeId_fkey" FOREIGN KEY ("toSafeId") REFERENCES "TreasurySafe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryTransfer" ADD CONSTRAINT "TreasuryTransfer_toBankId_fkey" FOREIGN KEY ("toBankId") REFERENCES "TreasuryBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
