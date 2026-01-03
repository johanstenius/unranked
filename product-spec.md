# Product Specification: Site SEO Audit Tool

**Version 1.0 — January 2026**  
**Working title:** [TBD] — formerly GrowDocs

---

## Executive Summary

A one-time purchase SEO audit tool that crawls any website, identifies technical issues, finds keyword gaps, analyzes competitors, and generates AI-powered content briefs.

Unlike subscription-based tools (Surfer, Frase, Clearscope at $45-189/mo), this offers comprehensive site-wide analysis at a single price point.

---

## Problem Statement

Website owners know SEO matters but face significant barriers:

- **Enterprise tools are expensive:** Ahrefs ($99+/mo), Semrush ($139+/mo), Clearscope ($189/mo)
- **Content tools are per-keyword:** Surfer and Frase charge per article, costs add up
- **Technical audits lack strategy:** Tools like SEOitis show what's broken but not what to create
- **No affordable all-in-one:** Nothing does technical audit + keyword gaps + content briefs at one-time pricing

---

## Target Customers

### Primary: Small Business Owners & Bloggers

- Run their own website (WordPress, Webflow, Squarespace, custom)
- Know SEO matters but don't have time to learn it deeply
- Budget-conscious — can't justify $100+/month subscriptions
- Want actionable advice, not data dumps

### Secondary: Freelancers & Small Agencies

- Offer SEO services to clients
- Need affordable tools to run client audits
- Would pay more for white-label reports

### Not Targeting

- Enterprise teams (long sales cycles, need integrations)
- SEO professionals with existing tool stacks
- Sites without existing content to audit

---

## Value Proposition

> **"Full-site SEO audit + keyword gaps + AI content briefs. One price, no subscription."**

---

## Core Features

### 1. Site Discovery & Crawling

- Input: URL or sitemap
- Auto-detect sitemap.xml if not provided
- Parse all URLs, group by path pattern
- Display section breakdown:
  - `/blog` (23 pages)
  - `/products` (47 pages)
  - `/guides` (12 pages)
- User can select which sections to analyze

### 2. Technical SEO Audit

Per-page analysis:

| Check | What we detect |
|-------|----------------|
| Title tag | Missing, too long (>60 chars), duplicate |
| Meta description | Missing, too long (>160 chars) |
| H1 tags | Missing, multiple, duplicates across site |
| Heading hierarchy | Broken H1→H2→H3 structure |
| Word count | Thin content (<300 words) |
| Internal links | Orphan pages, underlinked pages |
| Image alt tags | Missing alt text |
| Schema markup | Present/absent |
| Open Graph | Missing OG tags |
| Canonical URL | Missing or misconfigured |

Site-wide issues:

- Duplicate titles across pages
- Duplicate meta descriptions
- Broken internal links
- Redirect chains

### 3. Keyword Analysis

- Pull current rankings for the domain (via DataForSEO or similar)
- Show: search volume, keyword difficulty, current position
- Identify "striking distance" keywords (positions 5-20)
- Surface keyword cannibalization (multiple pages targeting same keyword)
- Group keywords by topic/intent

### 4. Competitor Gap Analysis

- User inputs 1-3 competitor URLs
- Or: auto-suggest competitors based on keyword overlap
- Show keywords competitors rank for that user doesn't
- Prioritize by: search volume × (1 / difficulty)
- Filter by realistic difficulty (KD < 40 for small sites)

### 5. AI Content Briefs

For each identified opportunity, generate:

- Suggested title and meta description
- Recommended word count (based on SERP analysis)
- Outline with H2/H3 structure
- Questions to answer (from People Also Ask)
- Primary + secondary keywords to include
- Internal linking suggestions (link to existing pages)
- Competitor comparison: what top 3 results cover

---

## User Flow

### Step 1: Start Analysis

User provides:
- Website URL
- Email (for report delivery)
- Brief description of their business (1-2 sentences)
- Competitor URLs (optional, up to 3)

### Step 2: Discovery

System shows:
- Sections found on site
- Page count per section
- User confirms which sections to analyze

### Step 3: Processing

Live progress display:
1. Crawling pages...
2. Analyzing technical issues...
3. Fetching keyword data...
4. Comparing with competitors...
5. Generating content briefs...

Show streaming preview of findings as they're discovered.

### Step 4: Dashboard (Report)

**Overview stats:**
- Health score (0-100)
- Pages analyzed
- Technical issues found
- Keyword opportunities
- Quick wins

