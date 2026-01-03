-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "detectedSections" JSONB,
ADD COLUMN     "sections" TEXT[];

-- AlterTable
ALTER TABLE "CrawledPage" ADD COLUMN     "outboundLinks" TEXT[],
ADD COLUMN     "section" TEXT;
