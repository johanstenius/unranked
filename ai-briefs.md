# Plan: Enhanced AI Briefs System

## Goal
Make briefs genuinely actionable and differentiated - not just outlines, but specific targets, starter content, and deep competitor intelligence.

## Current State
- Briefs from Claude using SERP title/description + PAA questions
- Output: H2/H3 structure, title, meta, related keywords
- No actual competitor page content analysis
- Cost: ~$0.02/brief

---

## Phase 1: On-Page SEO Targets (Quick Win)

Add concrete targets without fetching competitor pages. Use heuristics based on keyword difficulty and intent.

### New `targets` field in BriefStructure:
```typescript
targets: {
  wordCountMin: number;      // e.g., 1800
  wordCountMax: number;      // e.g., 2200
  h2Count: number;           // e.g., 8
  h3Count: number;           // e.g., 12
  imageCount: number;        // e.g., 4
  readabilityGrade: number;  // Flesch-Kincaid grade level
  faqRecommended: boolean;   // Based on PAA count
}
```

### Heuristics:
| Intent | Word Count | Headings | Images |
|--------|-----------|----------|--------|
| Informational | 1500-2500 | 8-12 H2s | 4-6 |
| Commercial | 1200-2000 | 6-10 H2s | 6-8 |
| Transactional | 800-1500 | 4-8 H2s | 3-5 |
| Navigational | 500-1000 | 3-5 H2s | 2-3 |

Adjust by difficulty: +20% word count for KD > 50.

### Files:
- `apps/api/src/services/ai/anthropic.ts` - Update prompt + type
- `apps/web/src/app/audit/[token]/brief/[briefId]/page.tsx` - Display targets

**Effort: ~3 hours**

---

## Phase 2: Draft Generation

Write starter content users can expand - NOT full articles.

### Output:
```typescript
type BriefDraft = {
  introParagraph: string;      // 2-3 engaging sentences
  h2Openers: Array<{
    h2Title: string;
    openingSentence: string;   // Direction-setting first sentence
  }>;
  metaDescription: string;     // Already have this
}
```

### Prompt approach:
- Write hook intro that previews value
- First sentence of each H2 to set direction
- Let human expert write the substance

### Files:
- `apps/api/src/services/ai/anthropic.ts` - New `generateBriefDraft()` function
- `apps/api/src/services/brief/generator.ts` - Call after structure
- `apps/api/prisma/schema.prisma` - Add `draft Json?` field
- `apps/web/src/app/audit/[token]/brief/[briefId]/page.tsx` - Display draft

**Effort: ~5 hours | Cost: +$0.01/brief**

---

## Phase 3: Competitor Content Analysis

Fetch top 3 competitor pages and extract actionable insights.

### New service: `competitor-fetcher.ts`
```typescript
type CompetitorPageContent = {
  url: string;
  wordCount: number;
  h2s: string[];
  h3s: string[];
  introExcerpt: string;       // First 500 chars
  contentSample: string;      // 2000 chars main content
  hasSchemaOrg: boolean;
  imageCount: number;
  faqSection: string | null;
}
```

Reuse existing `fetchPage()` and cheerio parsing from crawler.

### New AI function: `analyzeCompetitorContent()`
```typescript
type CompetitorAnalysis = {
  avgWordCount: number;
  avgHeadingCount: { h2: number; h3: number };
  commonTopics: string[];           // What ALL competitors cover (baseline)
  contentGaps: string[];            // What NONE cover well (opportunity)
  recommendedDifferentiators: string[];
  structurePatterns: string;        // "All use FAQ schema", "2/3 have comparison tables"
}
```

### Key prompt sections:
1. "Topics ALL competitors cover" → Must-have baseline
2. "Topics NONE cover well" → Differentiation opportunity
3. "Structure patterns" → What to copy/improve

