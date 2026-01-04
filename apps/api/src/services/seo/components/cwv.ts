/**
 * Core Web Vitals Component
 *
 * Fetches performance metrics from PageSpeed Insights API.
 * Runs concurrent requests with rate limiting and retry logic.
 */

import { env } from "../../../config/env.js";
import type { CrawledPage } from "../../crawler/types.js";
import type {
	CWVPageResult,
	ComponentContext,
	ComponentEntry,
	ComponentResult,
	ComponentResults,
	CoreWebVitalsData,
	TierConfig,
} from "./types.js";

// Tier-based page limits for CWV analysis
const CWV_PAGE_LIMITS: Record<TierConfig["tier"], number> = {
	FREE: 1,
	SCAN: 10,
	AUDIT: 30,
	DEEP_DIVE: 100,
};

const CONCURRENCY = 15;
const MAX_RETRIES = 3;

type PageSpeedResponse = {
	lighthouseResult?: {
		categories?: {
			performance?: {
				score?: number;
			};
		};
		audits?: {
			"largest-contentful-paint"?: { numericValue?: number };
			"cumulative-layout-shift"?: { numericValue?: number };
			"interaction-to-next-paint"?: { numericValue?: number };
		};
	};
	error?: { message?: string };
};

function buildPageSpeedUrl(pageUrl: string): string {
	const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
	const params = new URLSearchParams({
		url: pageUrl,
		category: "performance",
		strategy: "mobile",
	});
	if (env.PAGESPEED_API_KEY) {
		params.set("key", env.PAGESPEED_API_KEY);
	}
	return `${base}?${params}`;
}

function parsePageSpeedResponse(
	url: string,
	response: PageSpeedResponse,
): CWVPageResult {
	if (response.error) {
		return {
			url,
			lcp: null,
			cls: null,
			inp: null,
			performance: null,
			status: "failed",
			error: response.error.message ?? "Unknown error",
		};
	}

	const lighthouse = response.lighthouseResult;
	const audits = lighthouse?.audits;
	const performanceScore = lighthouse?.categories?.performance?.score;

	return {
		url,
		lcp: audits?.["largest-contentful-paint"]?.numericValue ?? null,
		cls: audits?.["cumulative-layout-shift"]?.numericValue ?? null,
		inp: audits?.["interaction-to-next-paint"]?.numericValue ?? null,
		performance: performanceScore != null ? performanceScore * 100 : null,
		status: "success",
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string): Promise<CWVPageResult> {
	const apiUrl = buildPageSpeedUrl(url);

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const response = await fetch(apiUrl);

			if (response.status === 429) {
				const retryAfter = response.headers.get("Retry-After");
				const waitMs = retryAfter
					? Number.parseInt(retryAfter, 10) * 1000
					: 1000 * 2 ** attempt;
				await sleep(waitMs);
				continue;
			}

			if (!response.ok) {
				return {
					url,
					lcp: null,
					cls: null,
					inp: null,
					performance: null,
					status: "failed",
					error: `HTTP ${response.status}`,
				};
			}

			const data = (await response.json()) as PageSpeedResponse;
			return parsePageSpeedResponse(url, data);
		} catch (e) {
			if (attempt === MAX_RETRIES - 1) {
				return {
					url,
					lcp: null,
					cls: null,
					inp: null,
					performance: null,
					status: "failed",
					error: e instanceof Error ? e.message : "Network error",
				};
			}
			await sleep(1000 * 2 ** attempt);
		}
	}

	return {
		url,
		lcp: null,
		cls: null,
		inp: null,
		performance: null,
		status: "failed",
		error: "Max retries exceeded",
	};
}

/**
 * Stream CWV results with concurrency control.
 * Calls onResult for each completed page (for SSE streaming).
 */
