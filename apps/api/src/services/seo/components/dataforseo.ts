/**
 * DataForSEO Components - Require DataForSEO API
 *
 * These components are retryable on API failure.
 */

import { createLogger } from "../../../lib/logger.js";
import type { CrawledPage } from "../../crawler/types.js";
import type {
	CannibalizationIssue,
	CompetitorGap,
	CurrentRanking,
	Opportunity,
	OpportunitySource,
	SnippetOpportunity,
} from "../analysis.js";
import * as dataForSeo from "../dataforseo.js";
import type { DiscoveredCompetitor } from "../dataforseo.js";
import { countWholeWordMatches, hasWholeWordMatch } from "../text-utils.js";
import type {
	ComponentContext,
	ComponentEntry,
	ComponentResult,
	ComponentResults,
} from "./types.js";

const log = createLogger("components.dataforseo");

const LIMITS = {
	EXTRACTED_KEYWORDS: 50,
	MIN_SEARCH_VOLUME: 50,
	MAX_OPPORTUNITIES: 50,
	MAX_COMPETITORS: 3,
	GAP_KEYWORDS_PER_COMPETITOR: 50,
	COMMON_KEYWORDS_PER_COMPETITOR: 10,
	MAX_CANNIBALIZATION_ISSUES: 20,
	MAX_TOP_RANKINGS_FOR_SNIPPETS: 15,
	REALISTIC_DIFFICULTY: 45,
	QUICK_WIN_MAX_DIFFICULTY: 30,
	IMPACT_SCORE_SCALE: 30,
	SEED_MIN_VOLUME: 300,
	SEED_MAX_POSITION: 30,
	CANNIBALIZATION_MIN_CONTENT_MENTIONS: 5,
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

function getCTR(position: number): number {
	if (position > 100) return 0;
	return CTR_BY_POSITION[position] ?? 0.01 / position;
}

function getPositionBonus(competitorPosition: number | undefined): number {
	if (!competitorPosition) return 1;
	if (competitorPosition <= 10) return 1.5;
	if (competitorPosition <= 20) return 1.2;
	if (competitorPosition <= 30) return 1.1;
	return 1;
}

function calculateImpactScore(
	volume: number,
	difficulty: number,
	competitorPosition?: number,
): number {
	const safeDifficulty = Math.max(difficulty, 1);
	const positionBonus = getPositionBonus(competitorPosition);
	const rawScore = volume * (1 / safeDifficulty) * positionBonus;
	const normalizedScore = Math.min(
		100,
		Math.log10(rawScore + 1) * LIMITS.IMPACT_SCORE_SCALE,
	);
	return Math.round(normalizedScore * 100) / 100;
}

function isQuickWinOpportunity(
	difficulty: number,
	competitorPosition: number | undefined,
): boolean {
	return (
		difficulty <= LIMITS.QUICK_WIN_MAX_DIFFICULTY &&
		(!competitorPosition || competitorPosition > 10)
	);
}

function estimateTrafficGain(volume: number): number {
	const ctr1 = CTR_BY_POSITION[1] ?? 0.28;
	const ctr2 = CTR_BY_POSITION[2] ?? 0.15;
	const ctr3 = CTR_BY_POSITION[3] ?? 0.1;
	const avgTopCTR = (ctr1 + ctr2 + ctr3) / 3;
	return Math.round(volume * avgTopCTR);
}

function extractKeywordsFromContent(pages: CrawledPage[]): string[] {
	const keywords = new Set<string>();
	for (const page of pages) {
		// Include H2s for better long-tail keyword discovery
		const texts = [page.title, page.h1, ...(page.h2s ?? [])];
		for (const text of texts) {
			if (!text) continue;
			// Filter out short words (articles, prepositions)
			const words = text
				.toLowerCase()
				.split(/\s+/)
				.filter((w) => w.length > 2);
			// Extract 2, 3, and 4 word phrases
			for (let len = 2; len <= 4; len++) {
				for (let i = 0; i <= words.length - len; i++) {
					keywords.add(words.slice(i, i + len).join(" "));
				}
			}
		}
	}
	return [...keywords].slice(0, LIMITS.EXTRACTED_KEYWORDS);
}

function normalizeCompetitorInput(input: string): string | null {
	const trimmed = input.trim().toLowerCase();
	if (!trimmed) return null;

	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		try {
			new URL(trimmed);
			return trimmed;
		} catch {
			return null;
		}
	}

	if (trimmed.includes(".")) {
		try {
			const url = `https://${trimmed}`;
			new URL(url);
			return url;
		} catch {
			return null;
		}
	}

	return null;
}

