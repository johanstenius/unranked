# API Cost Analysis

## Pricing Sources

### DataForSEO
| API Endpoint | Cost |
|--------------|------|
| `ranked_keywords/live` | $0.01/req + $0.0001/result |
| `search_volume/live` | $0.075/req (batch) |
| `keywords_for_keywords/live` | $0.05/req |
| `competitors_domain/live` | $0.01/req + $0.0001/result |
| `serp/organic/live` | $0.002/req |

### Claude (Anthropic)
| Model | Input | Output |
|-------|-------|--------|
| Haiku 4.5 (fast) | $1/M tokens | $5/M tokens |
| Sonnet 4.5 (quality) | $3/M tokens | $15/M tokens |

---

## Cost by Tier

### FREE ($0)
No API calls - technical audit only.

### SCAN ($9)
| Item | Calls | Cost |
|------|-------|------|
| getDomainRankedKeywords | 1 | $0.02 |
| getKeywordData | 1 (50 kw batch) | $0.075 |
| getRelatedKeywords | 3 seeds | $0.15 |
| getSerpWithFeatures | ~20 | $0.04 |
| classifyIntents (Haiku) | 1 | $0.002 |
| clusterSemantic (Haiku) | 1 | $0.003 |
| quickWinSuggestions (Sonnet) | 5 | $0.05 |
| generateBrief (Sonnet) | 1 | $0.012 |
| **Total** | | **~$0.35** |

### AUDIT ($29)
| Item | Calls | Cost |
|------|-------|------|
| getDomainRankedKeywords | 1 + 1 comp | $0.04 |
| getKeywordData | 1 | $0.075 |
| discoverCompetitors | 1 | $0.01 |
| getRelatedKeywords | 5 seeds | $0.25 |
| getSerpWithFeatures | ~20 | $0.04 |
| Claude (analysis) | — | $0.055 |
| generateBrief (Sonnet) | 5 | $0.06 |
| **Total** | | **~$0.53** |

### DEEP_DIVE ($79)
| Item | Calls | Cost |
|------|-------|------|
| getDomainRankedKeywords | 1 + 3 comp | $0.08 |
| getKeywordData | 1 | $0.075 |
| discoverCompetitors | 1 | $0.01 |
| getRelatedKeywords | 10 seeds | $0.50 |
| getSerpWithFeatures | ~20 | $0.04 |
| Claude (analysis) | — | $0.055 |
| generateBrief (Sonnet) | ~10 avg | $0.12 |
| **Total** | | **~$0.88** |

---

## Summary

| Tier | Price | API Cost | Margin |
|------|-------|----------|--------|
| FREE | $0 | $0 | — |
| SCAN | $9 | ~$0.35 | 96% |
| AUDIT | $29 | ~$0.53 | 98% |
| DEEP_DIVE | $79 | ~$0.88 | 99% |

---

## Variable Factors

Costs vary based on site/competition:

| Factor | Impact | Worst Case |
|--------|--------|------------|
| Domain rankings returned | $0.0001/result | 100 results = +$0.01 |
| Competitor keywords | $0.0001/result per competitor | 3 × 200 = +$0.06 |
| Top-10 rankings (snippet checks) | $0.002/SERP call | 15 max = +$0.03 |
| Briefs generated (DEEP_DIVE) | ~$0.014/brief | 50 briefs = +$0.70 |

### Realistic Ranges

| Tier | Best Case | Typical | Worst Case |
|------|-----------|---------|------------|
| SCAN | $0.25 | $0.35 | $0.45 |
| AUDIT | $0.40 | $0.53 | $0.70 |
| DEEP_DIVE | $0.70 | $0.88 | $1.50+ |

---

## Main Cost Drivers

1. **Seed expansion** - $0.05/seed (biggest variable)
2. **Brief generation** - ~$0.014/brief (DEEP_DIVE risk)
3. **Competitor analysis** - $0.02/competitor

Even worst-case DEEP_DIVE at ~$1.50 against $79 = 98% margin.

---

## Potential Guardrails

- Cap DEEP_DIVE briefs at 20-30 (still feels "unlimited")
- Cache competitor data across audits
- Rate limit brief generation
