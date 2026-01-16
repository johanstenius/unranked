/**
 * Brief Recommendations Service
 *
 * Computes unified brief recommendations from multiple sources:
 * - Target keywords (user-provided)
 * - Quick wins (pages close to ranking)
 * - Content gaps (keywords competitors rank for)
 *
 * Returns prioritized list sorted by business impact.
 */

import type { Opportunity, QuickWin } from "./seo/analysis.js";
import { calculatePriority, normalizeScore } from "./seo/priority.js";

export type BriefRecommendationSource = "target" | "quick_win" | "gap";

export type BriefRecommendation = {
	id: string;
	keyword: string;
	source: BriefRecommendationSource;
	priority: number;
	searchVolume?: number;
	currentPosition?: number;
	url?: string;
	reason: string;
};

type BuildRecommendationsInput = {
	targetKeywords: string[];
	quickWins: QuickWin[];
	opportunities: Opportunity[];
	maxRecommendations?: number;
};

/**
 * Build brief recommendations from available data sources.
 * Returns sorted list with top recommendations first.
 */
export function buildBriefRecommendations(
	input: BuildRecommendationsInput,
): BriefRecommendation[] {
	const {
		targetKeywords,
		quickWins,
		opportunities,
		maxRecommendations = 20,
	} = input;

	const recommendations: BriefRecommendation[] = [];
	const seenKeywords = new Set<string>();

	// 1. Quick Wins - highest priority (easy wins, existing pages)
	for (const qw of quickWins) {
		const key = qw.keyword.toLowerCase();
		if (seenKeywords.has(key)) continue;
		seenKeywords.add(key);

		// Position score: closer to #1 = higher score
		const positionScore = normalizeScore(30 - qw.currentPosition, 20);

		const priority = calculatePriority(
			60, // volume (moderate - we don't have exact volume for quick wins)
			positionScore,
			70, // difficulty (low - we're already ranking)
			80, // effort (medium - optimize existing)
		);

		recommendations.push({
			id: `qw-${key}`,
			keyword: qw.keyword,
			source: "quick_win",
			priority,
			currentPosition: qw.currentPosition,
			url: qw.url,
			reason: `Position #${qw.currentPosition} - optimize to reach top 3`,
		});
	}

	// 2. Content Gaps from opportunities
	for (const opp of opportunities) {
		const key = opp.keyword.toLowerCase();
		if (seenKeywords.has(key)) continue;
		seenKeywords.add(key);

		const volumeScore = normalizeScore(opp.searchVolume, 10000);
		const difficultyScore = 100 - opp.difficulty;

		const priority = calculatePriority(
			volumeScore,
			50, // position (new content = no current position)
			difficultyScore,
			30, // effort (high - create new content)
		);

		recommendations.push({
			id: `gap-${key}`,
			keyword: opp.keyword,
			source: "gap",
			priority,
			searchVolume: opp.searchVolume,
			reason: opp.reason,
		});
	}

	// 3. Target keywords (user-provided) - if not already covered
	for (let i = 0; i < targetKeywords.length; i++) {
		const keyword = targetKeywords[i];
		if (!keyword) continue;

		const key = keyword.toLowerCase();
		if (seenKeywords.has(key)) continue;
		seenKeywords.add(key);

		// Target keywords get moderate priority - user wants to rank for these
		const priority = calculatePriority(
			50, // volume (unknown)
			50, // position (unknown)
			50, // difficulty (unknown)
			30, // effort (create content)
		);

		recommendations.push({
			id: `target-${i}`,
			keyword,
			source: "target",
			priority,
			reason: "Your target keyword",
		});
	}

	// Sort by priority (highest first) and limit
	return recommendations
		.sort((a, b) => b.priority - a.priority)
		.slice(0, maxRecommendations);
}

/**
 * Get the top N recommendations for the "Recommended" section.
 * Pre-selects the highest impact items.
 */
export function getTopRecommendations(
	recommendations: BriefRecommendation[],
	count = 5,
): BriefRecommendation[] {
	return recommendations.slice(0, count);
}