// ============================================================================
// Current Rankings Component
// ============================================================================

async function runCurrentRankings(
	ctx: ComponentContext,
	_results: ComponentResults,
): Promise<ComponentResult<CurrentRanking[]>> {
	if (ctx.tier.tier === "FREE") {
		return { ok: true, data: [] };
	}

	try {
		log.info({ hostname: ctx.hostname }, "Fetching domain rankings");

		const domainRankings = await dataForSeo.getDomainRankedKeywords(
			ctx.hostname,
			{
				limit: 100,
				maxPosition: 100,
				minVolume: 10,
			},
			ctx.usage,
		);

		log.info({ count: domainRankings.length }, "Found ranked keywords");

		const currentRankings: CurrentRanking[] = domainRankings.map((r) => ({
			url: r.url,
			keyword: r.keyword,
			position: r.position,
			searchVolume: r.searchVolume,
			estimatedTraffic: Math.round(r.searchVolume * getCTR(r.position)),
		}));

		return { ok: true, data: currentRankings };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		log.error({ error: message }, "Failed to fetch rankings");
		return { ok: false, error: message };
	}
}

export const currentRankingsComponent: ComponentEntry<CurrentRanking[]> = {
	key: "currentRankings",
	dependencies: [],
	run: runCurrentRankings,
	store: (results, data) => ({ ...results, currentRankings: data }),
};

// ============================================================================
// Keyword Opportunities Component
// ============================================================================

type KeywordOpportunitiesResult = {
	opportunities: Opportunity[];
	seedOpportunities: Opportunity[];
};

