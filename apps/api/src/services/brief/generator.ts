import { createLogger } from "../../lib/logger.js";
import {
	type BriefStructure,
	type SearchIntent,
	generateBriefStructure,
} from "../ai/anthropic.js";
import type { CrawledPage } from "../crawler/types.js";
import type { Opportunity } from "../seo/analysis.js";
import { type KeywordCluster, clusterKeywords } from "../seo/clustering.js";
import * as dataForSeo from "../seo/dataforseo.js";
import { findLinkingSuggestions } from "../seo/internal-linking.js";

const log = createLogger("briefs");

export type GeneratedBrief = {
	keyword: string;
	searchVolume: number;
	difficulty: number;
	title: string;
	structure: BriefStructure;
	questions: string[];
	relatedKw: string[];
	competitors: Array<{
		url: string;
		title: string;
		summary: string;
	}>;
	suggestedInternalLinks: string[];
	clusteredKeywords: string[];
	totalClusterVolume: number;
	estimatedEffort: string;
	intent?: SearchIntent;
};

const EFFORT_MINUTES = {
	perH2: 20,
	perH3: 10,
	perQuestion: 5,
	baseResearch: 30,
} as const;

function estimateEffort(
	structure: BriefStructure,
	questions: string[],
	difficulty: number,
): string {
	const h2Count = structure.h2s.length;
	const h3Count = structure.h2s.reduce(
		(sum, h2) => sum + (h2.h3s?.length ?? 0),
		0,
	);

	const baseMinutes =
		h2Count * EFFORT_MINUTES.perH2 +
		h3Count * EFFORT_MINUTES.perH3 +
		questions.length * EFFORT_MINUTES.perQuestion +
		EFFORT_MINUTES.baseResearch;

	const difficultyMultiplier = 1 + difficulty / 200;
	const hours = (baseMinutes * difficultyMultiplier) / 60;

	if (hours <= 1) return "30min-1hr";
	if (hours <= 2) return "1-2 hours";
	if (hours <= 4) return "2-4 hours";
	if (hours <= 8) return "4-8 hours";
	return "8+ hours";
}

async function generateBriefFromCluster(
	cluster: KeywordCluster,
	productDesc: string | null,
	existingPages: CrawledPage[],
): Promise<GeneratedBrief> {
	const keyword = cluster.primaryKeyword;

	const [serpResults, relatedKeywords, questions] = await Promise.all([
		dataForSeo.getSerpResults(keyword),
		dataForSeo.getRelatedKeywords(keyword),
		dataForSeo.getPeopleAlsoAsk(keyword),
	]);

	const { title, structure } = await generateBriefStructure({
		keyword,
		productDesc,
		existingPages: existingPages.map((p) => ({ title: p.title, url: p.url })),
		topResults: serpResults.slice(0, 5),
		questions,
	});

	const competitors = serpResults.slice(0, 3).map((r) => ({
		url: r.url,
		title: r.title,
		summary: r.description,
	}));

	const suggestedInternalLinks = findLinkingSuggestions(keyword, existingPages);

	const primaryOpp = cluster.opportunities.find((o) => o.keyword === keyword);
	if (!primaryOpp) {
		throw new Error(`Primary keyword "${keyword}" not found in cluster`);
	}

	return {
		keyword,
		searchVolume: primaryOpp.searchVolume,
		difficulty: primaryOpp.difficulty,
		title,
		structure,
		questions,
		relatedKw: relatedKeywords.map((k) => k.keyword),
		competitors,
		suggestedInternalLinks,
		clusteredKeywords: cluster.keywords,
		totalClusterVolume: cluster.totalVolume,
		estimatedEffort: estimateEffort(
			structure,
			questions,
			primaryOpp.difficulty,
		),
		intent: primaryOpp.intent,
	};
}

export type GenerateBriefsResult = {
	briefs: GeneratedBrief[];
	failedCount: number;
	failedKeywords: string[];
};

const CONCURRENCY_LIMIT = 3;

async function processBatch(
	batch: KeywordCluster[],
	productDesc: string | null,
	existingPages: CrawledPage[],
): Promise<{ briefs: GeneratedBrief[]; failed: string[] }> {
	const results = await Promise.allSettled(
		batch.map((cluster) =>
			generateBriefFromCluster(cluster, productDesc, existingPages),
		),
	);

	const briefs: GeneratedBrief[] = [];
	const failed: string[] = [];

	results.forEach((result, i) => {
		if (result.status === "fulfilled") {
			briefs.push(result.value);
		} else {
			const keyword = batch[i]?.primaryKeyword ?? "unknown";
			log.error({ keyword, error: result.reason }, "Brief generation failed");
			failed.push(keyword);
		}
	});

	return { briefs, failed };
}

export async function generateBriefs(
	opportunities: Opportunity[],
	productDesc: string | null,
	existingPages: CrawledPage[],
	maxBriefs: number,
): Promise<GenerateBriefsResult> {
	const limit = maxBriefs < 0 ? Number.POSITIVE_INFINITY : maxBriefs;
	const limitLabel = maxBriefs === -1 ? "unlimited" : String(maxBriefs);

	log.info(
		{ maxBriefs: limitLabel, opportunities: opportunities.length },
		"Generating briefs",
	);

	log.debug("Clustering keywords");
	const clusters = await clusterKeywords(opportunities);
	log.debug(
		{ clusters: clusters.length, keywords: opportunities.length },
		"Created clusters",
	);

	const clustersToProcess = clusters.slice(0, limit);
	const allBriefs: GeneratedBrief[] = [];
	const allFailed: string[] = [];

	for (let i = 0; i < clustersToProcess.length; i += CONCURRENCY_LIMIT) {
		const batch = clustersToProcess.slice(i, i + CONCURRENCY_LIMIT);
		log.debug(
			{
				batch: Math.floor(i / CONCURRENCY_LIMIT) + 1,
				totalBatches: Math.ceil(clustersToProcess.length / CONCURRENCY_LIMIT),
				batchSize: batch.length,
			},
			"Processing batch",
		);

		const { briefs, failed } = await processBatch(
			batch,
			productDesc,
			existingPages,
		);
		allBriefs.push(...briefs);
		allFailed.push(...failed);
	}

	log.info(
		{ generated: allBriefs.length, failed: allFailed.length },
		"Briefs generation complete",
	);

	return {
		briefs: allBriefs,
		failedCount: allFailed.length,
		failedKeywords: allFailed,
	};
}
