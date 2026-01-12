# Product Analysis: Unranked

## Overview

**Name:** Unranked (formerly DocRank)

**Value Proposition:** Full-site SEO audit platform with AI-powered content briefs. One-time purchase pricing targeting small businesses, bloggers, freelancers, and documentation sites.

**Key Differentiator:** AI-generated content briefs with actionable structure - solves "what to write" not just "what's broken."

**Pricing Tiers:**
| Tier | Price | Pages | Keywords | Briefs | Competitors |
|------|-------|-------|----------|--------|-------------|
| FREE | €0 | 50 | 0 | 0 | 0 |
| SCAN | €19 | 50 | All | 1 | 0 |
| AUDIT | €49 | 200 | All | 5 | 1 |
| DEEP_DIVE | €99 | 500 | All | Unlimited | 3 |

---

## Architecture

### Monorepo Structure
```
docs-analyzer/
├── apps/
│   ├── api/          # Backend (Hono + Prisma)
│   └── web/          # Frontend (Next.js 15)
├── packages/
│   └── shared/       # Shared types
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend Framework** | Hono + @hono/zod-openapi |
| **Database** | PostgreSQL + Prisma ORM |
| **Job Queue** | pg-boss |
| **AI** | Anthropic Claude (Haiku + Sonnet) |
| **SEO Data** | DataForSEO API |
| **Performance** | PageSpeed Insights API |
| **Payments** | LemonSqueezy |
| **Email** | SendPigeon |
| **Frontend** | Next.js 15, React 19, Tailwind CSS |
| **UI Components** | Radix UI, Framer Motion |
| **Linting** | Biome |
| **Testing** | Vitest |

---

## Audit Pipeline Components

17 components organized by dependency chain:

### Component Dependency Graph
```
crawl
├── technicalIssues
├── internalLinking
├── duplicateContent
├── aiReadiness
├── coreWebVitals (PageSpeed)
├── currentRankings (DataForSEO)
│   ├── keywordOpportunities
│   ├── competitorAnalysis
│   │   └── snippetOpportunities
│   └── cannibalization
├── intentClassification (Claude)
│   └── keywordClustering (Claude)
│       └── briefs (Claude)
├── quickWins (Claude)
├── aiVisibility (ChatGPT, Perplexity, Claude)
└── actionPlan
```

### Components by External Dependency

| Component | External API | Description |
|-----------|--------------|-------------|
| **crawl** | None | Page discovery + extraction |
| **technicalIssues** | None | 15 issue types detection |
| **internalLinking** | None | Link distribution analysis |
| **duplicateContent** | None | Exact/near-duplicate detection |
| **aiReadiness** | None | AI bot blocking analysis |
| **coreWebVitals** | PageSpeed Insights | LCP, INP, CLS metrics |
| **currentRankings** | DataForSEO | Google ranking positions |
| **keywordOpportunities** | DataForSEO | Unranked high-volume keywords |
| **competitorAnalysis** | DataForSEO | Competitor rankings/gaps |
| **snippetOpportunities** | DataForSEO | Featured snippet potential |
| **cannibalization** | DataForSEO | Multiple pages → same keyword |
| **intentClassification** | Claude Haiku | Keyword intent classification |
| **keywordClustering** | Claude Haiku | Semantic grouping |
| **quickWins** | Claude Sonnet | Page optimization suggestions |
| **briefs** | Claude Sonnet | Full content brief generation |
| **aiVisibility** | ChatGPT, Perplexity, Claude | Brand mention in AI responses |
| **actionPlan** | None | Priority aggregation |

---

## External API Dependencies

### DataForSEO
- **Auth:** Basic (login/password)
- **Functions:** Keyword data, SERP, PAA, rankings, competitor discovery
- **Caching:** 5-minute in-memory cache
- **Used by:** currentRankings, keywordOpportunities, competitorAnalysis, snippetOpportunities, cannibalization, briefs (SERP data)

### Anthropic Claude
- **Models:** Haiku (fast/cheap), Sonnet (quality)
- **Circuit breaker:** 5 failures → 60s cooldown
- **Used by:** intentClassification, keywordClustering, quickWins, briefs

### PageSpeed Insights
- **Concurrency:** Max 15 concurrent requests
- **Retry:** 3 retries, exponential backoff
- **Tier limits:** FREE=1, SCAN=10, AUDIT=30, DEEP_DIVE=100 pages
- **Used by:** coreWebVitals

### AI Visibility APIs (AUDIT+ only)
- **OpenAI** (ChatGPT queries)
- **Perplexity**
- **Claude** (separate from brief generation)
- **Used by:** aiVisibility component

### LemonSqueezy
- Checkout sessions, webhooks, upgrade flows

### SendPigeon
- Report ready, delay, failure notifications

---

## Feature Breakdown

### 1. Site Discovery & Crawling
**File:** `apps/api/src/services/crawler/crawler.ts`

**Discovery chain:**
1. robots.txt → sitemap location
2. Sitemap parsing (nested, 3 levels)
3. Link crawling (fallback)

**Per-page extraction:**
- Title, meta description, canonicals, OG tags
- H1/H2/H3 hierarchy + counts
- Content (10k chars), word count
- Readability score (Flesch-Kincaid)
- Code blocks (count + snippets)
- Images (count + alt audit)
- Outbound links
- Schema.org detection
- Redirect chain tracking (up to 10 hops)

### 2. Technical SEO Analysis
**15 Issue Types:**

| Issue | Severity |
|-------|----------|
| Missing title | HIGH |
| Missing H1 | HIGH |
| Multiple H1s | MEDIUM |
| Missing meta description | MEDIUM |
| Title too long (>60) | LOW |
| Thin content (<100 words) | MEDIUM |
| Readability too complex (>Grade 12) | LOW |
| Technical content, no code blocks | MEDIUM |
| Long content (>1000 words) without images | LOW |
| Images without alt | MEDIUM |
| Missing viewport meta | LOW |
| Orphan pages (0 inbound) | MEDIUM |
| Underlinked pages (<2 inbound) | LOW |
| Redirect chains (>1 hop) | MEDIUM |
| Duplicate content | MEDIUM |

### 3. Keyword Intelligence
**Data sources:** Page titles, H1s, DataForSEO rankings

**Per-keyword metrics:**
- Search volume (monthly)
- Keyword difficulty (0-100)
- Current ranking position
- Search intent
- Featured snippet opportunity
- CTR by position

**Analysis types:**
- Unranked opportunities
- Quick wins (ranking 10-30)
- Cannibalization
- Competitor gaps

### 4. Health Score
**0-100 score, 6 components:**

| Component | Weight |
|-----------|--------|
| Opportunity Discovery | 30 |
| Ranking Coverage | 20 |
| Position Quality | 15 |
| Technical Health | 15 |
| Internal Linking | 10 |
| Content Opportunity | 10 |

**Grades:** Excellent (80+), Good (60-79), Needs Work (40-59), Poor (<40)

### 5. Content Brief Generation
**File:** `apps/api/src/services/brief/generator.ts`

**Brief includes:**
- Target keyword + cluster
- Volume + difficulty
- AI-generated title suggestion
- Content structure (H1/H2/H3)
- Questions to answer (PAA)
- Related keywords
- Internal linking suggestions
- Competitor content analysis
- Estimated effort (30min - 8+ hours)

### 6. AI Features (New)

**AI Readiness:**
- robots.txt AI bot blocking analysis
- llms.txt presence check
- Heading hierarchy scoring
- Structured data quality

**AI Visibility (AUDIT+):**
- Brand mention detection in ChatGPT, Perplexity, Claude
- Industry detection from content
- Competitor mention tracking

---

## Database Schema

### Core Models

```prisma
Audit {
  id, status, tier, accessToken, expiresAt
  siteUrl, email, productDesc
  competitors[], sections[]
  pagesFound, sitemapUrlCount
  hasRobotsTxt, hasSitemap
  progress (JSON), opportunities (JSON)
  healthScore (JSON), redirectChains (JSON)
  apiUsage (JSON), pipelineState (JSON)
  briefs[], crawledPages[]
}