export async function streamCWV(
	urls: string[],
	concurrency: number,
	onResult: (result: CWVPageResult) => void | Promise<void>,
): Promise<CWVPageResult[]> {
	const results: CWVPageResult[] = [];
	const executing = new Set<Promise<void>>();

	for (const url of urls) {
		const p = (async () => {
			const result = await fetchWithRetry(url);
			results.push(result);
			await onResult(result);
		})();

		executing.add(p);
		p.finally(() => executing.delete(p));

		if (executing.size >= concurrency) {
			await Promise.race(executing);
		}
	}

	await Promise.all(executing);
	return results;
}

/**
 * Select pages to analyze based on tier and priority.
 * Priority: Homepage > pages with rankings > one per section > rest
 */
export function selectPagesToAnalyze(
	pages: CrawledPage[],
	tier: TierConfig,
	rankedUrls?: Set<string>,
): string[] {
	const limit = CWV_PAGE_LIMITS[tier.tier];
	if (limit === 0) return [];

	const selected: string[] = [];
	const seen = new Set<string>();
	const sectionsSeen = new Set<string>();

	// Helper to add URL if not already added
	function add(url: string): boolean {
		if (seen.has(url) || selected.length >= limit) return false;
		seen.add(url);
		selected.push(url);
		return true;
	}

	// 1. Homepage first (find by shortest path or root)
	const sortedByPathLength = [...pages].sort(
		(a, b) => new URL(a.url).pathname.length - new URL(b.url).pathname.length,
	);
	const homepage = sortedByPathLength[0];
	if (homepage) add(homepage.url);

	// 2. Pages with rankings (if provided)
	if (rankedUrls) {
		for (const page of pages) {
			if (rankedUrls.has(page.url)) {
				add(page.url);
			}
		}
	}

	// 3. One per section (for coverage)
	for (const page of pages) {
		const section = page.section ?? "root";
		if (!sectionsSeen.has(section)) {
			if (add(page.url)) {
				sectionsSeen.add(section);
			}
		}
	}

	// 4. Fill remaining slots
	for (const page of pages) {
		add(page.url);
	}

	return selected;
}

function summarizeCWV(pages: CWVPageResult[]): CoreWebVitalsData["summary"] {
	const validPages = pages.filter(
		(p) => p.status === "success" && p.performance != null,
	);

	if (validPages.length === 0) {
		return { good: 0, needsImprovement: 0, poor: 0, avgPerformance: null };
	}

	let good = 0;
	let needsImprovement = 0;
	let poor = 0;
	let totalPerformance = 0;

	for (const page of validPages) {
		const perf = page.performance as number;
		totalPerformance += perf;

		if (perf >= 90) {
			good++;
		} else if (perf >= 50) {
			needsImprovement++;
		} else {
			poor++;
		}
	}

	return {
		good,
		needsImprovement,
		poor,
		avgPerformance: totalPerformance / validPages.length,
	};
}

async function runCoreWebVitals(
	ctx: ComponentContext,
	results: ComponentResults,
): Promise<ComponentResult<CoreWebVitalsData>> {
	// Get ranked URLs if available
	const rankedUrls = results.currentRankings
		? new Set(results.currentRankings.map((r) => r.url))
		: undefined;

	// Select pages to analyze
	const urls = selectPagesToAnalyze(ctx.pages, ctx.tier, rankedUrls);

	if (urls.length === 0) {
		return {
			ok: true,
			data: {
				pages: [],
				summary: {
					good: 0,
					needsImprovement: 0,
					poor: 0,
					avgPerformance: null,
				},
			},
		};
	}

	// Fetch CWV for selected pages
	// Note: onResult can be used to emit SSE events in the job flow
	const pageResults = await streamCWV(urls, CONCURRENCY, () => {
		// No-op here - SSE emission handled in job layer
	});

	return {
		ok: true,
		data: {
			pages: pageResults,
			summary: summarizeCWV(pageResults),
		},
	};
}

export const coreWebVitalsComponent: ComponentEntry<CoreWebVitalsData> = {
	key: "coreWebVitals",
	dependencies: [],
	run: runCoreWebVitals,
	store: (results, data) => ({ ...results, coreWebVitals: data }),
};
