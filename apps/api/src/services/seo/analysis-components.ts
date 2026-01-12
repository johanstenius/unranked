/**
 * Component-level analysis functions for resilient pipeline.
 * Each function handles one component that can independently succeed/fail.
 */

import { getErrorMessage } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import type {
	AuditProgress,
	ComponentStatus,
} from "../../types/audit-progress.js";
import {
	type QuickWinSuggestions,
	type SearchIntent,
	generateQuickWinSuggestionsTyped,
} from "../ai/anthropic.js";
import {
	type GenerateBriefsResult,
	type GeneratedBrief,
	generateBriefs,
} from "../brief/generator.js";
import type { CrawledPage, RedirectChain } from "../crawler/types.js";
import {
	type ApiResult,
	type DiscoveredCompetitor,
	type DomainKeyword,
	discoverCompetitorsTyped,
	getDomainRankedKeywordsTyped,
	getKeywordDataTyped,
	getPeopleAlsoAsk,
	getSerpResults,
	isApiAvailable,
} from "./dataforseo.js";

const log = createLogger("analysis-components");

// Re-export types from main analysis (QuickWin defined locally with different shape)
export type {
	AnalysisResult,
	CurrentRanking,
	TechnicalIssue,
	CompetitorGap,
	SnippetOpportunity,
	Opportunity,
	OpportunityCluster,
} from "./analysis.js";

import type { OpportunityCluster } from "./analysis.js";

export type ComponentResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: string; retriable: boolean };

/**
 * Check if DataForSEO API is available for keyword operations
 */
export function canRunDataForSeoComponents(): boolean {
	return isApiAvailable();
}

/**
 * Get current domain rankings (DataForSEO dependent)
 */
export async function runCurrentRankings(
	hostname: string,
): Promise<ComponentResult<DomainKeyword[]>> {
	log.info({ hostname }, "Running current rankings component");

	const result = await getDomainRankedKeywordsTyped(hostname, {
		limit: 100,
		maxPosition: 100,
		minVolume: 10,
	});

	if (!result.ok) {
		const retriable = result.error !== "auth_error";
		return {
			ok: false,
			error: `DataForSEO error: ${result.message}`,
			retriable,
		};
	}

	log.info(
		{ hostname, count: result.data.length },
		"Current rankings complete",
	);
	return { ok: true, data: result.data };
}

/**
 * Discover competitors (DataForSEO dependent)
 */
export async function runCompetitorDiscovery(
	hostname: string,
	limit = 5,
): Promise<ComponentResult<DiscoveredCompetitor[]>> {
	log.info({ hostname }, "Running competitor discovery component");

	const result = await discoverCompetitorsTyped(hostname, { limit });

	if (!result.ok) {
		const retriable = result.error !== "auth_error";
		return {
			ok: false,
			error: `DataForSEO error: ${result.message}`,
			retriable,
		};
	}

	log.info(
		{ hostname, count: result.data.length },
		"Competitor discovery complete",
	);
	return { ok: true, data: result.data };
}

/**
 * Get keyword data for opportunities (DataForSEO dependent)
 */
export async function runKeywordData(
	keywords: string[],
): Promise<
	ComponentResult<
		Array<{ keyword: string; searchVolume: number; difficulty: number }>
	>
> {
	log.info({ count: keywords.length }, "Running keyword data component");

	if (keywords.length === 0) {
		return { ok: true, data: [] };
	}

	const result = await getKeywordDataTyped(keywords);

	if (!result.ok) {
		const retriable = result.error !== "auth_error";
		return {
			ok: false,
			error: `DataForSEO error: ${result.message}`,
			retriable,
		};
	}

	log.info({ count: result.data.length }, "Keyword data complete");
	return { ok: true, data: result.data };
}

/**
 * Check if all required components for briefs are ready
 */
export function canGenerateBriefs(progress: AuditProgress): boolean {
	// Need keyword opportunities for briefs
	return progress.keywordOpportunities.status === "completed";
}

/**
 * Check if enough is done to show partial results
 */