### Files:
- `apps/api/src/services/brief/competitor-fetcher.ts` - NEW
- `apps/api/src/services/ai/anthropic.ts` - New analysis function
- `apps/api/src/services/brief/generator.ts` - Integrate fetching
- `apps/api/prisma/schema.prisma` - Add `competitorAnalysis Json?`
- `apps/web/src/app/audit/[token]/brief/[briefId]/page.tsx` - Rich display

**Effort: ~10 hours | Cost: +$0.06/brief | Latency: +30-45s**

---

## Phase 4: Tier Controls & Caching

### Tier limits:
| Tier | Briefs | Draft | Competitor Fetch |
|------|--------|-------|------------------|
| FREE | 0 | - | - |
| SCAN | 1 | Yes | No |
| AUDIT | 5 | Yes | 3 pages |
| DEEP_DIVE | Unlimited | Yes | 5 pages |

### Caching:
- Cache competitor page content for 30 min (same URL across keywords)
- In-memory Map with TTL

### Files:
- `apps/api/src/schemas/audit.schema.ts` - Update tierLimits
- `apps/api/src/services/brief/competitor-fetcher.ts` - Add cache

**Effort: ~3 hours**

---

## Cost Summary

| Component | Tokens | Cost/Brief |
|-----------|--------|------------|
| Structure (existing) | ~2.5K | $0.02 |
| Draft generation | ~1.3K | $0.01 |
| Competitor analysis | ~7K | $0.06 |
| **AUDIT tier total** | | **~$0.09** |
| **DEEP_DIVE total** | | **~$0.09** |

---

## UI Display (Brief Detail Page)

```
┌─────────────────────────────────────────────────┐
│  "react hooks tutorial"                         │
│  Informational · 8,100/mo · KD 42               │
├─────────────────────────────────────────────────┤
│                                                 │
│  SEO TARGETS                                    │
│  ┌─────────┬─────────┬─────────┬─────────┐     │
│  │  1,800  │   8-10  │   4-6   │  Grade  │     │
│  │  words  │   H2s   │  images │   8th   │     │
│  └─────────┴─────────┴─────────┴─────────┘     │
│                                                 │
│  DRAFT CONTENT                    [Copy All]    │
│  ┌─────────────────────────────────────────┐   │
│  │ Intro: React hooks revolutionized how   │   │
│  │ we write components. In this guide...   │   │
│  ├─────────────────────────────────────────┤   │
│  │ H2: What are React Hooks?               │   │
│  │ → Hooks are functions that let you...   │   │
│  │                                         │   │
│  │ H2: useState Explained                  │   │
│  │ → The useState hook is the most...      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  COMPETITOR INSIGHTS                            │
│  ┌─────────────────────────────────────────┐   │
│  │ Avg: 2,100 words · 9 H2s · FAQ schema   │   │
│  ├─────────────────────────────────────────┤   │
│  │ ✓ MUST COVER (all competitors have):    │   │
│  │   • useState and useEffect basics       │   │
│  │   • Custom hooks example                │   │
│  │   • Rules of hooks                      │   │
│  ├─────────────────────────────────────────┤   │
│  │ ★ OPPORTUNITY (none cover well):        │   │
│  │   • Performance optimization patterns   │   │
│  │   • TypeScript with hooks               │   │
│  │   • Testing hooks                       │   │
│  ├─────────────────────────────────────────┤   │
│  │ 💡 DIFFERENTIATE:                       │   │
│  │   • Add interactive code playground     │   │
│  │   • Include comparison table            │   │
│  │   • Cover useTransition (new)           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Implementation Order

1. **Phase 1** - SEO targets (quick, no new costs)
2. **Phase 2** - Draft generation (+$0.01/brief)
3. **Phase 3** - Competitor analysis (+$0.06/brief, +30-45s)
4. **Phase 4** - Tier controls & caching

---

## Decisions Made

1. **Latency:** Sync fetch (user waits 30-45s) - acceptable for paid tiers
2. **SCAN drafts:** Yes, include drafts (only +$0.01 cost, makes tier more valuable)
3. **Blocked pages:** Skip silently, analyze what we can get

---

## Frontend Design: Brief Detail Page

### Design Direction: Editorial Data Dashboard

Premium, information-dense but highly scannable. Magazine-quality typography with data visualization. Dark theme with teal/coral semantic accents.

**Existing Design System:**
- Fonts: Cabinet Grotesk (display), Satoshi (body), JetBrains Mono (code)
- Colors: `--accent-teal: #2dd4bf`, `--status-crit: #f87171`, `--bg-subtle: #141414`
- Motion: Framer Motion with SlideUp, StaggerList patterns

