# Technical SEO Checks Roadmap

## Current: ~48 checks | Target: ~100 checks

Based on industry standards from Screaming Frog (300+), Semrush (170+), Ahrefs (170+).

---

## ✅ PHASE 1 COMPLETE (+12 checks)

- Title: too short (<30), empty
- Meta: duplicate descriptions
- H1: empty, too long (>70), duplicates across pages
- Links: too many (>100)
- URLs: too long (>200), underscores, uppercase, too many params (>2)

---

## PHASE 2: Crawl Data Enhancements (+13 checks)

*Need to collect additional data during crawl*

### External Links
| Check | Severity | Notes |
|-------|----------|-------|
| External broken links (4xx) | MEDIUM | HEAD requests, 43.40% freq |
| External links to redirects | LOW | |
| Broken images (4xx) | HIGH | 18.07% frequency |

### HTML Structure
| Check | Severity | Notes |
|-------|----------|-------|
| Missing lang attribute | MEDIUM | |
| Missing doctype | LOW | |
| Missing charset | LOW | |
| Deprecated HTML tags | LOW | font, center, marquee |

### Social/OG Tags
| Check | Severity | Notes |
|-------|----------|-------|
| Missing og:title | LOW | |
| Missing og:description | LOW | |
| Missing og:image | LOW | |
| Missing Twitter card | LOW | |

### Images Extended
| Check | Severity | Notes |
|-------|----------|-------|
| Large images (>200KB) | MEDIUM | Check Content-Length |
| Images with redirects | LOW | 10.80% frequency |

---

## PHASE 3: Sitemap & Robots Analysis (+8 checks)

*Parse and validate sitemap.xml and robots.txt*

### Sitemap Issues
| Check | Severity | Notes |
|-------|----------|-------|
| Noindex pages in sitemap | MEDIUM | 11.22% frequency |
| Non-canonical URLs in sitemap | MEDIUM | 11.11% frequency |
| 4xx pages in sitemap | HIGH | 5.71% frequency |
| Redirect pages in sitemap | MEDIUM | 17.68% frequency |
| Sitemap format/syntax errors | MEDIUM | |

### Robots.txt Issues
| Check | Severity | Notes |
|-------|----------|-------|
| Important pages blocked | MEDIUM | |
| Robots.txt syntax errors | LOW | |
| Missing sitemap directive | LOW | 23.17% frequency |

---

## PHASE 4: Schema Validation (+6 checks)

*JSON-LD syntax + type validation (like Google Rich Results Test)*

| Check | Severity | Notes |
|-------|----------|-------|
| Invalid JSON-LD syntax | HIGH | Parse errors |
| Missing required properties | MEDIUM | Per schema type |
| Invalid property values | MEDIUM | Wrong types |
| Unknown schema type | LOW | |
| Deprecated schema properties | LOW | |
| Schema/content mismatch | LOW | Markup doesn't match page |

### Required Properties by Type
- Article: headline, author, datePublished
- Product: name, offers (with price)
- Organization: name, url
- BreadcrumbList: itemListElement
- FAQ: mainEntity with Question/Answer

---

## PHASE 5: Security & Performance (+9 checks)

*Headers and resource analysis*

### Security
| Check | Severity | Notes |
|-------|----------|-------|
| Mixed content (HTTP on HTTPS) | HIGH | |
| Insecure forms | HIGH | HTTP form action |
| Missing HSTS header | LOW | |
| HTTP pages with passwords | HIGH | |

### Performance
| Check | Severity | Notes |
|-------|----------|-------|
| Uncompressed resources | MEDIUM | No gzip/brotli |
| Too many JS files (>15) | LOW | |
| Too many CSS files (>10) | LOW | |
| Large total page size (>3MB) | MEDIUM | |
| Slow TTFB (>600ms) | MEDIUM | |

---

## PHASE 6: Accessibility & Advanced (+12 checks)

### Accessibility Basics
| Check | Severity | Notes |
|-------|----------|-------|
| Missing form labels | LOW | |
| Empty buttons | LOW | |
| Empty links | LOW | |
| Missing skip link | LOW | |
| Tab index issues | LOW | |

### Redirects Extended
| Check | Severity | Notes |
|-------|----------|-------|
| Redirect loops | HIGH | |
| Temporary redirects (302/307) | LOW | Should be 301 |
| Redirect to 4xx | HIGH | 8.23% frequency |

### Internationalization
| Check | Severity | Notes |
|-------|----------|-------|
| Hreflang missing return links | MEDIUM | |
| Hreflang to non-canonical | MEDIUM | |
| Lang/hreflang mismatch | LOW | |

---

## SUMMARY

| Phase | Focus | +Checks | Total |
|-------|-------|---------|-------|
| ✅ 1 | Quick wins | +12 | 48 |
| 2 | Crawl enhancements | +13 | 61 |
| 3 | Sitemap/Robots | +8 | 69 |
| 4 | Schema validation | +6 | 75 |
| 5 | Security/Performance | +9 | 84 |
| 6 | Accessibility/Advanced | +12 | 96 |

---

## THRESHOLDS REFERENCE

| Check | Threshold | Source |
|-------|-----------|--------|
| Title length | 30-70 chars | Moz, Semrush |
| Meta description | 155-170 chars | Moz, Google |
| H1 length | 70 chars max | Semrush |
| URL length | 200 chars | Semrush |
| Links per page | 100 max | Screaming Frog |
| Image size | 200KB | PageSpeed |
| Text-to-HTML ratio | 10% min | Semrush |
| LCP | ≤2.5s | Google CWV |
| INP | ≤200ms | Google CWV |
| CLS | ≤0.1 | Google CWV |
| TTFB | ≤600ms | web.dev |
| Page size | 3MB | Lighthouse |

---

## SOURCES

- Screaming Frog: https://www.screamingfrog.co.uk/seo-spider/issues/
- Semrush: https://www.semrush.com/kb/542-site-audit-issues-list
- Ahrefs: https://ahrefs.com/blog/site-audit-study/
- SE Ranking: https://seranking.com/blog/seo-issues/
- Google CWV: https://web.dev/articles/vitals
