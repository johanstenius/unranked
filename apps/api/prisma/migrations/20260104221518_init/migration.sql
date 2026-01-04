-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('PENDING', 'CRAWLING', 'ANALYZING', 'GENERATING_BRIEFS', 'RETRYING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditTier" AS ENUM ('FREE', 'SCAN', 'AUDIT', 'DEEP_DIVE');

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'PENDING',
    "siteUrl" TEXT NOT NULL,
    "productDesc" TEXT,
    "competitors" TEXT[],
    "sections" TEXT[],
    "email" TEXT NOT NULL,
    "pagesFound" INTEGER,
    "sitemapUrlCount" INTEGER,
    "hasRobotsTxt" BOOLEAN,
    "hasSitemap" BOOLEAN,
    "opportunities" JSONB,
    "detectedSections" JSONB,
    "healthScore" JSONB,
    "redirectChains" JSONB,
    "progress" JSONB,
    "retryAfter" TIMESTAMP(3),
    "delayEmailSentAt" TIMESTAMP(3),
    "supportAlertSentAt" TIMESTAMP(3),
    "apiUsage" JSONB,
    "stripeSessionId" TEXT,
    "lsOrderId" TEXT,
    "tier" "AuditTier" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reportEmailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
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
    "suggestedInternalLinks" TEXT[],
    "clusteredKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalClusterVolume" INTEGER NOT NULL DEFAULT 0,
    "estimatedEffort" TEXT,
    "intent" TEXT,
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
    "section" TEXT,
    "outboundLinks" TEXT[],
    "readabilityScore" DOUBLE PRECISION,
    "codeBlockCount" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "codeBlocks" TEXT[],
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "h1Count" INTEGER NOT NULL DEFAULT 1,
    "h2s" TEXT[],
    "h3s" TEXT[],
    "imagesWithoutAlt" INTEGER NOT NULL DEFAULT 0,
    "hasSchemaOrg" BOOLEAN NOT NULL DEFAULT false,
    "schemaTypes" TEXT[],
    "hasViewport" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawledPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twoFactor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Audit_stripeSessionId_key" ON "Audit"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Audit_accessToken_key" ON "Audit"("accessToken");

-- CreateIndex
CREATE INDEX "Brief_auditId_idx" ON "Brief"("auditId");

-- CreateIndex
CREATE INDEX "CrawledPage_auditId_idx" ON "CrawledPage"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawledPage" ADD CONSTRAINT "CrawledPage_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
