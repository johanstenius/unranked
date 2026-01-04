-- DropIndex
DROP INDEX IF EXISTS "Audit_reportToken_key";

-- AlterTable: Remove old columns
ALTER TABLE "Audit" DROP COLUMN IF EXISTS "reportToken";
ALTER TABLE "Audit" DROP COLUMN IF EXISTS "reportTokenExpiresAt";

-- AlterTable: Add new columns
ALTER TABLE "Audit" ADD COLUMN "accessToken" TEXT NOT NULL;
ALTER TABLE "Audit" ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Audit_accessToken_key" ON "Audit"("accessToken");
