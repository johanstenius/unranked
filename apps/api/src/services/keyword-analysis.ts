/**
 * Keyword Analysis Service
 *
 * Fetches keywords from competitors, clusters them with AI,
 * and returns ClusterSuggestion[] for user selection.
 *
 * Fallback: If competitors have no keywords, expands seed keywords.
 */

import { createLogger } from "../lib/logger.js";
import type { ApiUsage } from "../types/api-usage.js";
import type { ClusterSuggestion } from "../types/audit-state.js";
import {
	type SemanticCluster,
	clusterKeywordsSemantic,
} from "./ai/anthropic.js";
import {
	type DomainKeyword,
	getDomainRankedKeywords,
	getRelatedKeywords,
} from "./seo/dataforseo.js";

const log = createLogger("keyword-analysis");

const MIN_KEYWORDS_FOR_CLUSTERING = 10;
const MAX_KEYWORDS_PER_COMPETITOR = 100;
const MAX_SEEDS_TO_EXPAND = 5;

type KeywordWithVolume = {
	keyword: string;
	volume: number;
};

export type KeywordAnalysisInput = {
	competitors: string[];
	seedKeywords: string[];
	usage?: ApiUsage;
};

export type KeywordAnalysisResult = {
	clusters: ClusterSuggestion[];
	source: "competitors" | "seeds";
	keywordCount: number;
};

/**
 * Analyze keywords from competitors or seed expansion, then cluster with AI.
 */
export async function analyzeKeywords(
	input: KeywordAnalysisInput,
): Promise<KeywordAnalysisResult> {
	const { competitors, seedKeywords, usage } = input;

	log.info(
		{ competitors: competitors.length, seeds: seedKeywords.length },
		"Starting keyword analysis",
	);

	// Try competitor keywords first
	let keywords = await fetchCompetitorKeywords(competitors, usage);
	let source: "competitors" | "seeds" = "competitors";

	// Fallback to seed expansion if not enough keywords
	if (keywords.length < MIN_KEYWORDS_FOR_CLUSTERING) {
		log.info(
			{ found: keywords.length, threshold: MIN_KEYWORDS_FOR_CLUSTERING },
			"Not enough competitor keywords, falling back to seed expansion",
		);
		keywords = await expandSeedKeywords(seedKeywords, usage);
		source = "seeds";
	}

	if (keywords.length === 0) {
		log.warn("No keywords found from any source");
		return { clusters: [], source, keywordCount: 0 };
	}

	// Cluster with AI
	const semanticClusters = await clusterKeywordsSemantic(
		keywords.map((k) => ({ keyword: k.keyword, searchVolume: k.volume })),
		usage,
	);

	// Convert to ClusterSuggestion format
	const clusters = convertToClusters(semanticClusters, keywords);

	log.info(
		{ keywords: keywords.length, clusters: clusters.length, source },
		"Keyword analysis complete",
	);

	return { clusters, source, keywordCount: keywords.length };
}

/**
 * Fetch keywords from all competitors in parallel, merge and dedupe.
 */
async function fetchCompetitorKeywords(
	competitors: string[],
	usage?: ApiUsage,
): Promise<KeywordWithVolume[]> {
	if (competitors.length === 0) return [];

	log.debug({ competitors }, "Fetching keywords from competitors");

	// Fetch from all competitors in parallel
	const results = await Promise.allSettled(
		competitors.map((domain) =>
			getDomainRankedKeywords(
				domain,
				{ limit: MAX_KEYWORDS_PER_COMPETITOR },
				usage,
			),
		),
	);

	// Collect all keywords
	const allKeywords: DomainKeyword[] = [];
	results.forEach((result, i) => {
		const domain = competitors[i];
		if (result.status === "fulfilled") {
			log.debug(
				{ domain, keywords: result.value.length },
				"Fetched competitor keywords",
			);
			allKeywords.push(...result.value);
		} else {
			log.warn(
				{ domain, error: result.reason },
				"Failed to fetch competitor keywords",
			);
		}
	});

	// Dedupe by keyword, keep highest volume
	return dedupeKeywords(allKeywords);
}

/**
 * Expand seed keywords using DataForSEO related keywords endpoint.
 */
async function expandSeedKeywords(
	seeds: string[],
	usage?: ApiUsage,
): Promise<KeywordWithVolume[]> {
	if (seeds.length === 0) return [];

	const seedsToExpand = seeds.slice(0, MAX_SEEDS_TO_EXPAND);
	log.debug({ seeds: seedsToExpand }, "Expanding seed keywords");

	// Fetch related keywords for each seed in parallel
	const results = await Promise.allSettled(
		seedsToExpand.map((seed) =>
			getRelatedKeywords(seed, undefined, undefined, usage),
		),
	);

	// Collect all keywords
	const allKeywords: KeywordWithVolume[] = [];
	results.forEach((result, i) => {
		const seed = seedsToExpand[i];
		if (result.status === "fulfilled") {
			log.debug(
				{ seed, keywords: result.value.length },
				"Expanded seed keyword",
			);
			allKeywords.push(
				...result.value.map((k) => ({
					keyword: k.keyword,
					volume: k.searchVolume,
				})),
			);
		} else {
			log.warn({ seed, error: result.reason }, "Failed to expand seed keyword");
		}
	});

	// Include original seeds with their expanded data
	// Dedupe in case seeds appear in related results
	return dedupeByKeyword(allKeywords);
}

/**
 * Dedupe DomainKeyword[] by keyword string, keeping highest volume.
 */
function dedupeKeywords(keywords: DomainKeyword[]): KeywordWithVolume[] {
	const seen = new Map<string, KeywordWithVolume>();

	for (const kw of keywords) {
		const key = kw.keyword.toLowerCase();
		const existing = seen.get(key);
		if (!existing || kw.searchVolume > existing.volume) {
			seen.set(key, { keyword: kw.keyword, volume: kw.searchVolume });
		}
	}

	return Array.from(seen.values());
}

/**
 * Dedupe KeywordWithVolume[] by keyword string, keeping highest volume.
 */
function dedupeByKeyword(keywords: KeywordWithVolume[]): KeywordWithVolume[] {
	const seen = new Map<string, KeywordWithVolume>();

	for (const kw of keywords) {
		const key = kw.keyword.toLowerCase();
		const existing = seen.get(key);
		if (!existing || kw.volume > existing.volume) {
			seen.set(key, kw);
		}
	}

	return Array.from(seen.values());
}

/**
 * Convert SemanticCluster[] to ClusterSuggestion[] with volumes.
 */
function convertToClusters(
	semanticClusters: SemanticCluster[],
	keywordData: KeywordWithVolume[],
): ClusterSuggestion[] {
	// Build lookup for keyword volumes
	const volumeLookup = new Map<string, number>();
	for (const kw of keywordData) {
		volumeLookup.set(kw.keyword.toLowerCase(), kw.volume);
	}

	return semanticClusters
		.map((cluster, index) => {
			const keywords = cluster.keywords.map((kw) => ({
				keyword: kw,
				volume: volumeLookup.get(kw.toLowerCase()) ?? 0,
			}));

			const totalVolume = keywords.reduce((sum, k) => sum + k.volume, 0);

			return {
				id: `cluster-${index}`,
				name: cluster.topic,
				keywords,
				totalVolume,
			};
		})
		.filter((c) => c.keywords.length > 0)
		.sort((a, b) => b.totalVolume - a.totalVolume);
}