### Page Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  NAV: Logo | Back to Report | Theme Toggle                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  HEADER                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Content Brief                                      │   │
│  │  "react hooks tutorial"          [Copy Template]    │   │
│  │  informational · 8,100/mo · KD 42 · Est. 2-3 hrs   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  SEO TARGETS (4-column grid)                               │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │  1,800   │   8-10   │   4-6    │  Grade   │            │
│  │  ═══════ │  ══════  │  ═════   │   8th    │            │
│  │  words   │   H2s    │  images  │  reading │            │
│  │  target  │  target  │  target  │  level   │            │
│  └──────────┴──────────┴──────────┴──────────┘            │
│                                                             │
│  TWO-COLUMN LAYOUT                                         │
│  ┌─────────────────────┬───────────────────────┐          │
│  │  LEFT (60%)         │  RIGHT (40%)          │          │
│  │                     │                       │          │
│  │  DRAFT CONTENT      │  COMPETITOR INSIGHTS  │          │
│  │  ┌───────────────┐  │  ┌─────────────────┐ │          │
│  │  │ Intro         │  │  │ Avg: 2,100 words│ │          │
│  │  │ React hooks...│  │  │ 9 H2s · FAQ ✓   │ │          │
│  │  └───────────────┘  │  └─────────────────┘ │          │
│  │                     │                       │          │
│  │  H2 Openers         │  ✓ MUST COVER        │          │
│  │  ┌───────────────┐  │  • useState basics   │          │
│  │  │ ► What are... │  │  • useEffect         │          │
│  │  │ ► useState... │  │  • Rules of hooks    │          │
│  │  └───────────────┘  │                       │          │
│  │                     │  ★ OPPORTUNITY        │          │
│  │  STRUCTURE          │  • TypeScript hooks  │          │
│  │  H1: Title          │  • Testing patterns  │          │
│  │    H2: What are...  │                       │          │
│  │      H3: History    │  💡 DIFFERENTIATE    │          │
│  │    H2: useState...  │  • Add playground    │          │
│  │                     │  • Comparison table  │          │
│  └─────────────────────┴───────────────────────┘          │
│                                                             │
│  QUESTIONS TO ANSWER (horizontal pills)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ? What are React hooks?  ? How do I use useState?   │   │
│  │ ? When should I use useEffect?  ? ...more           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  RELATED KEYWORDS (tag cloud)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ react hooks  useState  useEffect  custom hooks ...  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  INTERNAL LINKS                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Link from: /docs/intro → "react hooks" anchor       │   │
│  │ Link from: /blog/state → "useState guide" anchor    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  FOOTER CTA                                                │
│  [← Back to Report]              [Copy Brief to Clipboard] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Designs

#### 1. SEO Targets - Visual Gauges

```tsx
function TargetGauge({ label, value, unit, color }: {
  label: string;
  value: string;
  unit: string;
  color?: 'teal' | 'default';
}) {
  return (
    <div className="bg-subtle border border-border rounded-lg p-4 text-center">
      <div className={`text-2xl font-display font-bold ${
        color === 'teal' ? 'text-accent-teal' : 'text-text-primary'
      }`}>
        {value}
      </div>
      <div className="h-1 w-12 mx-auto my-2 rounded bg-border overflow-hidden">
        <div className={`h-full ${
          color === 'teal' ? 'bg-accent-teal' : 'bg-text-tertiary'
        }`} style={{ width: '60%' }} />
      </div>
      <div className="text-xs text-text-tertiary uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
```