export function hasPartialResults(progress: AuditProgress): boolean {
	// Show results if technical analysis is done
	return (
		progress.technicalIssues.status === "completed" &&
		progress.internalLinking.status === "completed"
	);
}

/**
 * Determine overall status from component progress
 */
export function determineOverallStatus(
	progress: AuditProgress,
): "ANALYZING" | "RETRYING" | "COMPLETED" | "FAILED" {
	const componentKeys: (keyof Omit<AuditProgress, "retryCount">)[] = [
		"crawl",
		"technicalIssues",
		"internalLinking",
		"duplicateContent",
		"redirectChains",
		"currentRankings",
		"competitorAnalysis",
		"keywordOpportunities",
		"snippetOpportunities",
		"quickWins",
		"briefs",
		"actionPlan",
	];

	// If any critical component failed, overall is FAILED
	const criticalFailed = progress.crawl.status === "failed";
	if (criticalFailed) return "FAILED";

	// If all are completed, overall is COMPLETED
	const allCompleted = componentKeys.every(
		(c) => progress[c].status === "completed",
	);
	if (allCompleted) return "COMPLETED";

	// If any are pending or failed (need to run), overall is RETRYING
	const anyNeedRun = componentKeys.some(
		(c) => progress[c].status === "pending" || progress[c].status === "failed",
	);
	if (anyNeedRun) return "RETRYING";

	// Otherwise still analyzing (running)
	return "ANALYZING";
}

// ============================================================================
// QUICK WINS GENERATION
// ============================================================================

export type QuickWin = {
	url: string;
	keyword: string;
	currentPosition: number;
	suggestions: string[];
	aiSuggestions?: QuickWinSuggestions;
};

type CurrentRankingInput = {
	url: string;
	keyword: string;
	position: number;
	searchVolume: number;
	estimatedTraffic: number;
};

/**
 * Generate quick win suggestions for a single ranking
 */
async function generateQuickWinForRanking(
	ranking: CurrentRankingInput,
	page: CrawledPage,
	allPages: CrawledPage[],
): Promise<QuickWinSuggestions | null> {
	try {
		const [serpResults, questions] = await Promise.all([
			getSerpResults(ranking.keyword),
			getPeopleAlsoAsk(ranking.keyword),
		]);

		const result = await generateQuickWinSuggestionsTyped({
			pageUrl: ranking.url,
			pageTitle: page.title,
			pageContent: page.content,
			keyword: ranking.keyword,
			currentPosition: ranking.position,
			topCompetitors: serpResults.slice(0, 3).map((r) => ({
				title: r.title,
				url: r.url,
				description: r.description,
			})),
			relatedQuestions: questions,
			existingPages: allPages.map((p) => ({ title: p.title, url: p.url })),
		});

		if (result.ok) {
			return result.data;
		}
		log.warn(
			{ keyword: ranking.keyword, error: result.message },
			"Quick win AI failed",
		);
		return null;
	} catch (error) {
		log.error(
			{ keyword: ranking.keyword, error },
			"Quick win generation error",
		);
		return null;
	}
}

/**
 * Run quick wins generation (Claude + DataForSEO dependent)
 * Generates AI-powered improvement suggestions for pages ranking 4-20
 */
