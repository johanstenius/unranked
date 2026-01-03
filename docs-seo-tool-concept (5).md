# DocRank — Documentation SEO Tool

## Core Insight

Documentation is an underutilized acquisition channel. Big players (Stripe, Twilio, Vercel) rank for thousands of developer queries through their docs. But most teams write docs reactively ("I need to explain this feature") instead of strategically ("What are people searching for that I could answer?").

Generic SEO tools exist but don't understand docs. Doc platforms (GitBook, Mintlify) host docs but don't help you rank.

**The gap:** A tool that tells you exactly what doc pages to write, how to structure them, and tracks your progress.

---

## Target Customers

### Primary: Indie devs & small SaaS (1-10 people)
- Know SEO matters but don't have time to learn it
- Can't afford €200+/month for Ahrefs + Clearscope
- Technical enough to implement suggestions
- Price sensitive: €29-49 range

### Secondary: DevRel teams at mid-size companies
- Measured on docs traffic/engagement
- Need to justify their work with data
- Have budget: €100-300/month
- Want monitoring & reporting

### Tertiary: Agencies & freelancers
- DevRel consultants, technical content agencies
- Use for client work
- Would pay for white-label or bulk pricing

---

## The Product

### Scope: All Content, Not Just /docs

Documentation isn't always in `/docs`. Content that ranks can live anywhere:

| Path | Example content |
|------|-----------------|
| /docs | API reference, setup guides |
| /blog | Tutorials, announcements |
| /guides | How-tos, walkthroughs |
| /learn | Educational content |
| /tools | Calculators, utilities |
| /changelog | Feature updates |

**Approach:** Analyze everything, report by section.

### Input

Simple — just the main domain:

```
Your website: sendpigeon.dev
```

We handle the rest:

1. Fetch sitemap.xml (or crawl if not found)
2. Auto-detect content sections
3. Show user what we found
4. Let them toggle sections on/off
5. Analyze selected sections

**Discovery confirmation UI:**

```
Found content on sendpigeon.dev:

Sitemap: ✓ Found

Sections detected:
☑ /docs      47 pages
☑ /blog      23 pages
☑ /guides    12 pages
☐ /changelog  8 pages

[Start Analysis →]
```

**Additional inputs:**
- Product description (1-2 sentences)
- Competitors (optional, 2-3 domains)
- Email (for report delivery)

### Content Discovery (Technical)

**Step 1: Find sitemap**

Try in order:
- `domain.com/sitemap.xml`
- `domain.com/sitemap_index.xml`
- Check `robots.txt` for sitemap location
- Fallback: crawl from root if no sitemap

**Step 2: Parse URLs**

Extract all URLs from sitemap, gives clean list without crawling.

**Step 3: Group by section**

```javascript
// Group by first path segment
{
  '/docs': ['/docs/getting-started', '/docs/auth', ...],
  '/blog': ['/blog/v2-release', '/blog/tips', ...],
  '/guides': ['/guides/smtp', '/guides/webhooks', ...],
}
```

**Step 4: Crawl & analyze**

Same process as before, but tag each page with its section.

**Step 5: Report by section**

```
📊 Content Overview

/docs (47 pages)
├── 12 ranking
├── 20 opportunities
└── Top opp: "smtp relay nodejs" (1,400/mo)

/blog (23 pages)  
├── 8 ranking
├── 15 opportunities
└── Top opp: "email deliverability tips" (890/mo)

/guides (12 pages)
├── 3 ranking  
├── 8 opportunities
└── Top opp: "transactional email tutorial" (650/mo)
```

**Fallback if no sitemap:**

Crawl from root:
1. Fetch homepage
2. Find all internal links
3. Follow recursively (depth limit: 3-4)
4. Group by path pattern

Slower but works.

### Output

**Keyword Gap Analysis**
- "People search for X but you have no page for it"
- Search volume + difficulty for each opportunity
- Prioritized by impact

