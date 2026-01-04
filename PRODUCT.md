# Unranked - Product Documentation

One-time purchase SEO audit platform. Crawls websites, analyzes keywords, identifies gaps vs competitors, generates AI-powered content briefs.

---

## Product Overview

**Problem:** Website owners know SEO matters but face barriers:
- Enterprise tools (Semrush, Ahrefs) cost $130-500/month
- Per-keyword pricing adds up fast
- Technical audits lack strategic content guidance
- Learning curve is steep for non-SEO professionals

**Solution:** Full-site SEO audit with prioritized opportunities. One-time purchase, no subscription.

**Target Users:** Small business owners, bloggers, freelancers, small agencies, documentation sites

**Differentiator:** AI-powered content briefs with actionable structure - not just "fix this issue" but "here's exactly what to write"

---

## Pricing Tiers

| Tier | Price | Pages | Keywords | Briefs | Competitors |
|------|-------|-------|----------|--------|-------------|
| FREE | €0 | 50 | 0 | 0 | 0 |
| SCAN | €19 | 50 | All | 1 | 0 |
| AUDIT | €49 | 200 | All | 5 | 1 |
| DEEP_DIVE | €99 | 500 | All | Unlimited | 3 |

**Access:** Token-based, 30-day expiry (FREE: 5 days)

---

## Core Features

### 1. Site Discovery & Crawling

**Discovery Methods:**
1. robots.txt parsing → sitemap.xml location
2. Sitemap parsing (handles nested sitemaps, 3 levels deep)
3. Link crawling from discovered pages (fallback)

**Per-Page Extraction:**
- Title tag, meta description
- H1/H2/H3 hierarchy
- Content text (10k chars stored)
- Word count, readability score (Flesch-Kincaid)
- Code blocks (count + first 5 snippets)
- Images (count + alt text audit)
- Outbound links
- Schema.org markup detection
- Canonical URL, OG tags
- Viewport meta tag

**Technical Details:**
- Cheerio for HTML parsing
- text-readability for Flesch-Kincaid
- 10s timeout per page
- Redirect chain tracking (up to 10)
- Section assignment by URL path prefix

### 2. Technical SEO Analysis

**15 Issue Types Detected:**

| Issue | Severity | Rule |
|-------|----------|------|
| Missing title | High | No `<title>` tag |
| Missing H1 | High | No `<h1>` tag |
| Multiple H1s | Medium | More than one `<h1>` |
| Missing meta description | Medium | No description |
| Title too long | Low | >60 characters |
| Thin content | Medium | <100 words |
| Readability too complex | Low | Grade >12 |
| Technical content no code | Medium | Programming topic, 0 code blocks |
| Long content no images | Low | >1000 words, 0 images |
| Images without alt | Medium | `<img>` missing alt attribute |
| Missing viewport | Low | No viewport meta |
| Orphan pages | Medium | 0 inbound internal links |
| Underlinked pages | Low | <2 inbound internal links |
| Redirect chains | Medium | >1 redirect hop |
| Duplicate content | Medium | Near-identical pages |

### 3. Keyword Intelligence

**Extraction Sources:**
- Page titles
- H1 headings
- Current rankings (DataForSEO)

**Per-Keyword Data:**
- Search volume (monthly)
- Keyword difficulty (0-100)
- Current ranking position
- Search intent (informational/transactional/navigational/commercial)
- Featured snippet opportunity

**Analysis Types:**
- **Unranked opportunities:** High-volume keywords you don't rank for
- **Quick wins:** Pages ranking 10-30 (close to page 1)
- **Cannibalization:** Multiple pages targeting same keyword
- **Competitor gaps:** Keywords they rank for, you don't

### 4. Competitor Analysis

**Per Competitor:**
- Crawl top-ranked pages
- Extract ranked keywords
- Compare keyword overlap
- Identify content gaps
- Depth comparison

**Gap Analysis Output:**
- Keywords only competitor ranks for
- Content topics they cover, you don't
- Estimated traffic opportunity

### 5. Internal Linking Analysis

