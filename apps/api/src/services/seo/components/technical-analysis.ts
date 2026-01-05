/**
 * Local Components - No external API dependencies
 *
 * These always succeed and run during the primary crawl job.
 */

import type { CrawledPage } from "../../crawler/types.js";
import type { TechnicalIssue } from "../analysis.js";
import { detectDuplicateContent } from "../duplicate-detection.js";
import { analyzeInternalLinking } from "../internal-linking.js";
import type {
	ComponentContext,
	ComponentEntry,
	ComponentResult,
	ComponentResults,
} from "./types.js";

const SEVERITY = {
	HIGH: "high",
	MEDIUM: "medium",
	LOW: "low",
} as const;
type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

const THRESHOLDS = {
	readability: { technical: 12, general: 8 },
	title: { warning: 60, error: 70, min: 30 },
	metaDesc: { warning: 155, error: 170 },
	h1: { max: 70 },
	wordCount: { critical: 100, thin: 300, short: 500 },
	links: { max: 100 },
	url: { warning: 200, maxParams: 2 },
} as const;

const TECHNICAL_SECTIONS = new Set([
	"/docs",
	"/api",
	"/reference",
	"/sdk",
	"/developers",
	"/documentation",
]);

function getReadabilityThreshold(page: CrawledPage): number {
	const isTechnicalSection = TECHNICAL_SECTIONS.has(page.section);
	const hasCode = page.codeBlockCount > 0;
	if (isTechnicalSection || hasCode) return THRESHOLDS.readability.technical;
	return THRESHOLDS.readability.general;
}

function hasDifferentCanonical(page: CrawledPage): boolean {
	if (!page.canonicalUrl) return false;
	try {
		const pageUrl = new URL(page.url);
		const canonicalUrl = new URL(page.canonicalUrl);
		return pageUrl.href !== canonicalUrl.href;
	} catch {
		return false;
	}
}

function countOccurrences(values: string[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const v of values) {
		counts.set(v, (counts.get(v) || 0) + 1);
	}
	return counts;
}

function normalize(s: string): string {
	return s.toLowerCase().trim();
}

function isDuplicate(counts: Map<string, number>, value: string): boolean {
	return (counts.get(normalize(value)) || 0) > 1;
}