#### 2. Draft Content - Expandable Editor Style

```tsx
function DraftSection({ draft }: { draft: BriefDraft }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-subtle flex items-center justify-between"
      >
        <span className="font-display font-semibold text-text-primary">
          Draft Content
        </span>
        <span className="text-text-tertiary text-sm">
          {expanded ? '−' : '+'}
        </span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Intro */}
          <div className="border-l-2 border-accent-teal pl-4">
            <div className="text-xs text-accent-teal uppercase tracking-wide mb-1">
              Introduction
            </div>
            <p className="text-text-primary leading-relaxed">
              {draft.introParagraph}
            </p>
          </div>

          {/* H2 Openers */}
          <div className="space-y-3">
            <div className="text-xs text-text-tertiary uppercase tracking-wide">
              Section Openers
            </div>
            {draft.h2Openers.map((opener) => (
              <div key={opener.h2Title} className="group">
                <div className="font-mono text-sm text-text-secondary">
                  H2: {opener.h2Title}
                </div>
                <div className="text-text-primary text-sm pl-4 border-l border-border">
                  → {opener.openingSentence}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3. Competitor Insights - Rich Card

```tsx
function CompetitorInsights({ analysis }: { analysis: CompetitorAnalysis }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden sticky top-20">
      {/* Header with metrics */}
      <div className="px-4 py-3 bg-subtle border-b border-border">
        <div className="text-xs text-text-tertiary uppercase tracking-wide mb-2">
          Top 3 Competitors Average
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-text-primary font-semibold">
            {analysis.avgWordCount.toLocaleString()} words
          </span>
          <span className="text-text-secondary">
            {analysis.avgHeadingCount.h2} H2s
          </span>
          <span className="text-accent-teal">
            FAQ ✓
          </span>
        </div>
      </div>

      {/* Must Cover */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-status-good">✓</span>
          <span className="text-xs text-text-tertiary uppercase tracking-wide">
            Must Cover
          </span>
        </div>
        <ul className="space-y-1">
          {analysis.commonTopics.map((topic) => (
            <li key={topic} className="text-sm text-text-primary">
              • {topic}
            </li>
          ))}
        </ul>
      </div>

      {/* Opportunity */}
      <div className="p-4 border-b border-border bg-status-good-bg/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-status-good">★</span>
          <span className="text-xs text-status-good uppercase tracking-wide">
            Opportunity
          </span>
        </div>
        <ul className="space-y-1">
          {analysis.contentGaps.map((gap) => (
            <li key={gap} className="text-sm text-text-primary">
              • {gap}
            </li>
          ))}
        </ul>
      </div>

      {/* Differentiate */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-accent-teal">💡</span>
          <span className="text-xs text-accent-teal uppercase tracking-wide">
            Differentiate
          </span>
        </div>
        <ul className="space-y-1">
          {analysis.recommendedDifferentiators.map((diff) => (
            <li key={diff} className="text-sm text-text-primary">
              • {diff}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### Visual Accents

**Color coding:**
- `text-accent-teal` - Opportunities, positive actions, targets
- `text-status-good` - Must-haves, checkmarks
- `text-status-warn` - Medium difficulty
- `text-status-crit` - High difficulty, issues

**Motion:**
- Staggered entrance for sections (SlideUp with delays)
- Expand/collapse with height animation
- Copy button feedback (scale + color change)

**Typography emphasis:**
- `font-display` (Cabinet Grotesk) for headings
- `font-mono` (JetBrains Mono) for structure/code
- Uppercase tracking for labels

### File Changes

**Modified:** `apps/web/src/app/audit/[token]/brief/[briefId]/page.tsx`
- Add SEO targets grid component
- Add draft content expandable section
- Add competitor insights sidebar
- Restructure to two-column layout
- Add new types for enhanced brief data

**Types update:** `apps/web/src/lib/types.ts`
- Add `BriefTargets` type
- Add `BriefDraft` type
- Add `CompetitorAnalysis` type
- Extend `Brief` type with optional new fields