**Metrics:**
- Orphan pages (0 inbound links)
- Underlinked pages (<2 inbound links)
- Link distribution visualization
- Suggested internal link opportunities

### 6. Health Score

**0-100 Score with 6 Components:**

| Component | Max | Calculation |
|-----------|-----|-------------|
| Opportunity Discovery | 30 | Competitor gaps found |
| Ranking Coverage | 20 | % pages with any ranking |
| Position Quality | 15 | Avg position tier |
| Technical Health | 15 | Issues weighted by severity |
| Internal Linking | 10 | 1 - (orphans + underlinked) / total |
| Content Opportunity | 10 | Has quick wins / high-impact opps |

**Grades:** Excellent (80+), Good (60-79), Needs Work (40-59), Poor (<40)

**FREE Tier:** Only technical health + internal linking (normalized to 100)

### 7. Content Brief Generation

**Per Brief Includes:**
- Target keyword + cluster
- Search volume + difficulty
- Suggested title
- Content structure (H1/H2/H3 hierarchy)
- Questions to answer (People Also Ask)
- Related keywords to include
- Internal linking suggestions
- Competitor content analysis
- Estimated writing effort

**Effort Estimation:**
```
base_minutes × (1 + difficulty/200) / 60
```
Ranges: 30min to 8+ hours

**Process:**
1. Cluster keywords semantically (Claude)
2. Fetch SERP + PAA for primary keyword
3. Generate structure via Claude
4. Match internal link targets
5. Calculate effort score

### 8. Featured Snippet Opportunities

**Detection:**
- Keywords where you rank but don't have snippet
- Keywords where snippet is available
- Current snippet holder analysis
- Content format recommendation (list/paragraph/table)

---

## Architecture

### Tech Stack

**Backend:**
- Hono + @hono/zod-openapi
- PostgreSQL + Prisma
- pg-boss (job queue)
- LemonSqueezy (payments)
- Anthropic Claude (Haiku=fast, Sonnet=quality)
- DataForSEO (keywords, SERP, rankings)
- SendPigeon (emails)

**Frontend:**
- Next.js 15 (App Router)
- Tailwind CSS
- Framer Motion
- lucide-react icons

### Data Models

```
Audit
├── id, status, tier, accessToken, expiresAt
├── siteUrl, email, productDesc
├── competitors[], sections[]
├── pagesFound, sitemapUrlCount
├── hasRobotsTxt, hasSitemap
├── progress (JSON - component tracking)
├── opportunities (JSON - all analysis data)
├── healthScore (JSON), redirectChains (JSON)
├── apiUsage (JSON - cost tracking)
├── retryAfter, delayEmailSentAt, supportAlertSentAt
├── createdAt, startedAt, completedAt, reportEmailSentAt
└── briefs[], crawledPages[]

Brief
├── id, auditId, keyword, searchVolume, difficulty
├── title, structure (JSON), intent
├── questions[], relatedKw[], suggestedInternalLinks[]
├── clusteredKeywords[], totalClusterVolume
├── competitors (JSON), estimatedEffort
└── createdAt

CrawledPage
├── id, auditId, url, section
├── title, h1, h2s[], h3s[], content, wordCount
├── metaDescription, canonicalUrl
├── ogTitle, ogDescription, ogImage
├── h1Count, imagesWithoutAlt
├── outboundLinks[], readabilityScore
├── codeBlockCount, imageCount, codeBlocks[]
├── hasSchemaOrg, schemaTypes[], hasViewport
└── createdAt
```

### Status Flow

```
PENDING → CRAWLING → ANALYZING → GENERATING_BRIEFS → COMPLETED
                                                   ↘ RETRYING → COMPLETED
                                                             ↘ FAILED
```

### Resilient Job Pipeline

**3-Stage Pipeline via pg-boss:**

**Stage 1: Crawling**
- Discover pages (sitemap/links)
- Extract content + metadata
- Store CrawledPages
- Initialize progress tracking

**Stage 2: Analysis (Component-based)**

*Local Components (always succeed):*
- technicalIssues
- internalLinking
- duplicateContent
- redirectChains
- actionPlan