function findPageTechnicalIssues(pages: CrawledPage[]): TechnicalIssue[] {
	const issues: TechnicalIssue[] = [];

	// Collect values for duplicate detection (only from indexable pages)
	const indexablePages = pages.filter((p) => !hasDifferentCanonical(p));
	const titleCounts = countOccurrences(
		indexablePages.flatMap((p) => (p.title ? [normalize(p.title)] : [])),
	);
	const metaDescCounts = countOccurrences(
		indexablePages.flatMap((p) =>
			p.metaDescription ? [normalize(p.metaDescription)] : [],
		),
	);
	const h1Counts = countOccurrences(
		indexablePages.flatMap((p) => (p.h1 ? [normalize(p.h1)] : [])),
	);

	for (const page of pages) {
		// Title checks
		if (!page.title) {
			issues.push({
				url: page.url,
				issue: "Missing title tag",
				severity: SEVERITY.HIGH,
			});
		} else if (page.title.trim() === "") {
			// Empty title (exists but empty string)
			issues.push({
				url: page.url,
				issue: "Empty title tag",
				severity: SEVERITY.HIGH,
			});
		} else if (!hasDifferentCanonical(page)) {
			if (page.title.length > THRESHOLDS.title.error) {
				issues.push({
					url: page.url,
					issue: `Title too long (over ${THRESHOLDS.title.error} characters)`,
					severity: SEVERITY.MEDIUM,
				});
			} else if (page.title.length > THRESHOLDS.title.warning) {
				issues.push({
					url: page.url,
					issue: `Title may be truncated (${THRESHOLDS.title.warning}-${THRESHOLDS.title.error} characters)`,
					severity: SEVERITY.LOW,
				});
			} else if (page.title.length < THRESHOLDS.title.min) {
				// Title too short
				issues.push({
					url: page.url,
					issue: `Title too short (under ${THRESHOLDS.title.min} characters)`,
					severity: SEVERITY.MEDIUM,
				});
			}
			if (isDuplicate(titleCounts, page.title)) {
				issues.push({
					url: page.url,
					issue: "Duplicate title tag",
					severity: SEVERITY.MEDIUM,
				});
			}
		}

		// Meta description checks
		if (!hasDifferentCanonical(page)) {
			if (!page.metaDescription) {
				issues.push({
					url: page.url,
					issue: "Missing meta description",
					severity: SEVERITY.MEDIUM,
				});
			} else if (page.metaDescription.length > THRESHOLDS.metaDesc.error) {
				issues.push({
					url: page.url,
					issue: `Meta description too long (over ${THRESHOLDS.metaDesc.error} characters)`,
					severity: SEVERITY.LOW,
				});
			} else if (page.metaDescription.length > THRESHOLDS.metaDesc.warning) {
				issues.push({
					url: page.url,
					issue: `Meta description may be truncated (${THRESHOLDS.metaDesc.warning}-${THRESHOLDS.metaDesc.error} characters)`,
					severity: SEVERITY.LOW,
				});
			}
			// Duplicate meta description check
			if (
				page.metaDescription &&
				isDuplicate(metaDescCounts, page.metaDescription)
			) {
				issues.push({
					url: page.url,
					issue: "Duplicate meta description",
					severity: SEVERITY.MEDIUM,
				});
			}
		}

		// H1 checks
		if (!page.h1) {
			issues.push({
				url: page.url,
				issue: "Missing H1 heading",
				severity: SEVERITY.MEDIUM,
			});
		} else if (page.h1.trim() === "") {
			// Empty H1 (exists but empty string)
			issues.push({
				url: page.url,
				issue: "Empty H1 heading",
				severity: SEVERITY.MEDIUM,
			});
		} else if (!hasDifferentCanonical(page)) {
			// H1 length check
			if (page.h1.length > THRESHOLDS.h1.max) {
				issues.push({
					url: page.url,
					issue: `H1 too long (over ${THRESHOLDS.h1.max} characters)`,
					severity: SEVERITY.LOW,
				});
			}
			// Duplicate H1 check
			if (isDuplicate(h1Counts, page.h1)) {
				issues.push({
					url: page.url,
					issue: "Duplicate H1 heading across pages",
					severity: SEVERITY.MEDIUM,
				});
			}
			// No H2s check (only if H1 exists)
			if (page.h2s && page.h2s.length === 0) {
				issues.push({
					url: page.url,
					issue: "No H2 headings (poor structure)",
					severity: SEVERITY.LOW,
				});
			}
		}

		// Thin content
		if (page.wordCount < THRESHOLDS.wordCount.critical) {
			issues.push({
				url: page.url,
				issue: `Very thin content (less than ${THRESHOLDS.wordCount.critical} words)`,
				severity: SEVERITY.HIGH,
			});
		} else if (page.wordCount < THRESHOLDS.wordCount.thin) {
			issues.push({
				url: page.url,
				issue: `Thin content (under ${THRESHOLDS.wordCount.thin} words)`,
				severity: SEVERITY.MEDIUM,
			});
		} else if (page.wordCount < THRESHOLDS.wordCount.short) {
			issues.push({
				url: page.url,
				issue: `Short content (under ${THRESHOLDS.wordCount.short} words)`,
				severity: SEVERITY.LOW,
			});
		}

		// Image accessibility
		if (page.imagesWithoutAlt && page.imagesWithoutAlt > 0) {
			issues.push({
				url: page.url,
				issue: `${page.imagesWithoutAlt} image(s) missing alt text`,
				severity: SEVERITY.MEDIUM,
			});
		}

		// No images for longer content
		if (page.imageCount === 0 && page.wordCount > THRESHOLDS.wordCount.thin) {
			issues.push({
				url: page.url,
				issue: "No images or diagrams",
				severity: SEVERITY.LOW,
			});
		}

		// Missing canonical
		if (!page.canonicalUrl) {
			issues.push({
				url: page.url,
				issue: "Missing canonical URL",
				severity: SEVERITY.MEDIUM,
			});
		}

		// Missing Schema.org
		if (!page.hasSchemaOrg) {
			issues.push({
				url: page.url,
				issue: "No structured data (Schema.org/JSON-LD)",
				severity: SEVERITY.LOW,
			});
		}

		// Missing viewport
		if (!page.hasViewport) {
			issues.push({
				url: page.url,
				issue: "Missing viewport meta tag (mobile-friendliness)",
				severity: SEVERITY.MEDIUM,
			});
		}

		// Readability check
		const readabilityThreshold = getReadabilityThreshold(page);
		if (page.readabilityScore && page.readabilityScore > readabilityThreshold) {
			const target =
				readabilityThreshold === THRESHOLDS.readability.technical
					? "10-12"
					: "6-8";
			issues.push({
				url: page.url,
				issue: `Content too complex (grade ${page.readabilityScore.toFixed(1)}, aim for ${target})`,
				severity: SEVERITY.LOW,
			});
		}

		// Multiple H1 tags
		if (page.h1Count && page.h1Count > 1) {
			issues.push({
				url: page.url,
				issue: `Multiple H1 tags (${page.h1Count} found, should be 1)`,
				severity: SEVERITY.LOW,
			});
		}

		// Skipped heading levels
		const hasH1 = !!page.h1;
		const hasH2 = page.h2s && page.h2s.length > 0;
		const hasH3 = page.h3s && page.h3s.length > 0;
		if (hasH1 && hasH3 && !hasH2) {
			issues.push({
				url: page.url,
				issue: "Skipped heading level (H1 → H3, missing H2)",
				severity: SEVERITY.LOW,
			});
		}

		// Too many links on page
		if (page.outboundLinks.length > THRESHOLDS.links.max) {
			issues.push({
				url: page.url,
				issue: `Too many links on page (${page.outboundLinks.length}, recommended max ${THRESHOLDS.links.max})`,
				severity: SEVERITY.LOW,
			});
		}

		// URL checks
		try {
			const urlObj = new URL(page.url);
			const pathname = urlObj.pathname;

			// URL too long
			if (page.url.length > THRESHOLDS.url.warning) {
				issues.push({
					url: page.url,
					issue: `URL too long (${page.url.length} characters, recommended max ${THRESHOLDS.url.warning})`,
					severity: SEVERITY.LOW,
				});
			}

			// URL with underscores (should use hyphens)
			if (pathname.includes("_")) {
				issues.push({
					url: page.url,
					issue: "URL contains underscores (use hyphens instead)",
					severity: SEVERITY.LOW,
				});
			}

			// URL with uppercase letters
			if (pathname !== pathname.toLowerCase()) {
				issues.push({
					url: page.url,
					issue: "URL contains uppercase letters (use lowercase)",
					severity: SEVERITY.LOW,
				});
			}

			// Too many URL parameters
			const paramCount = urlObj.searchParams.size;
			if (paramCount > THRESHOLDS.url.maxParams) {
				issues.push({
					url: page.url,
					issue: `Too many URL parameters (${paramCount}, recommended max ${THRESHOLDS.url.maxParams})`,
					severity: SEVERITY.LOW,
				});
			}
		} catch {
			// Invalid URL, skip URL checks
		}

		// BreadcrumbList schema
		if (page.hasSchemaOrg && page.schemaTypes && page.schemaTypes.length > 0) {
			const types = page.schemaTypes.map((t) => t.toLowerCase());
			const hasBreadcrumb = types.some((t) => t.includes("breadcrumb"));
			const isDeepPage = page.url.split("/").length > 4;
			if (isDeepPage && !hasBreadcrumb) {
				issues.push({
					url: page.url,
					issue: "Missing BreadcrumbList schema (recommended for deep pages)",
					severity: SEVERITY.LOW,
				});
			}
		}
	}

	return issues;
}

