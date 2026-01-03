# Unranked.io Product Analysis

Last updated: January 2026

---

## Product Positioning

**Edge:** "Find competitor gaps → Prioritize by impact → Get AI briefs. Pay once."

| vs Generic SEO Tools | Unranked |
|---------------------|----------|
| Monthly €99-450 | One-time €0-99 |
| Keyword lists + metrics | Ready-to-write briefs |
| Requires SEO expertise | Dev-friendly, no jargon |
| Weeks to value | Hours to value |

**Target:** Developers, SaaS founders, B2B teams with content (/docs, /blog, /guides)

---

## Current State

### Pricing Tiers

| Tier | Pages | Keywords | Briefs | Competitors | Price |
|------|-------|----------|--------|-------------|-------|
| FREE | 25 | 10 | 3 | 0 | €0 |
| SCAN | 100 | 30 | 10 | 2 | €19 |
| AUDIT | 250 | 50 | 20 | 5 | €49 |
| DEEP_DIVE | 500 | 100 | 40 | 10 | €99 |

### Complete Features

| Feature | Status |
|---------|--------|
| Site discovery + crawling | ✓ |
| Section detection with SSE streaming | ✓ |
| Competitor gap analysis | ✓ |
| Opportunity scoring (volume × 1/difficulty × position bonus) | ✓ |
| AI content briefs (Claude) | ✓ |
| Technical SEO checks (13+ issue types) | ✓ |
| Health score (6 components) | ✓ |
| LemonSqueezy checkout | ✓ |
| Free tier with rate limiting | ✓ |
| Upgrade flow | ✓ |
| Privacy/Terms pages | ✓ |
| PDF export | ✓ |
| Email report on-demand | ✓ |
| Shareable report links (30-day expiry) | ✓ |
| Featured snippet opportunities | ✓ |
| Cannibalization detection | ✓ |
| Search intent classification | ✓ |
| Writing effort estimation | ✓ |
| "People Also Ask" integration | ✓ |
| Semantic AI clustering (Claude) | ✓ |
| Content templates (Markdown) | ✓ |
| Readability scoring (Flesch-Kincaid) | ✓ |
| Code block detection | ✓ |
| Schema.org detection | ✓ |

### Health Score Components (100 total)

```
opportunityDiscovery: 30  // gaps found (measures audit value)
rankingCoverage:      20  // % pages with rankings
positionQuality:      15  // avg position tier
technicalHealth:      15  // weighted issue score
internalLinking:      10  // orphan/underlinked pages
contentOpportunity:   10  // quick wins + high-impact opps
```

### Opportunity Scoring

```typescript
impactScore = log10(volume × (1/difficulty) × positionBonus + 1) × 30

// Position bonus (competitor position):
// Top 10 = 1.5x, Top 20 = 1.2x, Top 30 = 1.1x

// Quick win: difficulty < 30 AND competitor position > 10
```

---

## Tech Stack

**Backend:** Hono + @hono/zod-openapi, PostgreSQL + Prisma, pg-boss jobs
**Frontend:** Next.js 15, React 19, Tailwind, Framer Motion
**External:** DataForSEO, Anthropic Claude, LemonSqueezy, SendPigeon

---

## Gaps & Next Steps

### Need-to-Have (Missing)

| Gap | Priority | Notes |
|-----|----------|-------|
| Tracking/re-engagement | HIGH | One-time = no repeat revenue |
| Onboarding/activation | HIGH | No guidance after audit completes |
| Error state handling | MEDIUM | DataForSEO failures, partial results |
| Rate limit transparency | MEDIUM | Free tier 30/email/24h not visible to user |

### Nice-to-Have (Future)

| Feature | Effort | Notes |
|---------|--------|-------|
| Refresh audit | LOW | 50% price, compare progress |
| Progress tracking | MEDIUM | Monthly re-audit subscription |
| Content calendar | MEDIUM | Prioritize briefs into timeline |
| Export to Notion/Docs | LOW | Beyond PDF |
| Competitor monitoring | HIGH | Track position changes |
| Schema markup recs | LOW | JSON-LD templates |

### Skip for Now

| Feature | Why |
|---------|-----|
| Trending keywords | Different data source needed |
| Topic visualization | Pretty but not actionable |
| Content freshness signals | Scope creep |

---

## Strategic Questions

1. **Retention**: No tracking = no re-engagement. One-time model = high CAC pressure.
   - Add "refresh audit" at 50% price?
   - Monthly tracking tier (€9-19/mo)?
   - "It's been 30 days" reminder email?

2. **Pricing**: Current feels right for launch. Consider €29/€69/€149 after traction.

3. **Go-to-market**: Dev/SaaS founders aren't on SEO Twitter.
   - Dev communities (Reddit r/SaaS, Indie Hackers, HN)
   - Product Hunt launch
   - Integration partnerships (GitBook, Mintlify, Docusaurus)

4. **Repeat revenue**: Free → paid is only revenue event currently.

---

## Architecture Notes

### 3-Stage Async Pipeline (pg-boss)

1. **audit.crawl** - Discover pages, extract content/metadata
2. **audit.analyze** - Keywords, rankings, opportunities, issues
3. **audit.briefs** - Cluster keywords, generate AI briefs, send email

### Key Services

- `crawler.ts` - Sitemap parsing, page extraction, rate limiting
- `analysis.ts` - Opportunity scoring, quick wins, competitor gaps
- `health-score.ts` - 6-component weighted score
- `generator.ts` - AI clustering + brief generation
- `dataforseo.ts` - Keyword data, SERP results, rankings
- `anthropic.ts` - Haiku (fast) + Sonnet (quality) models
