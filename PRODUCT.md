# Unranked - Product Documentation

SEO audit platform. Analyzes websites for SEO opportunities, technical issues, and content gaps. Generates actionable content briefs.

---

## Product Overview

**Problem:** Website owners know SEO matters but face significant barriers. Enterprise tools are expensive, content tools charge per-keyword, and technical audits lack strategy.

**Solution:** Full-site SEO audit with prioritized opportunities. Crawls pages, analyzes keywords, identifies gaps vs competitors, and generates AI-powered content briefs. One-time purchase, no subscription.

**Target Users:** Small business owners, bloggers, freelancers, small agencies

---

## Pricing Tiers

| Tier | Price | Pages | Opportunities | Briefs | Competitors |
|------|-------|-------|---------------|--------|-------------|
| QUICK_SCAN | €19 | 25 | 10 | 3 | 0 |
| STANDARD | €49 | 100 | 30 | 10 | 2 |
| DEEP_DIVE | €99 | 250 | 50 | 20 | 5 |

---

## Core Features

### 1. Section Discovery

**What it does:** Auto-detect site sections from a domain (blog, guides, products, etc.)

**How it works:**
1. Checks robots.txt for sitemap location
2. Parses sitemap.xml (handles nested sitemaps)
3. Groups URLs by path prefix
4. Samples 3 pages per section to score content quality
5. Streams results via SSE for real-time UI updates

**Technical decisions:**
- Fallback to homepage link crawling if no sitemap
- Ignores auth, admin, legal, account sections
- 100ms delay between requests (rate limiting)
- Content scoring based on word count, code blocks, images

### 2. Site Crawling

**What it does:** Fetches and parses all pages

**Per page extraction:**
- Title tag, H1 heading
- Content text (first 100k chars for storage, 10k in DB)
- Word count
- Internal outbound links
- Readability score (Flesch-Kincaid Grade Level)
- Code block count + first 5 code blocks (max 500 chars each)
- Image count

**Technical decisions:**
- Uses Cheerio for HTML parsing
- text-readability package for Flesch-Kincaid
- Section assignment by URL path prefix
- Respects tier page limits

### 3. SEO Analysis

**Keyword extraction:**
- Extracts from page titles and H1s
- Gets search volume + difficulty from DataForSEO
- Checks current rankings for extracted keywords
- Classifies search intent via AI (tutorial/reference/troubleshooting/conceptual)

**Opportunity identification:**
- Unranked keywords with high potential
- Quick wins: pages ranking 10-30 (close to page 1)
- AI suggestions for quick wins: content gaps, questions to answer, internal links