**Competitor Comparison**
- What do they rank for that you don't?
- Content depth comparison
- Structure analysis

**Content Briefs** (per opportunity)
- Suggested page title
- Target keyword + related terms
- Recommended structure (H2s, H3s)
- Questions to answer (from "People Also Ask")
- Internal linking suggestions
- Schema markup recommendations

**Site-wide Recommendations**
- Internal linking improvements
- Technical SEO issues
- Content freshness signals

---

## User Workflow

```
Connect docs URL
      ↓
System crawls all pages
      ↓
AI analyzes product positioning
      ↓
Fetch keyword data (volumes, rankings)
      ↓
Identify gaps & opportunities
      ↓
Generate prioritized report
      ↓
User picks opportunities to pursue
      ↓
Get detailed content brief
      ↓
Write & publish
      ↓
Track ranking progress (recurring)
```

---

## Why Not Just Use ChatGPT/Claude?

AI chat can help with individual pages but can't:

- Provide **real search volume data** (AI guesses, doesn't know)
- Show **actual ranking positions** (no access to Google SERPs)
- **Crawl entire sites** automatically (manual paste = painful)
- **Track changes over time** (no memory between sessions)
- **Scale competitor analysis** (can't crawl their 200 pages)

**The value is: data + automation, not just AI.**

AI is the interface layer, not the core value.

---

## Technical Approach

### Data Sources
- **Keyword volumes:** DataForSEO (~€0.0015/keyword)
- **SERP rankings:** DataForSEO SERP API (~€0.002/search)
- **Crawling:** Custom (Cheerio/Puppeteer)
- **AI analysis:** OpenAI/Claude API for briefs & insights

### Cost Per Audit (estimated)
- 50 pages crawled: free (own code)
- 200 keyword lookups: €0.30
- 20 SERP checks: €0.04
- AI processing: ~€0.10
- **Total: ~€0.50 per audit**

### Stack
- Next.js frontend
- Node.js backend
- PostgreSQL
- Queue system for async crawling
- DataForSEO for SEO data
- OpenAI/Claude for AI features

### Data Sources — Legal Status

Both primary data providers explicitly allow commercial use:

- **DataForSEO:** Built for this use case — 750+ SEO software companies use their APIs. They handle scraping liability.
- **SerpApi:** Offers "Legal US Shield" — they assume scraping/parsing liabilities for commercial users.

Building a product on top of these APIs is explicitly permitted and encouraged. You're buying data, not scraping Google yourself.

---

## Content Brief Generation (Technical)

Content briefs are the core deliverable. Here's how they work:

### What's in a Brief

| Element | Data source | Difficulty |
|---------|-------------|------------|
| Target keyword | DataForSEO (from gap analysis) | Easy |
| Search volume + difficulty | DataForSEO | Easy |
| Suggested title | AI generates based on keyword + product context | Easy |
| Recommended H2/H3 structure | AI analyzes top-ranking pages | Medium |
| Questions to answer | DataForSEO "People Also Ask" API | Easy |
| Related keywords to include | DataForSEO related keywords | Easy |
| Internal linking suggestions | Your crawl data (existing pages to link to) | Easy |
| Competitor content summary | Crawl + AI summarization | Medium |

### The Generation Flow

```
Input:
├── Keyword opportunity: "smtp relay setup"
├── Your product: "Transactional email API"
├── Your existing docs: [list of pages from crawl]
└── Top 5 ranking pages for this keyword: [crawled content]

Process:
├── Fetch SERP data (who ranks for this?)
├── Fetch People Also Ask questions
├── Fetch related keywords
├── Crawl & summarize top competitor pages
└── Feed everything to AI with structured prompt

Output:
├── Suggested title
├── H2/H3 structure
├── Key points to cover
├── Questions to answer
├── Related keywords to include
├── Internal pages to link to
└── What competitors cover that you should too
```

### Why This Beats Generic AI

| Generic AI brief | Your tool's brief |
|------------------|-------------------|
| "Write about SMTP relay" | "Target 'smtp relay nodejs' (1,200 searches/mo)" |
| Guesses at structure | Structure based on what's actually ranking #1-5 |
| No linking suggestions | "Link to your existing /docs/authentication page" |
| No competitor awareness | "Competitor X covers Y — you should address Z" |
| No search data | Real volume, difficulty, PAA questions |

### Cost Per Brief

| Component | Cost |
|-----------|------|
| SERP fetch | €0.002 |
| People Also Ask | €0.001 |
| Related keywords | €0.001 |
| AI generation (Claude) | €0.02-0.05 |
| **Total per brief** | **~€0.03-0.06** |

At €49 for 10 briefs → cost ~€0.50 → healthy margin.

---

## The Audit Report (What We Deliver)

The report has three parts: where you are, what you're missing, and what to do.

### Section 1: Current State

*"How are your docs performing right now?"*

| What we show | Data source |
|--------------|-------------|
| Pages that rank (and for what keywords) | SERP API — check your URLs |
| Current positions (1-100) | SERP API |
| Pages ranking poorly (position 20+) | SERP API |
| Pages with zero rankings | Compare crawl vs SERP data |
| Estimated organic traffic | Search volume × CTR by position |
| Technical SEO issues | Crawl (missing titles, thin content, etc.) |

**Example output:**

```
📊 Your Docs Overview
─────────────────────
Total pages crawled: 47
Pages ranking (top 100): 12
Pages ranking (top 10): 3
Estimated monthly traffic: ~1,200 visits

🏆 Top Performing Pages
───────────────────────
/docs/getting-started     → "sendpigeon api" (#4, 320 vol)
/docs/smtp-setup          → "smtp relay api" (#8, 890 vol)
/docs/webhooks            → "email webhook" (#12, 210 vol)

⚠️ Underperforming (Ranking 20-100)
───────────────────────────────────
/docs/authentication      → "api authentication" (#34)
/docs/templates           → "email templates api" (#67)

❌ Not Ranking
──────────────
/docs/rate-limits
/docs/error-codes
/docs/sdks/python
... (23 more pages)
```

### Section 2: Opportunities

*"What are you missing?"*

| What we show | Data source |
|--------------|-------------|
| Keywords you should rank for but don't | Keyword research + gap analysis |
| What competitors rank for that you don't | Competitor crawl + SERP comparison |
| High-value keywords in your niche | DataForSEO keyword suggestions |
| Questions people are asking | People Also Ask data |

**Example output:**

```
🎯 Keyword Opportunities
────────────────────────
Keyword                       Volume   Difficulty   Competitor
──────────────────────────────────────────────────────────────
"transactional email nodejs"   1,400   Medium       Postmark (#2)
"send email api python"        2,100   Medium       SendGrid (#1)
"email delivery status"          890   Low          Mailgun (#3)
"smtp api vs http api"           450   Low          None

🔍 Competitor Gap Analysis
──────────────────────────
Postmark ranks for 34 keywords you don't cover
SendGrid ranks for 67 keywords you don't cover

Top gaps:
- "email bounce handling" → Postmark #2, you: not ranking
- "email analytics api" → SendGrid #1, you: not ranking
```

### Section 3: Action Plan

*"Here's what to do, prioritized"*

| What we show | How we prioritize |
|--------------|-------------------|
| Quick wins | Pages ranking 10-30 that could move up |
| New pages to create | High volume + low difficulty keywords |
| Content briefs | Detailed instructions for top opportunities |
| Internal linking fixes | Orphan pages, missing links |

**Example output:**

```
🚀 Quick Wins (improve existing pages)
──────────────────────────────────────
1. /docs/authentication (#34 → potential #10)
   - Add section on "API key best practices"
   - Answer: "How to rotate API keys"
   - Link from: /docs/getting-started

2. /docs/templates (#67 → potential #15)
   - Expand with code examples
   - Cover "dynamic email templates"

📝 New Pages to Create
──────────────────────
Priority  Keyword                       Volume  Difficulty
──────────────────────────────────────────────────────────
1         "transactional email nodejs"   1,400  Medium     → [View Brief]
2         "send email api python"        2,100  Medium     → [View Brief]
3         "email delivery status"          890  Low        → [View Brief]

🔗 Internal Linking Fixes
─────────────────────────
/docs/getting-started should link to → /docs/webhooks
/docs/smtp-setup should link to → /docs/authentication
/docs/error-codes is orphaned (no pages link to it)
```

### Report Summary

| Section | Purpose |
|---------|---------|
| Overview | High-level stats, health score |
| Current Rankings | What's working, what's underperforming |
| Opportunities | Keywords you're missing |
| Competitor Gaps | What they rank for that you don't |
| Quick Wins | Improvements to existing pages |
| New Pages | What to create, prioritized |
| Content Briefs | Detailed instructions for each opportunity |
| Technical Issues | SEO problems to fix |

**The key insight:** Not just "here's what to write" but "here's where you are, here's where you could be, here's exactly how to get there."

---

## Analysis Delivery (UX)

### Processing Time

| Step | Time |
|------|------|
| Crawl 100 pages | 1-3 min |
| Keyword lookups | 30-60 sec |
| SERP checks (current rankings) | 30-60 sec |
| AI brief generation | 1-2 min |
| **Total** | **3-7 minutes** |

Too long for a spinner. Too short for "we'll email you tomorrow."

### Approach: Live Progress + Email

**Collect email upfront:**
- Required before analysis starts
- Backup if they close the tab
- Send full PDF report when done
- Follow-up for upsell later

**Show progress in real-time:**

```
✓ Crawling your docs... 47/100 pages
✓ Analyzing keywords... found 34 opportunities  
→ Checking current rankings...
○ Generating content briefs...
○ Building your report...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 65%

[Preview: Showing results as they come in...]
```

**Stream partial results as they complete:**

| When | Show |
|------|------|
| Crawl done | Page list, basic stats |
| Keywords done | Opportunity list with volume |
| Rankings done | Current state section |
| Briefs done | Full report unlocked |

User sees value building up — feels fast even if it takes 5 minutes.

**On completion:**
- Full dashboard available immediately
- Email sent with PDF export
- "Want to track if these pages rank? → Upgrade to Growth"

---

## Product Strategy & Business Model

### The Model

Two distinct offerings serving different needs:

1. **One-time Audit** — Entry point, validates the problem, gets people in the door
2. **Subscription** — Ongoing value through tracking and fresh opportunities

The natural flow: Audit → See value → Want to track results → Subscribe

### Why Recurring Makes Sense

SEO isn't "fix and forget":

| What changes | Why it matters |
|--------------|----------------|
| Your rankings | Did those new pages actually rank? Did you drop from #3 to #8? |
| Competitors | They just published 10 new docs targeting your keywords |
| Search trends | New terms emerge as technology evolves |
| Your product | New features = new documentation opportunities |
| Content freshness | Google favors updated content — what's gone stale? |

---

## Pricing Tiers

### One-Time Audits (3 tiers)

| | Quick Scan | Standard | Deep Dive |
|--|------------|----------|-----------|
| **Price** | €19 | €49 | €99 |
| **Pages crawled** | 25 | 100 | 250+ |
| **Keyword opportunities** | 10 | 30 | 50 |
| **Competitor analysis** | ❌ | 2 competitors | 5 competitors |
| **Content briefs** | 3 | 10 | 20 |
| **Internal linking audit** | ❌ | Basic | Detailed |
| **Technical SEO checks** | ❌ | Basic | Full |
| **Delivery time** | 48h | 24h | 12h |
| **Export format** | PDF only | PDF + Dashboard | PDF + Dashboard + CSV |

**Quick Scan — €19**
- Impulse buy, low risk
- "Let me see if this is useful"
- Great for very small docs or validation

**Standard — €49**
- Sweet spot for most indie devs
- Full analysis + actionable briefs
- Enough detail to execute on

**Deep Dive — €99**
- For larger docs sites or serious teams
- Comprehensive competitor analysis
- Full technical SEO audit
- Priority delivery

**Upsell opportunity:** Someone buys Quick Scan → sees value → "Upgrade to Standard for €35" (discounted)

**Not included in any audit tier:**
- Rank tracking
- Ongoing monitoring
- Alerts
- Refreshed opportunities

→ These require a subscription (Growth or Pro)

---

### Growth — €29/month

*"Track my progress and find new opportunities"*

**Everything in Audit, plus:**

- Rank tracking
  - Monitor rankings for your target keywords
  - Weekly position updates
  - Historical trend charts
- New opportunities
  - Monthly refresh of keyword gaps
  - "You should write about X" suggestions
- Content performance
  - Which pages are ranking? Which aren't?
  - Pages losing rankings (content decay alerts)
- Basic competitor tracking
  - Alert when competitor adds new docs
- Dashboard access
  - Real-time data
  - Exportable reports

---

### Pro — €79/month

*"Full visibility and team features"*

**Everything in Growth, plus:**

- Advanced competitor monitoring
  - Track up to 5 competitors
  - Side-by-side content comparison
  - Competitor new page alerts
- More keywords
  - Track up to 200 keywords
  - Deeper gap analysis
- Alerts & notifications
  - Email alerts for ranking drops
  - Weekly digest of changes
  - Slack integration (future)
- Priority support
- Multiple team members (up to 3)
- API access (future)

---

### Pricing Psychology

- **Anchor high:** "Compare to Ahrefs at €89/month or Clearscope at €189/month"
- **ROI framing:** "One page ranking for a 1,000 search/month keyword is worth more than €49"
- **One-time vs recurring:** Clear distinction — audit is a deliverable, subscription is ongoing service
- **Upsell moment:** After audit delivery, prompt "Want to track if these pages rank? → Upgrade"

### Future Considerations

- **Agency tier:** €199/month — white-label reports, multiple client sites
- **Enterprise:** Custom pricing — SSO, dedicated support, SLA
- **Usage-based:** For larger sites (500+ pages)

---

## MVP Scope

### V0 — Validation (no code)
- Landing page + waitlist
- Manual audits for 5-10 customers
- Learn what they actually want
- Charge €25-50 to validate willingness to pay

### V1 — Basic Product
- Paste docs URL
- Automated crawl
- Keyword gap analysis
- Basic content briefs
- PDF/dashboard report

### V2 — Growth Features
- Rank tracking over time
- Competitor monitoring
- CMS integrations (GitBook, Mintlify, Docusaurus)
- Team collaboration

---

## Go-to-Market

1. **Build in public** — Tweet the journey, indie devs love this
2. **Own case study** — Use on your own docs, share results
3. **Communities** — Indie Hackers, r/SaaS, dev Discords
4. **Content** — "How Stripe's docs drive millions in traffic"
5. **Outreach** — DevRel teams, API companies with weak docs

---

## Competitive Landscape

| Tool | Focus | Price | Gap |
|------|-------|-------|-----|
| Ahrefs/SEMrush | General SEO | €89-120/mo | Not docs-specific, overwhelming for most |
| Clearscope | Content optimization | €189/mo | Expensive, built for marketing blogs |
| Surfer SEO | Content optimization | €99+/mo | Generic content focus, not docs |
| GitBook/Mintlify | Doc hosting | €0-300/mo | Basic SEO hygiene only, no guidance on what to write |
| ChatGPT/Claude | AI assistance | €20/mo | No real search volume data, can't track rankings |

**Our position:** Docs-specific SEO with real data at indie-friendly prices.

### What Competitors Don't Do

- **Generic SEO tools:** Don't understand documentation context, overwhelming feature sets, expensive
- **Doc platforms:** Handle hosting and basic meta tags, but don't tell you what pages to write or if they're ranking
- **AI assistants:** Can help write content but have no access to real keyword data or ranking information

---

## Our Edge

Not a technical moat — an execution and focus play:

| Edge | Why it matters |
|------|----------------|
| **Niche focus** | "SEO for docs" is specific enough that generic tools feel clunky |
| **Price** | €49 one-time or €29/mo vs €189/mo for Clearscope |
| **Simplicity** | One job done well vs enterprise feature bloat |
| **You are the customer** | Built by an indie dev for indie devs — understand the pain |
| **Speed** | No VC-funded competitor is chasing this niche yet |

### What We Don't Have

- Proprietary data moat (we use same data sources as others)
- Network effects
- Brand recognition

**This is a "win by execution" game.** First mover in a niche can build brand and customer relationships before anyone cares enough to copy.

---

## Open Questions

- [ ] Name? (DocRank, DocsGrowth, RankDocs, DocSEO, etc.)
- [x] ~~One-time vs recurring as primary model?~~ → Both: one-time audit as entry, subscription for ongoing
- [ ] How much AI content generation vs just briefs?
- [ ] Integrate with doc platforms or stay standalone?
- [ ] Free tier / mini-audit to reduce friction?
- [ ] Landing page copy and positioning

---

## Launch Strategy

### The Cold Start Problem

Asking €50 upfront with no reputation or testimonials is hard. Build proof first.

### Phase 1: Free to Build Proof (Week 1-3)

**Goal:** Get testimonials and case studies before asking for money.

1. **Audit SendPigeon first**
   - Your own docs become case study #1
   - "I used this tool on my own product, here's what happened"
   - Document before/after

2. **5-10 free audits**
   - Reach out to indie devs on Twitter/Indie Hackers
   - "I'm building a docs SEO tool, can I audit your docs for free in exchange for feedback?"
   - Target people with existing docs sites

3. **Document everything**
   - Screenshots of findings
   - What you recommended
   - Did they implement it?
   - Track rankings over 4-8 weeks for case studies

### Phase 2: Cheap to Validate (Week 4-6)

**Goal:** Prove people will pay, learn what they value.

4. **Launch at €9-19** (not €49)
   - "Early access pricing" or "Founding member" discount
   - The goal is signal, not revenue yet

5. **Alternative: Pay what you want**
   - "Pay €0-50, whatever you think it's worth"
   - Removes friction, still validates willingness to pay

6. **Money-back guarantee**
   - "If you don't find it useful, full refund"
   - Reduces risk for buyer

### Phase 3: Raise Prices with Proof (Week 8+)

**Requirements before raising prices:**
- 3-5 testimonials
- 1-2 case studies with actual ranking improvements
- Some usage data and feedback

**Then:**
- Raise to €29
- Later to €49
- Add subscription tiers once one-time is validated

### Timeline

| Week | Action |
|------|--------|
| 1-2 | Build landing page + manual audit process |
| 2-3 | Audit SendPigeon + 3-5 free audits |
| 4-5 | Launch at €9-19 with testimonials |
| 6-8 | Gather feedback, iterate, track ranking results |
| 8+ | Raise prices, start building automation |

### No-Code MVP

All of Phase 1-2 can be done without building the product:

| Need | Solution |
|------|----------|
| Landing page | Carrd, Framer, or simple Next.js |
| Payments | Stripe checkout link |
| SEO data | DataForSEO dashboard (manual) |
| Analysis | Spreadsheet + AI assistance |
| Report delivery | Notion or Google Docs |
| Email | Your own SendPigeon 😉 |

**Only build automation once you've validated people want it.**

---

## Next Steps

1. ~~Define product and pricing~~ ✓
2. Pick a name (GrowDocs?)
3. Check domain availability
4. Design landing page
5. Set up manual audit workflow
6. Audit SendPigeon as case study #1
7. Reach out for 5 free audits
8. Launch