// ============================================================================
// Technical Issues Component
// ============================================================================

async function runTechnicalIssues(
	ctx: ComponentContext,
	_results: ComponentResults,
): Promise<ComponentResult<TechnicalIssue[]>> {
	const issues = findPageTechnicalIssues(ctx.pages);

	// Site-level checks
	const siteUrl = ctx.pages[0]?.url;
	if (siteUrl) {
		if (!ctx.crawlMetadata.hasRobotsTxt) {
			issues.push({
				url: siteUrl,
				issue: "Missing robots.txt file",
				severity: SEVERITY.LOW,
			});
		}
		if (!ctx.crawlMetadata.hasSitemap) {
			issues.push({
				url: siteUrl,
				issue: "Missing XML sitemap",
				severity: SEVERITY.MEDIUM,
			});
		}
	}

	// Redirect chain issues
	for (const chain of ctx.crawlMetadata.redirectChains) {
		issues.push({
			url: chain.originalUrl,
			issue: `Redirect chain with ${chain.hops} hops (${chain.chain.join(" → ")})`,
			severity: chain.hops >= 3 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
		});
	}

	// Broken links from crawler (already verified with HTTP HEAD) - group by target
	const brokenByTarget = new Map<
		string,
		{ sourceUrl: string; statusCode?: number; count: number }
	>();
	for (const bl of ctx.crawlMetadata.brokenLinks) {
		const existing = brokenByTarget.get(bl.targetUrl);
		if (existing) {
			existing.count++;
		} else {
			brokenByTarget.set(bl.targetUrl, {
				sourceUrl: bl.sourceUrl,
				statusCode: bl.statusCode,
				count: 1,
			});
		}
	}
	for (const [targetUrl, { sourceUrl, statusCode, count }] of brokenByTarget) {
		const statusText = statusCode ? ` (${statusCode})` : "";
		const countText = count > 1 ? ` (linked from ${count} pages)` : "";
		issues.push({
			url: sourceUrl,
			issue: `Broken link${statusText}: ${targetUrl}${countText}`,
			severity:
				statusCode && statusCode >= 500 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
		});
	}

	return { ok: true, data: issues };
}

