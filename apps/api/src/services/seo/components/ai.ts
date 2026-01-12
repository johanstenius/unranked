/**
 * AI Components - Require Claude/Anthropic API
 *
 * These components are retryable on API failure.
 */

import { getErrorMessage } from "../../../lib/errors.js";
import { createLogger } from "../../../lib/logger.js";
import type { ApiUsage } from "../../../types/api-usage.js";
import {
	type QuickWinSuggestions,
	generateQuickWinSuggestions,
} from "../../ai/anthropic.js";
import type { CrawledPage } from "../../crawler/types.js";
import type { CurrentRanking, QuickWin } from "../analysis.js";
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
		const message = getErrorMessage(error);
		log.error({ error: message }, "Quick wins analysis failed");
		return { ok: false, error: message };
	}
}

export const quickWinsComponent: ComponentEntry<QuickWin[]> = {
	key: "quickWins",
	dependencies: ["currentRankings"],
	run: runQuickWins,
	store: (results, data) => ({ ...results, quickWins: data }),
	sseKey: "quickWins",
	getSSEData: (results) => results.quickWins ?? [],
};
