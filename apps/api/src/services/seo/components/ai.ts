/**
 * AI Components - Require Claude/Anthropic API
 *
 * These components are retryable on API failure.
 */

import { createLogger } from "../../../lib/logger.js";
import type { ApiUsage } from "../../../types/api-usage.js";
import {
	type QuickWinSuggestions,
	type SemanticCluster,
	classifyKeywordIntents,
	clusterKeywordsSemantic,
	generateQuickWinSuggestions,
} from "../../ai/anthropic.js";
import type { CrawledPage } from "../../crawler/types.js";
import type {
	CurrentRanking,
	Opportunity,
	OpportunityCluster,
	QuickWin,
} from "../analysis.js";
import * as dataForSeo from "../dataforseo.js";
import type {
	ComponentContext,
	ComponentEntry,
	ComponentResult,
	ComponentResults,
} from "./types.js";

const log = createLogger("components.ai");

const LIMITS = {
	QUICK_WIN_CANDIDATES: 10,
	AI_QUICK_WINS: 5,
	TOP_COMPETITORS_FOR_AI: 3,
} as const;

const CTR_BY_POSITION: Record<number, number> = {
	1: 0.284,
	2: 0.157,
	3: 0.099,
	4: 0.075,
	5: 0.06,
	6: 0.048,
	7: 0.04,
	8: 0.035,
	9: 0.03,
	10: 0.026,
};

// ============================================================================
// Intent Classification Component
// ============================================================================

async function runIntentClassification(
	ctx: ComponentContext,
	results: ComponentResults,
): Promise<ComponentResult<Map<string, string>>> {
	if (ctx.tier.tier === "FREE") {
		return { ok: true, data: new Map() };
	}

	const opportunities = results.opportunities ?? [];
	if (opportunities.length === 0) {
		return { ok: true, data: new Map() };
	}

	try {
		log.info(
			{ count: opportunities.length },
			"Classifying intents for opportunities",
		);

		const intentMap = await classifyKeywordIntents(
			opportunities.map((o) => o.keyword),
			ctx.usage,
		);

		// Apply intents to opportunities in-place
		for (const opp of opportunities) {
			opp.intent = intentMap.get(opp.keyword.toLowerCase());
		}

		log.info({ count: intentMap.size }, "Intent classification complete");
		return { ok: true, data: intentMap };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		log.error({ error: message }, "Intent classification failed");
		return { ok: false, error: message };
	}
}

export const intentClassificationComponent: ComponentEntry<
	Map<string, string>
> = {
	key: "intentClassification",
	dependencies: ["keywordOpportunities", "competitorAnalysis"],
	run: runIntentClassification,
	// Intent data is applied to opportunities in-place, no separate storage needed
	store: (results, _data) => results,
};

// ============================================================================
// Keyword Clustering Component
// ============================================================================

function findMatchingPage(
	clusterKeywords: string[],
	pages: CrawledPage[],
): string | undefined {
	const keywordsLower = clusterKeywords.map((k) => k.toLowerCase());

	for (const page of pages) {
		const titleLower = page.title?.toLowerCase() ?? "";
		const h1Lower = page.h1?.toLowerCase() ?? "";

		for (const kw of keywordsLower) {
			if (titleLower.includes(kw) || h1Lower.includes(kw)) {
				return page.url;
			}
		}
	}
	return undefined;
}

function determineSuggestedAction(
	existingPage: string | undefined,
	clusterKeywords: string[],
	currentRankings: CurrentRanking[],
): "create" | "optimize" | "expand" {
	if (!existingPage) return "create";

	const rankedKeywords = currentRankings.filter((r) =>
		clusterKeywords.some((k) => k.toLowerCase() === r.keyword.toLowerCase()),
	);

	if (rankedKeywords.length === 0) return "optimize";

	const bestPosition = Math.min(...rankedKeywords.map((r) => r.position));
	return bestPosition <= 10 ? "expand" : "optimize";
}

async function runKeywordClustering(
	ctx: ComponentContext,
	results: ComponentResults,
): Promise<ComponentResult<OpportunityCluster[]>> {
	if (ctx.tier.tier === "FREE") {
		return { ok: true, data: [] };
	}

	const opportunities = results.opportunities ?? [];
	const currentRankings = results.currentRankings ?? [];

	if (opportunities.length === 0) {
		return { ok: true, data: [] };
	}

	try {
		log.info({ count: opportunities.length }, "Creating semantic clusters");

		// Call AI for semantic clustering
		const keywords = opportunities.map((o) => ({
			keyword: o.keyword,
			searchVolume: o.searchVolume,
		}));

		const semanticClusters = await clusterKeywordsSemantic(keywords, ctx.usage);

		// Map opportunities by keyword for quick lookup
		const oppsByKeyword = new Map<string, Opportunity>();
		for (const opp of opportunities) {
			oppsByKeyword.set(opp.keyword.toLowerCase(), opp);
		}

		const clusters: OpportunityCluster[] = [];

		for (const sc of semanticClusters) {
			// Get opportunities for this cluster
			const clusterOpps: Opportunity[] = [];
			for (const kw of sc.keywords) {
				const opp = oppsByKeyword.get(kw.toLowerCase());
				if (opp) {
					clusterOpps.push({ ...opp, cluster: sc.topic });
				}
			}

			if (clusterOpps.length === 0) continue;

			// Calculate aggregate stats
			const totalVolume = clusterOpps.reduce(
				(sum, o) => sum + o.searchVolume,
				0,
			);
			const avgDifficulty =
				clusterOpps.reduce((sum, o) => sum + o.difficulty, 0) /
				clusterOpps.length;

			// Find existing page and determine action
			const existingPage = findMatchingPage(sc.keywords, ctx.pages);
			const suggestedAction = determineSuggestedAction(
				existingPage,
				sc.keywords,
				currentRankings,
			);

			// Sort opportunities within cluster by impact
			clusterOpps.sort((a, b) => b.impactScore - a.impactScore);

			clusters.push({
				topic: sc.topic,
				opportunities: clusterOpps,
				totalVolume,
				avgDifficulty: Math.round(avgDifficulty),
				suggestedAction,
				existingPage,
			});
		}

		// Sort clusters by total volume
		const sortedClusters = clusters.sort(
			(a, b) => b.totalVolume - a.totalVolume,
		);

		log.info({ count: sortedClusters.length }, "Clustering complete");
		return { ok: true, data: sortedClusters };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		log.error({ error: message }, "Keyword clustering failed");
		return { ok: false, error: message };
	}
}