export async function runQuickWins(
	currentRankings: CurrentRankingInput[],
	pages: CrawledPage[],
): Promise<ComponentResult<QuickWin[]>> {
	log.info(
		{ rankings: currentRankings.length },
		"Running quick wins component",
	);

	if (currentRankings.length === 0 || pages.length === 0) {
		return { ok: true, data: [] };
	}

	const pagesByUrl = new Map(pages.map((p) => [p.url, p]));

	// Filter to positions 4-20 (already ranking, can improve)
	const candidates = currentRankings
		.filter((r) => r.position >= 4 && r.position <= 20)
		.sort((a, b) => {
			// Prioritize by traffic gain potential
			const aGain = a.searchVolume * (0.32 - estimateCtr(a.position));
			const bGain = b.searchVolume * (0.32 - estimateCtr(b.position));
			return bGain - aGain;
		})
		.slice(0, 10); // Top 10 candidates

	// Generate AI suggestions for top 5
	const aiCandidates = candidates.slice(0, 5);
	const nonAiCandidates = candidates.slice(5);

	const aiResults = await Promise.all(
		aiCandidates.map(async (ranking) => {
			const page = pagesByUrl.get(ranking.url);
			if (!page) return { ranking, suggestions: null };

			const suggestions = await generateQuickWinForRanking(
				ranking,
				page,
				pages,
			);
			return { ranking, suggestions };
		}),
	);

	const quickWins: QuickWin[] = [];

	for (const { ranking, suggestions } of aiResults) {
		quickWins.push({
			url: ranking.url,
			keyword: ranking.keyword,
			currentPosition: ranking.position,
			suggestions: suggestions
				? [
						...suggestions.contentGaps.slice(0, 2),
						...suggestions.questionsToAnswer.slice(0, 2),
					]
				: [
						`Optimize for "${ranking.keyword}" to improve from position ${ranking.position}`,
					],
			aiSuggestions: suggestions ?? undefined,
		});
	}

	for (const ranking of nonAiCandidates) {
		quickWins.push({
			url: ranking.url,
			keyword: ranking.keyword,
			currentPosition: ranking.position,
			suggestions: [
				`Optimize for "${ranking.keyword}" to improve from position ${ranking.position}`,
			],
		});
	}

	log.info({ count: quickWins.length }, "Quick wins complete");
	return { ok: true, data: quickWins };
}

function estimateCtr(position: number): number {
	const ctrByPosition: Record<number, number> = {
		1: 0.32,
		2: 0.17,
		3: 0.11,
		4: 0.08,
		5: 0.06,
		6: 0.05,
		7: 0.04,
		8: 0.03,
		9: 0.03,
		10: 0.02,
	};
	return ctrByPosition[position] ?? 0.01;
}

// ============================================================================
// BRIEFS GENERATION
// ============================================================================

type OpportunityInput = {
	keyword: string;
	searchVolume: number;
	difficulty: number;
	impactScore: number;
	reason: string;
	competitorUrl?: string;
	intent?: SearchIntent | string; // Allow string from DB JSON
};

/**
 * Run briefs generation (Claude + DataForSEO dependent)
 * Generates content briefs for top keyword opportunities
 */
export async function runBriefs(
	opportunities: OpportunityInput[],
	productDesc: string | null,
	pages: CrawledPage[],
	maxBriefs: number,
	existingClusters?: OpportunityCluster[],
): Promise<ComponentResult<GenerateBriefsResult>> {
	log.info(
		{ opportunities: opportunities.length, maxBriefs },
		"Running briefs component",
	);

	if (opportunities.length === 0) {
		return {
			ok: true,
			data: { briefs: [], failedCount: 0, failedKeywords: [] },
		};
	}

	if (maxBriefs === 0) {
		return {
			ok: true,
			data: { briefs: [], failedCount: 0, failedKeywords: [] },
		};
	}

	try {
		// Cast opportunities - intent might be string from JSON, generateBriefs handles it
		const typedOpportunities = opportunities.map((o) => ({
			...o,
			intent: o.intent as SearchIntent | undefined,
		}));
		const result = await generateBriefs(
			typedOpportunities,
			productDesc,
			pages,
			maxBriefs,
			existingClusters,
		);

		// If all briefs failed, return error
		if (result.briefs.length === 0 && result.failedCount > 0) {
			return {
				ok: false,
				error: `All ${result.failedCount} briefs failed to generate`,
				retriable: true,
			};
		}

		log.info(
			{ generated: result.briefs.length, failed: result.failedCount },
			"Briefs complete",
		);
		return { ok: true, data: result };
	} catch (error) {
		const message = getErrorMessage(error);
		log.error({ error: message }, "Briefs generation failed");
		return { ok: false, error: message, retriable: true };
	}
}

// Re-export brief types
export type { GeneratedBrief, GenerateBriefsResult };
