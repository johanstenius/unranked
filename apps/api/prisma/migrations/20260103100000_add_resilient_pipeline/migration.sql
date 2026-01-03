-- Add RETRYING status to AuditStatus enum
ALTER TYPE "AuditStatus" ADD VALUE 'RETRYING';

-- Add resilient pipeline fields to Audit
ALTER TABLE "Audit" ADD COLUMN "progress" JSONB;
ALTER TABLE "Audit" ADD COLUMN "retryAfter" TIMESTAMP(3);
ALTER TABLE "Audit" ADD COLUMN "delayEmailSentAt" TIMESTAMP(3);
ALTER TABLE "Audit" ADD COLUMN "redirectChains" JSONB;

-- Add missing fields to CrawledPage
ALTER TABLE "CrawledPage" ADD COLUMN "h1Count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CrawledPage" ADD COLUMN "schemaTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