*External Components (retryable):*
- currentRankings (DataForSEO)
- competitorAnalysis (DataForSEO)
- keywordOpportunities (DataForSEO)
- cannibalization (DataForSEO)
- snippetOpportunities (DataForSEO)
- intentClassification (Claude)
- keywordClustering (Claude)
- quickWins (Claude)

**Stage 3: Brief Generation**
- Cluster keywords
- Generate briefs (per cluster)
- Store in database

**Retry Logic:**
- Cron every 5 minutes checks stale audits
- Component-level retry (not full re-run)
- 24-hour timeout → FAILED
- 1-hour delay → sends "taking longer" email
- 5+ retries on paid → alerts support

### External Integrations

**DataForSEO:**
- Basic Auth, 5-min in-memory cache
- Functions: keyword data, SERP, PAA, rankings, competitor discovery

**Anthropic Claude:**
- Circuit breaker (5 failures → 60s cooldown)
- Haiku for clustering, Sonnet for briefs
- JSON mode for structured outputs

**LemonSqueezy:**
- Checkout sessions with audit metadata
- Webhook for payment completion
- Pro-rata upgrade pricing

**SendPigeon:**
- Report ready emails
- Delay notifications
- Failure notifications

---

## API Endpoints

### Audit Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /audits/discover | Discover sections (sync) |
| POST | /audits/discover/stream | Discover sections (SSE) |
| POST | /audits | Create audit |
| GET | /audits/{token} | Get audit status |
| GET | /audits/{token}/analysis | Full analysis results |
| GET | /audits/{token}/briefs | List briefs |
| GET | /briefs/{id} | Brief details |
| POST | /audits/{token}/resend-email | Resend report |

### Billing Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /validate-url | Check URL reachability |
| POST | /checkout | Create payment/start free |
| POST | /webhooks/lemonsqueezy | Payment webhook |
| POST | /audits/{token}/upgrade | Upgrade checkout |
| POST | /dev/start-audit | Dev-only bypass |

---

## User Flows

### Flow 1: Free Health Check
1. Landing → "Try free" → /check
2. Enter site + email
3. Submit → auto-starts crawl
4. Redirect to /audit/[token]
5. View limited results (technical only)
6. Upgrade CTA shown

### Flow 2: Full Audit
1. Landing → /analyze
2. Enter site (validates real-time)
3. Enter email, description, competitors
4. Select tier
5. LemonSqueezy checkout
6. Webhook triggers crawl
7. Poll /audit/[token] every 3s
8. Full report unlocks

### Flow 3: Brief Usage
1. Briefs tab → View Brief
2. Review title, structure, questions
3. Copy to clipboard (markdown)
4. Write content
5. Publish + internal link

---

## Frontend Structure

### Pages

| Route | Purpose |
|-------|---------|
| / | Landing (hero, pricing, features) |
| /check | Free health check form |
| /analyze | Full audit form |
| /audit/[token] | Dashboard with tabs |
| /audit/[token]/brief/[id] | Brief detail view |
| /privacy, /terms | Legal pages |

### Dashboard Tabs

| Tab | Content |
|-----|---------|
| Overview | Action plan, top opportunities, section breakdown |
| Opportunities | Topic clusters, suggested actions |
| Quick Wins | Pages ranking 10-30 with AI suggestions |
| Technical | Issues with severity + tooltips |
| Briefs | AI content briefs (paid tiers) |

### Components

**Core UI:** Card, Button, Input, Table, Tabs, Badge, Tooltip, Spinner, Skeleton

**Audit-specific:**
- HealthScoreCard (circular progress, expandable breakdown)
- AnalysisProgress (real-time status, component tracking)
- ActionPlanCard (prioritized items)
- CompetitorAnalysis (gaps visualization)
- InternalLinkingSummary
- CannibalizationSummary
- UpgradeBanner

---

## Gap Analysis vs Competitors

### What We Have vs Competitors