export const keywordClusteringComponent: ComponentEntry<OpportunityCluster[]> =
	{
		key: "keywordClustering",
		dependencies: ["intentClassification"],
		run: runKeywordClustering,
		store: (results, data) => ({ ...results, opportunityClusters: data }),
	};

// ============================================================================
// Quick Wins Component
// ============================================================================

async function generateAiSuggestionsForQuickWin(
	candidate: CurrentRanking,
	page: CrawledPage,
	allPages: CrawledPage[],
	usage?: ApiUsage,
): Promise<QuickWinSuggestions | null> {
	try {
		// Single API call for both SERP and PAA
		const { serp: serpResults, paa: questions } =
			await dataForSeo.getSerpWithPaa(
				candidate.keyword,
				"United States",
				"en",
				usage,
			);

		return await generateQuickWinSuggestions(
			{
				pageUrl: candidate.url,
				pageTitle: page.title,
				pageContent: page.content,
				keyword: candidate.keyword,
				currentPosition: candidate.position,
				topCompetitors: serpResults
					.filter((s) => s.position < candidate.position)
					.slice(0, LIMITS.TOP_COMPETITORS_FOR_AI)
					.map((s) => ({
						title: s.title,
						url: s.url,
						description: s.description,
					})),
				relatedQuestions: questions,
				existingPages: allPages.map((p) => ({ title: p.title, url: p.url })),
			},
			usage,
		);
	} catch (error) {
		log.error({ error, url: candidate.url }, "AI suggestion failed");
		return null;
	}
}

async function runQuickWins(
	ctx: ComponentContext,
	results: ComponentResults,
): Promise<ComponentResult<QuickWin[]>> {
	if (ctx.tier.tier === "FREE") {
		return { ok: true, data: [] };
	}

	const currentRankings = results.currentRankings ?? [];
	if (currentRankings.length === 0) {
		return { ok: true, data: [] };
	}

	try {
		const pagesByUrl = new Map(ctx.pages.map((p) => [p.url, p]));

		// Sort by traffic gain potential
		const avgTopCtr =
			((CTR_BY_POSITION[1] ?? 0.28) +
				(CTR_BY_POSITION[2] ?? 0.15) +
				(CTR_BY_POSITION[3] ?? 0.1)) /
			3;

		const candidates = currentRankings
			.filter((r) => r.position >= 10 && r.position <= 30)
			.sort((a, b) => {
				const potentialA = a.searchVolume * avgTopCtr - a.estimatedTraffic;
				const potentialB = b.searchVolume * avgTopCtr - b.estimatedTraffic;
				return potentialB - potentialA;
			})
			.slice(0, LIMITS.QUICK_WIN_CANDIDATES);

		const aiCandidates = candidates.slice(0, LIMITS.AI_QUICK_WINS);
		const nonAiCandidates = candidates.slice(LIMITS.AI_QUICK_WINS);

		log.info(
			{ count: aiCandidates.length },
			"Generating AI suggestions for quick wins",
		);

		const aiResults = await Promise.all(
			aiCandidates.map(async (candidate) => {
				const page = pagesByUrl.get(candidate.url);
				if (!page) return { candidate, suggestions: null };

				const suggestions = await generateAiSuggestionsForQuickWin(
					candidate,
					page,
					ctx.pages,
					ctx.usage,
				);
				return { candidate, suggestions };
			}),
		);

		const quickWins: QuickWin[] = [];

		for (const { candidate, suggestions } of aiResults) {
			quickWins.push({
				url: candidate.url,
				keyword: candidate.keyword,
				currentPosition: candidate.position,
				suggestions: suggestions?.contentGaps.slice(0, 3) ?? [
					"Add more comprehensive content",
					"Include related keywords",
					"Improve internal linking",
				],
				aiSuggestions: suggestions ?? undefined,
			});
		}

		for (const candidate of nonAiCandidates) {
			quickWins.push({
				url: candidate.url,
				keyword: candidate.keyword,
				currentPosition: candidate.position,
				suggestions: [
					"Add more comprehensive content",
					"Include related keywords",
					"Improve internal linking",
				],
			});
		}

		log.info({ count: quickWins.length }, "Quick wins analysis complete");
		return { ok: true, data: quickWins };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		log.error({ error: message }, "Quick wins analysis failed");
		return { ok: false, error: message };
	}
}

export const quickWinsComponent: ComponentEntry<QuickWin[]> = {
	key: "quickWins",
	dependencies: ["currentRankings"],
	run: runQuickWins,
	store: (results, data) => ({ ...results, quickWins: data }),
};
