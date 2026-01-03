-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "docsQuality" JSONB,
ADD COLUMN     "openApiSpecUrl" TEXT;

-- AlterTable
ALTER TABLE "CrawledPage" ADD COLUMN     "codeBlocks" TEXT[];