**Tabs:**
- Technical Issues (grouped by severity)
- Keywords (current rankings)
- Opportunities (gaps + briefs)
- Competitors (side-by-side comparison)

### Step 5: Content Brief Detail

Click any opportunity to see full brief:
- Target keyword + related keywords
- Suggested title
- Recommended structure (outline)
- Questions to answer
- Word count target
- Internal links to add
- What competitors cover

---

## Pricing

| Tier | Pages | Price | Target |
|------|-------|-------|--------|
| Starter | Up to 50 | €29 | Bloggers, small sites |
| Growth | Up to 200 | €69 | Small business |
| Pro | Up to 500 | €149 | Agencies, bigger sites |

All tiers include:
- Full technical audit
- Keyword analysis
- Competitor gap analysis
- AI content briefs for top opportunities
- PDF export

**One-time payment. No subscription.**

### Future: Subscription Add-on

For users who want ongoing monitoring:

| Tier | Price/mo | Includes |
|------|----------|----------|
| Monitor | €19/mo | Weekly rank tracking, alerts on drops |
| Growth | €49/mo | Monthly re-crawl, new opportunity alerts |

(Not MVP — validate one-time first)

---

## Competitive Positioning

| Tool | Technical Audit | Keywords | Content Briefs | Price | Model |
|------|-----------------|----------|----------------|-------|-------|
| SEOitis | ✓ (27 checks) | ✗ | ✗ | $9 | Lifetime |
| Frase | ✗ | ✓ | ✓ | $45/mo | Subscription |
| Surfer SEO | Light | ✓ | ✓ | $89/mo | Subscription |
| Clearscope | ✗ | ✓ | ✓ | $189/mo | Subscription |
| Semrush | ✓ | ✓ | ✓ | $139+/mo | Subscription |
| **This product** | ✓ | ✓ | ✓ | €29-149 | One-time |

**Our edge:**
- vs SEOitis: We add keyword data + content briefs
- vs Frase/Surfer: One-time pricing, site-wide analysis (not per-keyword)
- vs Semrush: 10x cheaper, simpler, focused

---

## Technical Architecture

### Stack

- **Frontend:** Next.js + React + Tailwind
- **Backend:** Node.js API routes (or separate service)
- **Database:** PostgreSQL (reports, user data)
- **Queue:** Redis + Bull (job processing)
- **Payments:** Stripe (one-time checkout)

### External APIs

| Service | Purpose | Cost estimate |
|---------|---------|---------------|
| DataForSEO | Keywords, rankings, SERP data | ~€0.20-0.50 per audit |
| OpenAI / Anthropic | Content brief generation | ~€0.05-0.10 per brief |

**Unit economics at €69 (Growth tier):**
- API costs: ~€1-2
- Stripe fees: ~€2
- Margin: ~€65 (94%)

### Crawler

- Use Playwright or Puppeteer for JS-rendered sites
- Respect robots.txt
- Rate limit: 2-3 requests/second
- Timeout: 30s per page
- Store: HTML, extracted text, metadata

---

## MVP Scope

### In Scope (v1.0)

- Site crawling via sitemap
- Technical audit (core checks)
- Keyword gap analysis (vs 1-3 competitors)
- AI content briefs (top 10 opportunities)
- Dashboard with results
- PDF export
- Stripe payment

### Out of Scope (Later)

- Rank tracking over time
- Scheduled re-crawls
- White-label reports
- Team accounts
- API access
- WordPress plugin

---

## Success Metrics

### Validation (first 30 days)

- 10+ paid customers
- <5% refund rate
- NPS > 40

### Growth (first 6 months)

- €5k MRR equivalent (in one-time sales)
- 50+ customers
- 3+ organic testimonials

---

## Open Questions

1. **Name:** GrowDocs doesn't fit anymore. Options:
   - RankAudit
   - SiteGrow  
   - BrieflyAI
   - ContentGap
   - AuditFlow
   - PageRank (taken?)
   - Other?

2. **Free tier:** Should we offer a limited free audit (technical only, no keywords) to hook users?

3. **Report delivery:** In-app dashboard only, or also email PDF?

4. **Competitor auto-detection:** Build it, or just let users input competitors manually?

---

## Next Steps

1. Finalize name and branding
2. Build HTML mockups for key screens
3. Set up landing page
4. Implement crawler + technical audit
5. Integrate DataForSEO for keywords
6. Add AI brief generation
7. Stripe integration
8. Beta test with 5 real users
9. Launch at €29 (Starter) to validate

---

*Document last updated: January 2026*
