-- Remove SELECTING_TOPICS from AuditStatus enum
-- First, update any existing audits with SELECTING_TOPICS to ANALYZING
UPDATE "Audit" SET status = 'ANALYZING' WHERE status = 'SELECTING_TOPICS';

-- Remove the enum value
ALTER TYPE "AuditStatus" RENAME TO "AuditStatus_old";
CREATE TYPE "AuditStatus" AS ENUM ('PENDING', 'CRAWLING', 'SELECTING_COMPETITORS', 'ANALYZING', 'GENERATING_BRIEFS', 'RETRYING', 'COMPLETED', 'FAILED');
ALTER TABLE "Audit" ALTER COLUMN "status" TYPE "AuditStatus" USING "status"::text::"AuditStatus";
DROP TYPE "AuditStatus_old";

-- Remove unused cluster selection columns
ALTER TABLE "Audit" DROP COLUMN IF EXISTS "suggestedClusters";
ALTER TABLE "Audit" DROP COLUMN IF EXISTS "selectedClusters";