| Feature | Unranked | Semrush | Ahrefs | Screaming Frog |
|---------|----------|---------|--------|----------------|
| Technical audit | 15 issues | 140+ | 170+ | Comprehensive |
| Content briefs | AI-generated | Manual | None | None |
| Keyword research | Via DataForSEO | Native | Native | None |
| One-time pricing | Yes | No ($140+/mo) | No ($130+/mo) | Yes ($279/yr) |
| Backlink analysis | No | Yes | Best | No |
| Core Web Vitals | No | Yes | Yes | Via PageSpeed |
| JavaScript rendering | No | Yes | Yes | Yes |
| Continuous monitoring | No | Yes | Every minute | Manual |
| Compare crawls | No | Yes | Yes | Yes |
| Google Search Console | No | Yes | Yes | No |
| AI/LLM visibility | No | AI Health Score | Brand Radar | No |
| Log file analysis | No | No | No | Yes |
| PDF export | No | Yes | Yes | Yes |

---

## Missing for World-Class

### Critical (Competitive Parity)

1. **Core Web Vitals Integration**
   - PageSpeed Insights API integration
   - LCP, FID, CLS scores per page
   - Performance recommendations
   - Mobile vs desktop comparison

2. **PDF Export**
   - Downloadable audit report
   - Branded, shareable format
   - Executive summary + detailed sections

3. **Compare Crawls Over Time**
   - Store historical snapshots
   - Diff view: new issues, fixed issues
   - Track score improvement
   - Before/after migrations

4. **More Technical Issues (Currently 15 → Target 50+)**
   - Broken internal links
   - 404 pages
   - Mixed content (HTTP on HTTPS)
   - Large page size
   - Too many redirects
   - Noindex pages analysis
   - Hreflang issues
   - XML sitemap errors
   - robots.txt blocking critical pages
   - Duplicate title/description
   - Keyword stuffing detection
   - Content freshness signals

### High Value (Differentiation)

5. **AI/LLM Visibility Score**
   - Can AI crawlers access your content?
   - Are you blocked in robots.txt for GPTBot, ClaudeBot?
   - Content structure for AI comprehension
   - Featured in AI answers likelihood

6. **Google Search Console Integration**
   - Import real click/impression data
   - Verify actual rankings
   - Click-through rate analysis
   - Query coverage gaps

7. **Scheduled Re-audits**
   - Weekly/monthly automated audits
   - Email alerts on score changes
   - Track progress over time
   - Regression detection

8. **JavaScript Rendering**
   - Headless browser crawling option
   - SPA/React/Vue site support
   - Content extraction from JS
   - Compare rendered vs raw HTML

### Medium Value (Nice to Have)

9. **Backlink Analysis**
   - Basic backlink profile
   - Referring domains count
   - Anchor text distribution
   - New/lost links tracking

10. **White-label / Agency Features**
    - Custom branding on reports
    - Client management dashboard
    - Bulk audit pricing
    - API access

11. **Schema Markup Recommendations**
    - Detect missing schema opportunities
    - Generate JSON-LD snippets
    - FAQ, HowTo, Article, Product
    - Validate existing schema

12. **Content Freshness Analysis**
    - Detect stale content
    - Last modified dates
    - Update recommendations
    - Evergreen vs time-sensitive

13. **Mobile-Friendliness Analysis**
    - Mobile usability issues
    - Tap target sizing
    - Content width issues
    - Mobile-first indexing readiness

14. **International SEO**
    - Hreflang implementation check
    - Multi-language content gaps
    - Geo-targeting issues

### Low Value (Future Roadmap)

15. **Log File Analysis**
    - Upload server logs
    - Crawl budget analysis
    - Bot behavior tracking

16. **Visual Topic Map**
    - Cluster visualization
    - Content gap mapping
    - Site structure diagram

17. **Competitor Matrix**
    - Side-by-side comparison
    - Feature parity analysis
    - Gap heatmap

18. **Publishing Checklist**
    - Pre-publish SEO checklist
    - Auto-validate new content
    - Integration with CMS

---

## Competitive Edge Opportunities

### 1. Best-in-Class Content Briefs
**Current strength.** No competitor generates AI briefs with this quality. Double down:
- Add word count targets
- Include content templates (not just outlines)
- Suggest images/diagrams
- Link to stock photo sources
- Competitor content comparison table

