-- AlterTable
ALTER TABLE "Audit" ADD COLUMN "reportToken" TEXT;
ALTER TABLE "Audit" ADD COLUMN "reportTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Audit_reportToken_key" ON "Audit"("reportToken");
