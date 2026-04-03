-- Add companyBarcode and showBarcodeOnPrint to CompanySettings
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "companyBarcode" TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "showBarcodeOnPrint" BOOLEAN NOT NULL DEFAULT true;