async function runKeywordOpportunities(
	ctx: ComponentContext,
	results: ComponentResults,
): Promise<ComponentResult<KeywordOpportunitiesResult>> {
	if (ctx.tier.tier === "FREE") {
		return { ok: true, data: { opportunities: [], seedOpportunities: [] } };
	}

	const currentRankings = results.currentRankings ?? [];
	const rankedKeywords = new Set(
		currentRankings.map((r) => r.keyword.toLowerCase()),
	);

	try {
		// Extract keywords from content
		const extractedKeywords = extractKeywordsFromContent(ctx.pages);
		log.info({ count: extractedKeywords.length }, "Extracted keywords");

		// Fetch keyword data
		const keywordData = await dataForSeo.getKeywordData(
			extractedKeywords,
			"United States",
			"en",
			ctx.usage,
		);
		log.info({ count: keywordData.length }, "Got keyword data");

		// Build initial opportunities
		const opportunities = keywordData
			.filter(
				(k) =>
					!rankedKeywords.has(k.keyword) &&
					k.searchVolume > LIMITS.MIN_SEARCH_VOLUME,
			)
			.map((k) => ({
				keyword: k.keyword,
				searchVolume: k.searchVolume,
				difficulty: k.difficulty,
				impactScore: calculateImpactScore(k.searchVolume, k.difficulty),
				reason: "No existing page targets this keyword",
				source: "content_extraction" as OpportunitySource,
			}))
			.sort((a, b) => b.impactScore - a.impactScore)
			.slice(0, LIMITS.MAX_OPPORTUNITIES);

		// Seed expansion
		const seedOpportunities: Opportunity[] = [];
		if (ctx.tier.maxSeeds > 0) {
			const seeds = currentRankings
				.filter(
					(r) =>
						r.searchVolume > LIMITS.SEED_MIN_VOLUME &&
						r.position < LIMITS.SEED_MAX_POSITION,
				)
				.sort((a, b) => b.searchVolume - a.searchVolume)
				.slice(0, ctx.tier.maxSeeds)
				.map((r) => r.keyword);

			if (seeds.length > 0) {
				log.info({ seeds }, "Expanding from seeds");

				const expansionResults = await Promise.all(
					seeds.map(async (seed) => {
						try {
							const related = await dataForSeo.getRelatedKeywords(
								seed,
								"United States",
								"en",
								ctx.usage,
							);
							return { seed, related };
						} catch (error) {
							log.error({ error, seed }, "Seed expansion failed");
							return { seed, related: [] };
						}
					}),
				);

				const seenKeywords = new Set<string>();
				for (const { seed, related } of expansionResults) {
					for (const kw of related) {
						const keyLower = kw.keyword.toLowerCase();
						if (rankedKeywords.has(keyLower) || seenKeywords.has(keyLower)) {
							continue;
						}
						if (kw.searchVolume < LIMITS.MIN_SEARCH_VOLUME) {
							continue;
						}
						seenKeywords.add(keyLower);
						seedOpportunities.push({
							keyword: kw.keyword,
							searchVolume: kw.searchVolume,
							difficulty: kw.difficulty,
							impactScore: calculateImpactScore(kw.searchVolume, kw.difficulty),
							reason: `Related to "${seed}" which you rank for`,
							source: "seed_expansion",
							isQuickWin: kw.difficulty <= LIMITS.QUICK_WIN_MAX_DIFFICULTY,
							estimatedTraffic: estimateTrafficGain(kw.searchVolume),
						});
					}
				}
				seedOpportunities.sort((a, b) => b.impactScore - a.impactScore);
				log.info(
					{ count: seedOpportunities.length },
					"Seed expansion complete",
				);
			}
		}

		return { ok: true, data: { opportunities, seedOpportunities } };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		log.error({ error: message }, "Failed to get keyword opportunities");
		return { ok: false, error: message };
	}
}

export const keywordOpportunitiesComponent: ComponentEntry<KeywordOpportunitiesResult> =
	{
		key: "keywordOpportunities",
		dependencies: ["currentRankings"],
		run: runKeywordOpportunities,
		store: (results, data) => ({
			...results,
			opportunities: [
				...(results.opportunities ?? []),
				...data.opportunities,
				...data.seedOpportunities,
			],
		}),
	};

// ============================================================================
// Competitor Analysis Component
// ============================================================================

type CompetitorAnalysisResult = {
	gaps: CompetitorGap[];
	newOpportunities: Opportunity[];
	discoveredCompetitors: DiscoveredCompetitor[];
};