### 2. Simplicity Advantage
**Competitors overwhelm.** Ahrefs/Semrush have 50+ features. Position as:
- "SEO audit in 1 click"
- "Actionable in 30 minutes"
- Focus on what matters
- No learning curve

### 3. One-Time Pricing
**Major differentiator.** Subscription fatigue is real. Market heavily:
- "No monthly fees"
- "Pay once, keep forever"
- Cost comparison calculator vs monthly tools

### 4. Documentation/Technical Site Focus
**Niche opportunity.** General tools don't understand:
- Code block importance
- API reference patterns
- Tutorial structure
- Technical terminology

### 5. Speed to Value
**Faster than competitors.**
- Full audit in minutes, not hours
- Immediate actionable items
- No setup required

---

## File Structure

```
docs-analyzer/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── app.ts              # Hono setup
│   │   │   ├── index.ts            # Server + job init
│   │   │   ├── config/
│   │   │   │   └── env.ts          # Env validation
│   │   │   ├── routes/
│   │   │   │   ├── audit.routes.ts
│   │   │   │   └── billing.routes.ts
│   │   │   ├── repositories/
│   │   │   │   ├── audit.repository.ts
│   │   │   │   ├── brief.repository.ts
│   │   │   │   └── crawled-page.repository.ts
│   │   │   ├── services/
│   │   │   │   ├── audit-pipeline.service.ts
│   │   │   │   ├── crawler/
│   │   │   │   ├── seo/
│   │   │   │   │   ├── analysis.ts
│   │   │   │   │   ├── dataforseo.ts
│   │   │   │   │   ├── health-score.ts
│   │   │   │   │   ├── pipeline-runner.ts
│   │   │   │   │   └── components/
│   │   │   │   ├── ai/
│   │   │   │   ├── brief/
│   │   │   │   └── payments/
│   │   │   ├── jobs/
│   │   │   │   ├── audit.jobs.ts
│   │   │   │   └── retry.jobs.ts
│   │   │   ├── schemas/
│   │   │   │   └── audit.schema.ts
│   │   │   ├── types/
│   │   │   │   ├── audit-progress.ts
│   │   │   │   └── stored-analysis.ts
│   │   │   └── lib/
│   │   │       ├── db.ts
│   │   │       └── queue.ts
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/
│       └── src/
│           ├── app/
│           │   ├── page.tsx        # Landing
│           │   ├── check/          # Free check
│           │   ├── analyze/        # Full audit form
│           │   └── audit/[token]/  # Dashboard
│           ├── components/
│           │   ├── ui/             # Base components
│           │   ├── audit/          # Audit-specific
│           │   └── motion.tsx
│           └── lib/
│               ├── api.ts
│               └── types.ts
├── CLAUDE.md
└── PRODUCT.md
```

---

## Environment Variables

```env
# Core
NODE_ENV=development|production|test
PORT=3001
DATABASE_URL=postgresql://...
FRONTEND_URL=https://...

# DataForSEO
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL_FAST=claude-haiku-4-5-20250514
AI_MODEL_QUALITY=claude-sonnet-4-5-20250514

# LemonSqueezy
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_VARIANT_SCAN=
LEMONSQUEEZY_VARIANT_AUDIT=
LEMONSQUEEZY_VARIANT_DEEP_DIVE=

# SendPigeon
SENDPIGEON_API_KEY=
```

---

## Summary

**Strengths:**
- AI-powered content briefs (unique)
- One-time pricing (rare)
- Clean, focused UI
- Resilient pipeline architecture
- Fast time-to-value

**Weaknesses:**
- Limited technical issue coverage (15 vs 140+)
- No Core Web Vitals
- No PDF export
- No historical comparison
- No backlink analysis

**Priority Roadmap:**
1. PDF export (table stakes)
2. Core Web Vitals integration
3. Expand to 50+ technical issues
4. AI/LLM visibility score (differentiation)
5. Compare crawls over time
6. Google Search Console integration
