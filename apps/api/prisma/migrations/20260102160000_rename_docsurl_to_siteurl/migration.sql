-- Rename docsUrl to siteUrl
ALTER TABLE "Audit" RENAME COLUMN "docsUrl" TO "siteUrl";

-- Drop docs-specific columns
ALTER TABLE "Audit" DROP COLUMN IF EXISTS "openApiSpecUrl";
ALTER TABLE "Audit" DROP COLUMN IF EXISTS "docsQuality";