export const technicalIssuesComponent: ComponentEntry<TechnicalIssue[]> = {
	key: "technicalIssues",
	dependencies: [],
	run: runTechnicalIssues,
	store: (results, data) => ({ ...results, technicalIssues: data }),
};

// ============================================================================
// Internal Linking Component
// ============================================================================

async function runInternalLinking(
	ctx: ComponentContext,
	_results: ComponentResults,
): Promise<
	ComponentResult<{
		issues: ReturnType<typeof analyzeInternalLinking>;
		technicalIssues: TechnicalIssue[];
	}>
> {
	const linkingIssues = analyzeInternalLinking(ctx.pages);

	// Convert to technical issues for unified display
	const technicalIssues: TechnicalIssue[] = [];

	for (const orphanUrl of linkingIssues.orphanPages) {
		technicalIssues.push({
			url: orphanUrl,
			issue: "Orphan page (no internal links pointing to it)",
			severity: SEVERITY.MEDIUM,
		});
	}

	for (const underlinked of linkingIssues.underlinkedPages) {
		technicalIssues.push({
			url: underlinked.url,
			issue: `Underlinked page (only ${underlinked.incomingLinks} internal link${underlinked.incomingLinks === 1 ? "" : "s"})`,
			severity: SEVERITY.LOW,
		});
	}

	return { ok: true, data: { issues: linkingIssues, technicalIssues } };
}

export const internalLinkingComponent: ComponentEntry<{
	issues: ReturnType<typeof analyzeInternalLinking>;
	technicalIssues: TechnicalIssue[];
}> = {
	key: "internalLinking",
	dependencies: [],
	run: runInternalLinking,
	store: (results, data) => ({
		...results,
		internalLinkingIssues: data.issues,
		technicalIssues: [
			...(results.technicalIssues ?? []),
			...data.technicalIssues,
		],
	}),
};

// ============================================================================
// Duplicate Content Component
// ============================================================================

type DuplicateGroup = { urls: string[]; type: "exact" | "near" };

async function runDuplicateContent(
	ctx: ComponentContext,
	_results: ComponentResults,
): Promise<
	ComponentResult<{
		groups: DuplicateGroup[];
		technicalIssues: TechnicalIssue[];
	}>
> {
	const duplicateGroups = detectDuplicateContent(ctx.pages);

	const technicalIssues: TechnicalIssue[] = [];
	for (const group of duplicateGroups) {
		const primaryUrl = group.urls[0] ?? "";
		const otherUrls = group.urls.slice(1);
		const typeLabel = group.type === "exact" ? "Exact" : "Near";
		technicalIssues.push({
			url: primaryUrl,
			issue: `${typeLabel} duplicate content with ${otherUrls.length} other page(s): ${otherUrls.slice(0, 2).join(", ")}${otherUrls.length > 2 ? "..." : ""}`,
			severity: group.type === "exact" ? SEVERITY.HIGH : SEVERITY.MEDIUM,
		});
	}

	return { ok: true, data: { groups: duplicateGroups, technicalIssues } };
}

export const duplicateContentComponent: ComponentEntry<{
	groups: DuplicateGroup[];
	technicalIssues: TechnicalIssue[];
}> = {
	key: "duplicateContent",
	dependencies: [],
	run: runDuplicateContent,
	store: (results, data) => ({
		...results,
		duplicateGroups: data.groups,
		technicalIssues: [
			...(results.technicalIssues ?? []),
			...data.technicalIssues,
		],
	}),
};