**Competitor analysis:**
- Crawls competitor domains for ranked keywords
- Identifies keyword gaps (they rank, you don't)
- Content depth comparison

**Technical issues detected:**
- Missing title tag (high severity)
- Missing H1 tag (high severity)
- Thin content (<100 words) (medium)
- Title too long (>60 chars) (low)
- Readability too complex (grade >12) (low)
- Technical content without code examples (medium)
- Long content without images (low)
- Orphan pages (0 inbound links) (medium)
- Underlinked pages (<2 inbound links) (low)

**Keyword cannibalization:**
- Detects multiple pages targeting same keyword
- Flags for consolidation

### 4. Health Score

**0-100 score with 7 weighted components:**

| Component | Max Points | Calculation |
|-----------|------------|-------------|
| Ranking Coverage | 25 | % of pages with any ranking |
| Position Quality | 15 | Avg position tier (1-3=15, 4-10=12, 11-20=8, 21-50=4) |
| Technical Health | 20 | Weighted by issue severity (high=3, med=1, low=0.5) |
| Internal Linking | 20 | 1 - (orphans + underlinked) / total pages |
| Content Opportunity | 10 | Has quick wins or high-impact opps |
| Competitor Parity | 10 | Common vs gap keywords ratio |

**Grades:** Excellent (80+), Good (60-79), Needs Work (40-59), Poor (<40)

### 5. Content Brief Generation

**What it produces per opportunity:**
- Target keyword + search volume + difficulty
- Suggested title
- Content structure (H1/H2/H3 hierarchy)
- Questions to answer (from Google PAA)
- Related keywords to include
- Internal linking suggestions (existing pages to link to)
- Competitor analysis (what top pages cover)
- Estimated writing effort (30min to 8+ hours)

**How it works:**
1. Clusters keywords semantically via AI (1 brief per cluster)
2. Fetches SERP + PAA for primary keyword
3. AI generates title + structure based on competitive context
4. Finds internal link targets via keyword matching
5. Estimates effort based on structure complexity + difficulty

**Effort formula:** `base_minutes × (1 + difficulty/200) / 60`

---

## Architecture

### Tech Stack

**Backend:**
- Hono + @hono/zod-openapi (typed REST API)
- PostgreSQL + Prisma ORM
- pg-boss (job queue)
- Stripe (payments)
- Anthropic Claude (AI: Haiku for fast, Sonnet for quality)
- DataForSEO (keyword data, SERP, rankings)

**Frontend:**
- Next.js 15 (App Router)
- Tailwind CSS + CSS variables
- Framer Motion (animations)
- React hooks + Context API

### Data Models

```
Audit
├── id, status, siteUrl, email, tier
├── productDesc, competitors[], sections[]
├── pagesFound, opportunities (JSON)
├── healthScore (JSON), detectedSections (JSON)
├── stripeSessionId
└── briefs[], crawledPages[]

Brief
├── id, auditId, keyword, searchVolume, difficulty
├── title, structure (JSON), questions[], relatedKw[]
├── competitors (JSON), suggestedInternalLinks[]
├── clusteredKeywords[], totalClusterVolume
└── estimatedEffort

CrawledPage
├── id, auditId, url, title, h1
├── content, wordCount, section
├── outboundLinks[], readabilityScore
├── codeBlockCount, imageCount, codeBlocks[]
```

### Audit Status Flow

```
PENDING → CRAWLING → ANALYZING → GENERATING_BRIEFS → COMPLETED
                                                   ↘ FAILED
```

### Job Pipeline

**3-stage async pipeline via pg-boss:**

1. **audit.crawl** (10min timeout, 3 retries)
   - Discover pages from sitemap/homepage
   - Crawl up to tier limit
   - Extract content + metadata
   - Store CrawledPages

2. **audit.analyze** (10min timeout, 3 retries)
   - Get keyword data from DataForSEO
   - Check rankings, find quick wins
   - Competitor gap analysis
   - Technical issue detection
   - Internal linking analysis
   - Health score calculation
   - Intent classification

3. **audit.briefs** (10min timeout, 3 retries)
   - Cluster keywords via AI
   - Generate briefs for each cluster
   - Store in database

### Repository Pattern

```
Controller → Service (domain models) → Repository (DB access)
```

- **NO Prisma outside repositories**
- Services return domain models, not DB types
- Types flow: DB → Domain → API Response

### External Integrations

**DataForSEO:**
- Basic Auth
- 5-minute in-memory cache
- Functions: keyword data, SERP, PAA, related keywords, URL rankings

**Stripe:**
- Checkout sessions with audit metadata
- Webhook for payment completion
- Price IDs per tier

**Anthropic:**
- Two model tiers (cost vs quality)
- JSON mode for structured outputs
- Batch processing for intent classification (50 kw/batch)

---

## User Flows

### Flow 1: New Audit

1. User enters domain on landing page
2. Redirected to `/new/discover?site=...`
3. SSE streams section discovery progress
4. User selects sections to include
5. Continues to `/new?site=...&sections=...`
6. Fills form: email, product description, competitors
7. Selects pricing tier
8. Redirects to Stripe checkout
9. On success → `/audit/[id]?success=true`
10. Dashboard polls every 3s until COMPLETED

### Flow 2: View Results

1. Dashboard shows live progress during processing
2. Completed audit shows:
   - Health score circle + breakdown
   - Docs quality assessment
   - Tab navigation: Overview, Opportunities, Quick Wins, Technical Issues, Briefs
3. Click into individual brief for full details
4. Copy brief to clipboard

---

## API Endpoints

### Audit Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/audits/discover` | Discover sections (sync) |
| POST | `/audits/discover/stream` | Discover sections (SSE) |
| POST | `/audits` | Create audit |
| GET | `/audits/{id}` | Get audit status |
| GET | `/audits/{id}/analysis` | Get full analysis |
| GET | `/audits/{id}/briefs` | List briefs |
| GET | `/briefs/{id}` | Get brief details |
| GET | `/health` | Health check |

### Stripe Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/checkout` | Create Stripe session |
| POST | `/webhooks/stripe` | Payment webhook |
| POST | `/dev/start-audit` | Dev-only: bypass payment |

---

## Frontend Components

### Pages

- `/` - Landing (hero, pricing, features)
- `/new/discover` - Section discovery UI
- `/new` - Audit form
- `/audit/[id]` - Dashboard (2000+ lines)
- `/audit/[id]/brief/[briefId]` - Brief viewer

### UI Kit

- Button, Input, Card, Badge, Tabs, Table
- Spinner, Skeleton (shimmer variants)
- ThemeProvider (light/dark/system)
- Motion primitives (SlideUp, StaggerList)
- DocsQuality (expandable assessment)
- PricingCard (tier selection)

### Design System

**Light mode:** White canvas, dark text, strong contrast
**Dark mode:** Near-black canvas (#0a0a0a), light text

**Typography:** Inter (body), Inter Tight (headings)
**Status colors:** Green (#16a34a), Amber (#ca8a04), Red (#dc2626)

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| pg-boss over Redis queue | PostgreSQL already required; simpler infra |
| Two AI models | Haiku for fast/cheap clustering, Sonnet for quality briefs |
| In-memory DataForSEO cache | Simple; single server deployment assumed |
| SSE for discovery | Real-time feedback without WebSocket complexity |
| Polling for audit status | Simpler than WebSockets; 3s interval acceptable |
| JSON columns for opportunities/health | Flexible schema evolution; single audit scope |
| Cascade delete on briefs/pages | Audit is atomic unit; no orphan cleanup |
| No auth | One-time purchase model; email for delivery |
| Zod-OpenAPI | Single source of truth for types + API docs |

---

## Implemented Features (from roadmap)

| Feature | Status |
|---------|--------|
| Section-based reporting | Done |
| Health score | Done |
| Keyword clustering | Done |
| Cannibalization detection | Done |
| Readability score | Done |
| Search intent classification | Done |
| Code example coverage | Done |
| Image presence detection | Done |
| Effort estimation | Done |
| Quick win suggestions | Done |

---

## Not Yet Implemented

| Feature | Priority | Notes |
|---------|----------|-------|
| PDF export | Medium | Generate downloadable report |
| Email delivery | Medium | Send report on completion |
| Schema markup recommendations | Medium | JSON-LD for HowTo, FAQ, Article |
| Content freshness signals | Low | Flag stale content |
| Featured snippet opportunities | Medium | Keywords with FS you could capture |
| Trending keywords | Low | Emerging terms in niche |
| Content templates | Medium | Markdown starters, not just H2s |
| Publishing checklist | Low | Meta, OG image, internal links, schema |
| Visual topic map | Low | Cluster visualization |
| Competitor matrix | Low | Side-by-side comparison |

---

## Environment Variables

```env
# Core
NODE_ENV=development|production|test
PORT=3001
DATABASE_URL=postgresql://...
FRONTEND_URL=https://...

# External APIs
DATAFORSEO_LOGIN=<email>
DATAFORSEO_PASSWORD=<password>
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL_FAST=claude-haiku-4-5-20250514
AI_MODEL_QUALITY=claude-sonnet-4-5-20250514

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_QUICK_SCAN=price_...
STRIPE_PRICE_STANDARD=price_...
STRIPE_PRICE_DEEP_DIVE=price_...
```

---

## File Structure

```
docrank/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── app.ts              # Hono setup, routes, CORS
│   │   │   ├── index.ts            # Server start, job queue init
│   │   │   ├── config/
│   │   │   │   ├── env.ts          # Zod validation
│   │   │   │   └── stripe.ts       # Pricing config
│   │   │   ├── routes/
│   │   │   │   ├── audit.routes.ts # 7 endpoints
│   │   │   │   └── stripe.routes.ts# 3 endpoints
│   │   │   ├── repositories/
│   │   │   │   ├── audit.repository.ts
│   │   │   │   ├── brief.repository.ts
│   │   │   │   └── crawled-page.repository.ts
│   │   │   ├── services/
│   │   │   │   ├── crawler/
│   │   │   │   ├── seo/
│   │   │   │   ├── ai/
│   │   │   │   ├── brief/
│   │   │   │   └── payments/
│   │   │   ├── jobs/
│   │   │   │   └── audit.jobs.ts   # 3-stage pipeline
│   │   │   ├── lib/
│   │   │   │   ├── db.ts           # Prisma client
│   │   │   │   └── queue.ts        # pg-boss singleton
│   │   │   └── schemas/
│   │   │       └── audit.schema.ts # Zod + OpenAPI
│   │   └── prisma/
│   │       └── schema.prisma       # 3 models
│   └── web/
│       └── src/
│           ├── app/
│           │   ├── page.tsx        # Landing
│           │   ├── new/
│           │   │   ├── page.tsx    # Audit form
│           │   │   └── discover/
│           │   │       └── page.tsx# Section discovery
│           │   └── audit/
│           │       └── [id]/
│           │           ├── page.tsx# Dashboard
│           │           └── brief/
│           │               └── [briefId]/
│           │                   └── page.tsx
│           ├── components/
│           │   ├── ui/             # Button, Input, Card, etc.
│           │   ├── motion.tsx
│           │   └── pricing-card.tsx
│           └── lib/
│               ├── api.ts          # API client + types
│               └── utils.ts
├── CLAUDE.md                       # Dev instructions
├── analysis.md                     # Roadmap/status
└── package.json                    # Monorepo root
```