Brief {
  id, auditId, keyword, searchVolume, difficulty
  title, structure (JSON), intent
  questions[], relatedKw[], suggestedInternalLinks[]
  clusteredKeywords[], totalClusterVolume
  competitors (JSON), estimatedEffort
}

CrawledPage {
  id, auditId, url, section
  title, h1, h2s[], h3s[], content, wordCount
  metaDescription, canonicalUrl
  ogTitle, ogDescription, ogImage
  h1Count, imagesWithoutAlt
  outboundLinks[], readabilityScore
  codeBlockCount, imageCount, codeBlocks[]
  hasSchemaOrg, schemaTypes[], hasViewport
  coreWebVitals (JSON)
}
```

---

## Job Pipeline

**Queue:** pg-boss (PostgreSQL-backed)

**Flow:**
```
Payment/Free Start
  → Create Audit (PENDING)
  → Queue "audit.crawl"
    → Crawl pages → Store CrawledPages
    → Run 17 components in dependency order
    → Persist state after each component
    → CRAWLING → ANALYZING → GENERATING_BRIEFS → COMPLETED
```

**Retry Logic:**
- Components running >10min → marked failed
- Cron every 5min checks stale audits
- Component-level retry (not full re-run)
- 24-hour timeout → FAILED status
- 1-hour delay → "taking longer" email

---

## Frontend Structure

### Dashboard Tabs

| Tab | Content |
|-----|---------|
| Overview | Action plan, top opportunities, sections |
| Opportunities | Topic clusters, suggested actions |
| Quick Wins | Pages ranking 10-30 + AI suggestions |
| AI | Readiness, visibility, new site banner |
| Technical | Issues with severity |
| Briefs | AI content briefs (paid) |
| Performance | Core Web Vitals per page |

### Key Components
- HealthScoreCard - Circular progress + breakdown
- AnalysisProgressCard - Real-time component status
- ActionPlanCard - Prioritized items
- CompetitorAnalysis - Gap visualization
- InternalLinkingSummary
- CannibalizationSummary
- UpgradeBanner / NewSiteBanner

---

## Key Dependencies

### Backend
```
@anthropic-ai/sdk     ^0.39.0
@hono/zod-openapi     ^0.18.4
@prisma/client        ^6.1.0
cheerio               ^1.0.0
hono                  ^4.6.16
openai                ^6.15.0
pg-boss               ^10.1.6
pino                  ^10.1.0
sendpigeon            ^1.9.0
text-readability      ^1.1.1
zod                   ^3.24.1
```

### Frontend
```
@radix-ui/react-*     Various
@react-pdf/renderer   ^4.3.2
framer-motion         ^12.23.26
lucide-react          ^0.562.0
next                  ^15.1.3
react                 ^19.0.0
tailwindcss           ^3.4.17
```

---

## Environment Variables

```env
# Core
DATABASE_URL, FRONTEND_URL, PORT

# DataForSEO
DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD

# Anthropic
ANTHROPIC_API_KEY
AI_MODEL_FAST=claude-haiku-4-5
AI_MODEL_QUALITY=claude-sonnet-4-5

# LemonSqueezy
LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_WEBHOOK_SECRET
LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_VARIANT_*

# Optional
PAGESPEED_API_KEY
OPENAI_API_KEY, PERPLEXITY_API_KEY
```

---

## Roadmap Opportunities

**Missing (vs competitors):**
1. PDF export
2. More technical issues (15 vs 140+)
3. Historical comparison
4. Google Search Console integration
5. JavaScript rendering (SPAs)
6. Backlink analysis
7. Schema markup recommendations
8. Mobile-friendliness analysis
