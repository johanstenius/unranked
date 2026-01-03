-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('PENDING', 'CRAWLING', 'ANALYZING', 'GENERATING_BRIEFS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditTier" AS ENUM ('QUICK_SCAN', 'STANDARD', 'DEEP_DIVE');

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'PENDING',
    "docsUrl" TEXT NOT NULL,
    "productDesc" TEXT,
    "competitors" TEXT[],
    "email" TEXT NOT NULL,
    "pagesFound" INTEGER,
    "opportunities" JSONB,
    "stripeSessionId" TEXT,
    "tier" "AuditTier" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brief" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "searchVolume" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "questions" TEXT[],
    "relatedKw" TEXT[],
    "competitors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawledPage" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "h1" TEXT,
    "content" TEXT,
    "wordCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawledPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Audit_stripeSessionId_key" ON "Audit"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Brief_auditId_idx" ON "Brief"("auditId");

-- CreateIndex
CREATE INDEX "CrawledPage_auditId_idx" ON "CrawledPage"("auditId");

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawledPage" ADD CONSTRAINT "CrawledPage_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