async function runCompetitorAnalysis(
	ctx: ComponentContext,
	results: ComponentResults,
): Promise<ComponentResult<CompetitorAnalysisResult>> {
	if (ctx.tier.tier === "FREE" || ctx.tier.maxCompetitors === 0) {
		return {
			ok: true,
			data: { gaps: [], newOpportunities: [], discoveredCompetitors: [] },
		};
	}

	const currentRankings = results.currentRankings ?? [];
	const existingOpportunities = results.opportunities ?? [];

	try {
		let discoveredCompetitors: DiscoveredCompetitor[] = [];
		let competitorUrls = ctx.competitors.slice(0, ctx.tier.maxCompetitors);

		// Auto-discover competitors if none provided
		if (competitorUrls.length === 0) {
			log.info({ hostname: ctx.hostname }, "Auto-discovering competitors");
			discoveredCompetitors = await dataForSeo.discoverCompetitors(
				ctx.hostname,
				{ limit: 5 },
				ctx.usage,
			);

			if (discoveredCompetitors.length > 0) {
				log.info(
					{ competitors: discoveredCompetitors.map((c) => c.domain) },
					"Discovered competitors",
				);
				competitorUrls = discoveredCompetitors
					.slice(0, ctx.tier.maxCompetitors)
					.map((c) => `https://${c.domain}`);
			}
		}

		// Normalize URLs
		const normalizedUrls = competitorUrls
			.map(normalizeCompetitorInput)
			.filter((url): url is string => url !== null);

		if (normalizedUrls.length === 0) {
			return {
				ok: true,
				data: { gaps: [], newOpportunities: [], discoveredCompetitors },
			};
		}

		log.info({ competitors: normalizedUrls }, "Analyzing competitors");

		// Fetch competitor keywords
		const competitorResults = await Promise.all(
			normalizedUrls.map(async (competitorUrl) => {
				try {
					const domain = new URL(competitorUrl).hostname;
					const keywords = await dataForSeo.getDomainRankedKeywords(
						domain,
						{
							limit: 200,
							maxPosition: 30,
							minVolume: LIMITS.MIN_SEARCH_VOLUME,
							maxDifficulty: LIMITS.REALISTIC_DIFFICULTY,
						},
						ctx.usage,
					);
					return { domain, keywords };
				} catch (error) {
					log.error({ error, competitorUrl }, "Failed to analyze competitor");
					return { domain: null, keywords: [] };
				}
			}),
		);

		const rankingsByKeyword = new Map(
			currentRankings.map((r) => [r.keyword.toLowerCase(), r]),
		);
		const existingOppsByKeyword = new Map(
			existingOpportunities.map((o) => [o.keyword.toLowerCase(), o]),
		);

		const gaps: CompetitorGap[] = [];
		const newOpportunities: Opportunity[] = [];

		for (const { domain, keywords: competitorKeywords } of competitorResults) {
			if (!domain) continue;

			const gapKeywords: CompetitorGap["gapKeywords"] = [];
			const commonKeywords: CompetitorGap["commonKeywords"] = [];

			for (const compKw of competitorKeywords) {
				const keyLower = compKw.keyword.toLowerCase();
				const yourRanking = rankingsByKeyword.get(keyLower);

				if (yourRanking) {
					commonKeywords.push({
						keyword: compKw.keyword,
						yourPosition: yourRanking.position,
						theirPosition: compKw.position,
					});
				} else {
					gapKeywords.push({
						keyword: compKw.keyword,
						searchVolume: compKw.searchVolume,
						difficulty: compKw.difficulty,
						competitorPosition: compKw.position,
						competitorUrl: compKw.url,
					});

					// Enrich existing opportunities or add new ones
					const existingOpp = existingOppsByKeyword.get(keyLower);
					if (existingOpp) {
						existingOpp.competitorUrl = compKw.url;
						existingOpp.competitorPosition = compKw.position;
						existingOpp.reason = `${domain} ranks #${compKw.position}`;
						existingOpp.isQuickWin = isQuickWinOpportunity(
							compKw.difficulty,
							compKw.position,
						);
						existingOpp.estimatedTraffic = estimateTrafficGain(
							compKw.searchVolume,
						);
						existingOpp.impactScore = calculateImpactScore(
							compKw.searchVolume,
							compKw.difficulty,
							compKw.position,
						);
					} else if (compKw.searchVolume > LIMITS.MIN_SEARCH_VOLUME) {
						newOpportunities.push({
							keyword: compKw.keyword,
							searchVolume: compKw.searchVolume,
							difficulty: compKw.difficulty,
							impactScore: calculateImpactScore(
								compKw.searchVolume,
								compKw.difficulty,
								compKw.position,
							),
							reason: `${domain} ranks #${compKw.position}`,
							competitorUrl: compKw.url,
							competitorPosition: compKw.position,
							isQuickWin: isQuickWinOpportunity(
								compKw.difficulty,
								compKw.position,
							),
							estimatedTraffic: estimateTrafficGain(compKw.searchVolume),
							source: "competitor_gap",
						});
					}
				}
			}

			// Sort and limit
			const scoredGapKeywords = gapKeywords
				.map((kw) => ({
					...kw,
					score: calculateImpactScore(
						kw.searchVolume,
						kw.difficulty,
						kw.competitorPosition,
					),
				}))
				.sort((a, b) => b.score - a.score);

			gaps.push({
				competitor: domain,
				totalKeywords: competitorKeywords.length,
				gapKeywords: scoredGapKeywords.slice(
					0,
					LIMITS.GAP_KEYWORDS_PER_COMPETITOR,
				),
				commonKeywords: commonKeywords.slice(
					0,
					LIMITS.COMMON_KEYWORDS_PER_COMPETITOR,
				),
			});

			log.info(
				{ domain, gaps: gapKeywords.length, common: commonKeywords.length },
				"Competitor analyzed",
			);
		}

		return {
			ok: true,
			data: { gaps, newOpportunities, discoveredCompetitors },
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		log.error({ error: message }, "Competitor analysis failed");
		return { ok: false, error: message };
	}
}

export const competitorAnalysisComponent: ComponentEntry<CompetitorAnalysisResult> =
	{
		key: "competitorAnalysis",
		dependencies: ["currentRankings"],
		run: runCompetitorAnalysis,
		store: (results, data) => ({
			...results,
			competitorGaps: data.gaps,
			discoveredCompetitors: data.discoveredCompetitors,
			opportunities: [
				...(results.opportunities ?? []),
				...data.newOpportunities,
			],
		}),
	};

// ============================================================================
// Cannibalization Component
// ============================================================================

async function runCannibalization(
	ctx: ComponentContext,
	results: ComponentResults,
): Promise<ComponentResult<CannibalizationIssue[]>> {
	if (ctx.tier.tier === "FREE") {
		return { ok: true, data: [] };
	}

	const currentRankings = results.currentRankings ?? [];
	if (currentRankings.length === 0) {
		return { ok: true, data: [] };
	}

	const issues: CannibalizationIssue[] = [];

	// Group rankings by keyword
	const rankingsByKeyword = new Map<string, CurrentRanking[]>();
	for (const ranking of currentRankings) {
		const kw = ranking.keyword.toLowerCase();
		const existing = rankingsByKeyword.get(kw) ?? [];
		existing.push(ranking);
		rankingsByKeyword.set(kw, existing);
	}

	// Find keywords with 2+ URLs ranking
	for (const [keyword, rankings] of rankingsByKeyword) {
		if (rankings.length < 2) continue;

		const uniqueUrls = [...new Set(rankings.map((r) => r.url))];
		if (uniqueUrls.length < 2) continue;

		const pagesInfo = uniqueUrls.map((url) => {
			const ranking = rankings.find((r) => r.url === url);
			const page = ctx.pages.find((p) => p.url === url);
			const signals: ("title" | "h1" | "content")[] = [];

			if (page?.title && hasWholeWordMatch(page.title, keyword)) {
				signals.push("title");
			}
			if (page?.h1 && hasWholeWordMatch(page.h1, keyword)) {
				signals.push("h1");
			}
			if (
				page?.content &&
				countWholeWordMatches(page.content.toLowerCase(), keyword) >=
					LIMITS.CANNIBALIZATION_MIN_CONTENT_MENTIONS
			) {
				signals.push("content");
			}

			return {
				url,
				position: ranking?.position ?? null,
				signals,
			};
		});

		const volume = rankings[0]?.searchVolume ?? 0;
		issues.push({
			keyword,
			searchVolume: volume,
			pages: pagesInfo,
			severity: "high",
		});
	}

	// Only report confirmed cannibalization (2+ URLs actually ranking)
	// Secondary detection (title/H1 matching heuristic) removed to reduce false positives

	return {
		ok: true,
		data: issues
			.sort((a, b) => b.searchVolume - a.searchVolume)
			.slice(0, LIMITS.MAX_CANNIBALIZATION_ISSUES),
	};
}

export const cannibalizationComponent: ComponentEntry<CannibalizationIssue[]> =
	{
		key: "cannibalization",
		dependencies: ["currentRankings"],
		run: runCannibalization,
		store: (results, data) => ({ ...results, cannibalizationIssues: data }),
	};

// ============================================================================
// Snippet Opportunities Component
// ============================================================================

function getHostname(url: string): string | null {
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
}

function getDifficulty(position: number): "easy" | "medium" | "hard" {
	if (position <= 3) return "easy";
	if (position <= 6) return "medium";
	return "hard";
}

async function runSnippetOpportunities(
	ctx: ComponentContext,
	results: ComponentResults,
): Promise<ComponentResult<SnippetOpportunity[]>> {
	if (ctx.tier.tier === "FREE" || ctx.tier.maxSnippets === 0) {
		return { ok: true, data: [] };
	}

	const currentRankings = results.currentRankings ?? [];
	const competitorGaps = results.competitorGaps ?? [];

	try {
		const opportunities: SnippetOpportunity[] = [];

		// Check top-ranking keywords (where we rank 1-10)
		const topRankings = currentRankings
			.filter((r) => r.position <= 10)
			.slice(
				0,
				Math.min(LIMITS.MAX_TOP_RANKINGS_FOR_SNIPPETS, ctx.tier.maxSnippets),
			);

		log.info({ count: topRankings.length }, "Checking snippet opportunities");

		const rankingResults = await Promise.allSettled(
			topRankings.map(async (ranking) => {
				const { featuredSnippet } = await dataForSeo.getSerpWithFeatures(
					ranking.keyword,
					"United States",
					"en",
					ctx.usage,
				);
				return { ranking, featuredSnippet };
			}),
		);

		for (const result of rankingResults) {
			if (result.status !== "fulfilled") continue;
			const { ranking, featuredSnippet } = result.value;
			if (!featuredSnippet) continue;

			const snippetHostname = getHostname(featuredSnippet.url);
			if (!snippetHostname) continue;

			const weHaveSnippet = snippetHostname.includes(ctx.hostname);
			if (weHaveSnippet) continue;

			opportunities.push({
				keyword: ranking.keyword,
				searchVolume: ranking.searchVolume,
				snippetType: featuredSnippet.type,
				currentHolder: featuredSnippet.url,
				yourPosition: ranking.position,
				difficulty: getDifficulty(ranking.position),
				snippetTitle: featuredSnippet.title,
				snippetContent: featuredSnippet.content,
			});
		}

		// Check competitor gap keywords for snippet steal opportunities
		const remainingSlots = ctx.tier.maxSnippets - opportunities.length;
		if (remainingSlots > 0) {
			const gapKeywords = competitorGaps
				.flatMap((g) => g.gapKeywords)
				.sort((a, b) => b.searchVolume - a.searchVolume)
				.slice(0, Math.min(10, remainingSlots));

			const gapResults = await Promise.allSettled(
				gapKeywords.map(async (gap) => {
					const { featuredSnippet } = await dataForSeo.getSerpWithFeatures(
						gap.keyword,
						"United States",
						"en",
						ctx.usage,
					);
					return { gap, featuredSnippet };
				}),
			);

			for (const result of gapResults) {
				if (result.status !== "fulfilled") continue;
				const { gap, featuredSnippet } = result.value;
				if (!featuredSnippet) continue;

				opportunities.push({
					keyword: gap.keyword,
					searchVolume: gap.searchVolume,
					snippetType: featuredSnippet.type,
					currentHolder: featuredSnippet.url,
					yourPosition: null,
					difficulty: "hard",
					snippetTitle: featuredSnippet.title,
					snippetContent: featuredSnippet.content,
				});
			}
		}

		log.info({ count: opportunities.length }, "Found snippet opportunities");

		return {
			ok: true,
			data: opportunities
				.sort((a, b) => b.searchVolume - a.searchVolume)
				.slice(0, ctx.tier.maxSnippets),
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		log.error({ error: message }, "Snippet opportunities failed");
		return { ok: false, error: message };
	}
}

export const snippetOpportunitiesComponent: ComponentEntry<
	SnippetOpportunity[]
> = {
	key: "snippetOpportunities",
	dependencies: ["currentRankings", "competitorAnalysis"],
	run: runSnippetOpportunities,
	store: (results, data) => ({ ...results, snippetOpportunities: data }),
};
