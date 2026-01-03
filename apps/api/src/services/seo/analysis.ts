import { createLogger } from "../../lib/logger.js";
import {
	type QuickWinSuggestions,
	type SearchIntent,
	type SemanticCluster,
	classifyKeywordIntents,
	clusterKeywordsSemantic,
	generateQuickWinSuggestions,
} from "../ai/anthropic.js";
import type { CrawledPage, RedirectChain } from "../crawler/types.js";
import * as dataForSeo from "./dataforseo.js";

const log = createLogger("analysis");
import type { DiscoveredCompetitor } from "./dataforseo.js";
import { detectDuplicateContent } from "./duplicate-detection.js";
import {
	type InternalLinkingIssues,
	analyzeInternalLinking,
} from "./internal-linking.js";
import { countWholeWordMatches, hasWholeWordMatch } from "./text-utils.js";

const TECHNICAL_SECTIONS = new Set([
	"/docs",
	"/api",
	"/reference",
	"/sdk",
	"/developers",
	"/documentation",
]);

const SEVERITY = {
	HIGH: "high",
	MEDIUM: "medium",
	LOW: "low",
} as const;
type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

const THRESHOLDS = {
	readability: { technical: 12, general: 8 },
	title: { warning: 60, error: 70 },
	metaDesc: { warning: 155, error: 170 },
	wordCount: { critical: 100, thin: 300, short: 500 },
	cannibalization: { minContentMentions: 5 },
} as const;

function getReadabilityThreshold(page: CrawledPage): number {
	const isTechnicalSection = TECHNICAL_SECTIONS.has(page.section);
	const hasCode = page.codeBlockCount > 0;

	if (isTechnicalSection || hasCode) return THRESHOLDS.readability.technical;
	return THRESHOLDS.readability.general;
}

const LIMITS = {
	EXTRACTED_KEYWORDS: 50,
	MIN_SEARCH_VOLUME: 50,
	MAX_OPPORTUNITIES: 50,
	QUICK_WIN_CANDIDATES: 10,
	AI_QUICK_WINS: 5,
	MAX_COMPETITORS: 3,
	GAP_KEYWORDS_PER_COMPETITOR: 50,
	COMMON_KEYWORDS_PER_COMPETITOR: 10,
	TOP_COMPETITORS_FOR_AI: 3,
	MAX_CANNIBALIZATION_ISSUES: 20,
	MAX_SNIPPET_OPPORTUNITIES: 20,
	MAX_TOP_RANKINGS_FOR_SNIPPETS: 15,
	REALISTIC_DIFFICULTY: 45,
	QUICK_WIN_MAX_DIFFICULTY: 30,
	// Log scale multiplier for normalizing impact scores to 0-100
	IMPACT_SCORE_SCALE: 30,
	// Seed expansion thresholds
	SEED_MIN_VOLUME: 300,
	SEED_MAX_POSITION: 30,
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

export type OpportunitySource =
	| "competitor_gap"
	| "seed_expansion"
	| "content_extraction";

export type Opportunity = {
	keyword: string;
	searchVolume: number;
	difficulty: number;
	impactScore: number;
	reason: string;
	competitorUrl?: string;
	intent?: SearchIntent;
	isQuickWin?: boolean;
	estimatedTraffic?: number;
	competitorPosition?: number;
	cluster?: string;
	source?: OpportunitySource;
};

export type CurrentRanking = {
	url: string;
	keyword: string;
	position: number;
	searchVolume: number;
	estimatedTraffic: number;
};

export type TechnicalIssue = {
	url: string;
	issue: string;
	severity: Severity;
};

export type QuickWin = {
	url: string;
	keyword: string;
	currentPosition: number;
	suggestions: string[];
	aiSuggestions?: QuickWinSuggestions;
};

export type CompetitorGap = {
	competitor: string;
	totalKeywords: number;
	gapKeywords: Array<{
		keyword: string;
		searchVolume: number;
		difficulty: number;
		competitorPosition: number;
		competitorUrl: string;
	}>;
	commonKeywords: Array<{
		keyword: string;
		yourPosition: number;
		theirPosition: number;
	}>;
};

export type CannibalizationIssue = {
	keyword: string;
	searchVolume: number;
	pages: Array<{
		url: string;
		position: number | null;
		signals: ("title" | "h1" | "content")[];
	}>;
	severity: "high" | "medium";
};

export type SnippetOpportunity = {
	keyword: string;
	searchVolume: number;
	snippetType: "paragraph" | "list" | "table" | "video";
	currentHolder: string;
	yourPosition: number | null;
	difficulty: "easy" | "medium" | "hard";
	snippetTitle: string;
	snippetContent: string;
};

export type OpportunityCluster = {
	topic: string;
	opportunities: Opportunity[];
	totalVolume: number;
	avgDifficulty: number;
	suggestedAction: "create" | "optimize" | "expand";
	existingPage?: string;
};

export type AnalysisResult = {
	currentRankings: CurrentRanking[];
	opportunities: Opportunity[];
	opportunityClusters: OpportunityCluster[];
	quickWins: QuickWin[];
	technicalIssues: TechnicalIssue[];
	internalLinkingIssues: InternalLinkingIssues;
	competitorGaps: CompetitorGap[];
	cannibalizationIssues: CannibalizationIssue[];
	snippetOpportunities: SnippetOpportunity[];
	discoveredCompetitors: DiscoveredCompetitor[];
};

function getCTR(position: number): number {
	if (position > 100) return 0;
	return CTR_BY_POSITION[position] ?? 0.01 / position;
}

// Position bonus: competitor in top 10 = 1.5x, top 20 = 1.2x, top 30 = 1.1x
function getPositionBonus(competitorPosition: number | undefined): number {
	if (!competitorPosition) return 1;
	if (competitorPosition <= 10) return 1.5;
	if (competitorPosition <= 20) return 1.2;
	if (competitorPosition <= 30) return 1.1;
	return 1;
}

// New scoring: volume × (1 / difficulty) × positionBonus
// Normalized to 0-100 scale for readability
function calculateImpactScore(
	volume: number,
	difficulty: number,
	competitorPosition?: number,
): number {
	// Prevent division by zero, floor difficulty at 1
	const safeDifficulty = Math.max(difficulty, 1);
	const positionBonus = getPositionBonus(competitorPosition);

	// Base score: volume * inverse difficulty
	const rawScore = volume * (1 / safeDifficulty) * positionBonus;

	// Normalize to 0-100 scale (log scale to handle wide range)
	// A typical high-value keyword might have vol=5000, diff=30, bonus=1.5
	// = 5000 * (1/30) * 1.5 = 250
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
	// Quick win: low difficulty AND competitor isn't dominating (position > 10)
	return (
		difficulty <= LIMITS.QUICK_WIN_MAX_DIFFICULTY &&
		(!competitorPosition || competitorPosition > 10)
	);
}

// Estimate potential monthly traffic if ranking top 3
function estimateTrafficGain(volume: number): number {
	// Assume average of positions 1-3 CTR
	const ctr1 = CTR_BY_POSITION[1] ?? 0.28;
	const ctr2 = CTR_BY_POSITION[2] ?? 0.15;
	const ctr3 = CTR_BY_POSITION[3] ?? 0.1;
	const avgTopCTR = (ctr1 + ctr2 + ctr3) / 3;
	return Math.round(volume * avgTopCTR);
}

// Find existing page that could target a topic cluster
function findMatchingPage(
	clusterKeywords: string[],
	pages: CrawledPage[],
): string | undefined {
	const keywordsLower = clusterKeywords.map((k) => k.toLowerCase());

	for (const page of pages) {
		const titleLower = page.title?.toLowerCase() ?? "";
		const h1Lower = page.h1?.toLowerCase() ?? "";

		// Check if any keyword appears in title or H1
		for (const kw of keywordsLower) {
			if (titleLower.includes(kw) || h1Lower.includes(kw)) {
				return page.url;
			}
		}
	}
	return undefined;
}

// Determine suggested action based on existing page and rankings
function determineSuggestedAction(
	existingPage: string | undefined,
	clusterKeywords: string[],
	currentRankings: CurrentRanking[],
): "create" | "optimize" | "expand" {
	if (!existingPage) return "create";

	// Check if we rank for any keyword in this cluster
	const rankedKeywords = currentRankings.filter((r) =>
		clusterKeywords.some((k) => k.toLowerCase() === r.keyword.toLowerCase()),
	);

	if (rankedKeywords.length === 0) return "optimize";

	// If we rank well (top 10), suggest expanding
	const bestPosition = Math.min(...rankedKeywords.map((r) => r.position));
	return bestPosition <= 10 ? "expand" : "optimize";
}

// Create opportunity clusters using semantic AI clustering
async function createOpportunityClusters(
	opportunities: Opportunity[],
	pages: CrawledPage[],
	currentRankings: CurrentRanking[],
): Promise<OpportunityCluster[]> {
	if (opportunities.length === 0) return [];

	// Call AI for semantic clustering
	const keywords = opportunities.map((o) => ({
		keyword: o.keyword,
		searchVolume: o.searchVolume,
	}));

	const semanticClusters = await clusterKeywordsSemantic(keywords);

	// Map opportunities by keyword for quick lookup
	const oppsByKeyword = new Map<string, Opportunity>();
	for (const opp of opportunities) {
		oppsByKeyword.set(opp.keyword.toLowerCase(), opp);
	}

	const clusters: OpportunityCluster[] = [];

	for (const sc of semanticClusters) {
		// Get opportunities for this cluster (create copies to avoid mutation)
		const clusterOpps: Opportunity[] = [];
		for (const kw of sc.keywords) {
			const opp = oppsByKeyword.get(kw.toLowerCase());
			if (opp) {
				clusterOpps.push({ ...opp, cluster: sc.topic });
			}
		}

		if (clusterOpps.length === 0) continue;

		// Calculate aggregate stats
		const totalVolume = clusterOpps.reduce((sum, o) => sum + o.searchVolume, 0);
		const avgDifficulty =
			clusterOpps.reduce((sum, o) => sum + o.difficulty, 0) /
			clusterOpps.length;

		// Find existing page and determine action
		const existingPage = findMatchingPage(sc.keywords, pages);
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
	return clusters.sort((a, b) => b.totalVolume - a.totalVolume);
}

// Legacy function - still used for flat opportunity list
function deduplicateOpportunities(opportunities: Opportunity[]): Opportunity[] {
	const seen = new Set<string>();
	const result: Opportunity[] = [];

	for (const opp of opportunities) {
		const key = opp.keyword.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			result.push(opp);
		}
	}

	return result.sort((a, b) => b.impactScore - a.impactScore);
}

function extractKeywordsFromContent(pages: CrawledPage[]): string[] {
	const keywords = new Set<string>();

	for (const page of pages) {
		for (const text of [page.title, page.h1]) {
			if (!text) continue;
			const words = text.toLowerCase().split(/\s+/);
			for (let i = 0; i < words.length - 1; i++) {
				keywords.add(`${words[i]} ${words[i + 1]}`);
			}
		}
	}

	return [...keywords].slice(0, LIMITS.EXTRACTED_KEYWORDS);
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

function findTechnicalIssues(pages: CrawledPage[]): TechnicalIssue[] {
	const issues: TechnicalIssue[] = [];
	const titlesByPage = new Map<string, string>();

	// First pass: collect titles for duplicate detection
	// Skip pages with canonical pointing elsewhere (they defer to canonical page)
	for (const page of pages) {
		if (page.title && !hasDifferentCanonical(page)) {
			titlesByPage.set(page.url, page.title.toLowerCase().trim());
		}
	}

	// Count duplicates
	const titleCounts = new Map<string, number>();
	for (const title of titlesByPage.values()) {
		titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
	}

	for (const page of pages) {
		// Title checks
		if (!page.title) {
			issues.push({
				url: page.url,
				issue: "Missing title tag",
				severity: SEVERITY.HIGH,
			});
		} else if (!hasDifferentCanonical(page)) {
			// Skip SEO meta checks for pages with canonical pointing elsewhere
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
			}
			const normalizedTitle = page.title.toLowerCase().trim();
			if ((titleCounts.get(normalizedTitle) || 0) > 1) {
				issues.push({
					url: page.url,
					issue: "Duplicate title tag",
					severity: SEVERITY.MEDIUM,
				});
			}
		}

		// Meta description checks (skip for pages with canonical pointing elsewhere)
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
					severity: SEVERITY.MEDIUM,
				});
			} else if (page.metaDescription.length > THRESHOLDS.metaDesc.warning) {
				issues.push({
					url: page.url,
					issue: `Meta description may be truncated (${THRESHOLDS.metaDesc.warning}-${THRESHOLDS.metaDesc.error} characters)`,
					severity: SEVERITY.LOW,
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
		} else if (page.h2s && page.h2s.length === 0) {
			// No heading structure
			issues.push({
				url: page.url,
				issue: "No H2 headings (poor structure)",
				severity: SEVERITY.LOW,
			});
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

		// Missing Schema.org / JSON-LD
		if (!page.hasSchemaOrg) {
			issues.push({
				url: page.url,
				issue: "No structured data (Schema.org/JSON-LD)",
				severity: SEVERITY.MEDIUM,
			});
		}

		// Missing viewport meta tag
		if (!page.hasViewport) {
			issues.push({
				url: page.url,
				issue: "Missing viewport meta tag (mobile-friendliness)",
				severity: SEVERITY.MEDIUM,
			});
		}

		// Readability check - threshold varies by content type
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

		// Heading hierarchy checks
		if (page.h1Count && page.h1Count > 1) {
			issues.push({
				url: page.url,
				issue: `Multiple H1 tags (${page.h1Count} found, should be 1)`,
				severity: SEVERITY.MEDIUM,
			});
		}

		// Check for skipped heading levels (H1 → H3 without H2)
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

		// Schema.org validation and recommendations
		if (page.hasSchemaOrg && page.schemaTypes && page.schemaTypes.length > 0) {
			const types = page.schemaTypes.map((t) => t.toLowerCase());

			// Check for BreadcrumbList (good for navigation in SERPs)
			const hasBreadcrumb = types.some((t) => t.includes("breadcrumb"));
			const isDeepPage = page.url.split("/").length > 4;
			if (isDeepPage && !hasBreadcrumb) {
				issues.push({
					url: page.url,
					issue: "Missing BreadcrumbList schema (recommended for deep pages)",
					severity: SEVERITY.LOW,
				});
			}
		} else if (!page.hasSchemaOrg) {
			// Recommend schema for content-heavy pages
			if (page.wordCount > 300) {
				// Already flagged by "No structured data" check above
			}
		}
	}

	return issues;
}

function buildInitialOpportunities(
	keywordData: dataForSeo.KeywordData[],
	rankedKeywords: Set<string>,
): Opportunity[] {
	return keywordData
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
}

async function expandFromSeeds(
	currentRankings: CurrentRanking[],
	rankedKeywords: Set<string>,
	maxSeeds: number,
): Promise<Opportunity[]> {
	if (maxSeeds === 0) return [];

	// Pick top keywords with decent volume and position as seeds
	const seeds = currentRankings
		.filter(
			(r) =>
				r.searchVolume > LIMITS.SEED_MIN_VOLUME &&
				r.position < LIMITS.SEED_MAX_POSITION,
		)
		.sort((a, b) => b.searchVolume - a.searchVolume)
		.slice(0, maxSeeds)
		.map((r) => r.keyword);

	if (seeds.length === 0) {
		log.info(" No suitable seeds found for expansion");
		return [];
	}

	log.info(
		`[analysis] Expanding from ${seeds.length} seeds: ${seeds.join(", ")}`,
	);

	const expansionResults = await Promise.all(
		seeds.map(async (seed) => {
			try {
				const related = await dataForSeo.getRelatedKeywords(seed);
				return { seed, related };
			} catch (error) {
				log.error({ err: error, seed }, "Seed expansion failed");
				return { seed, related: [] };
			}
		}),
	);

	const opportunities: Opportunity[] = [];
	const seenKeywords = new Set<string>();

	for (const { seed, related } of expansionResults) {
		for (const kw of related) {
			const keyLower = kw.keyword.toLowerCase();
			// Skip if already ranking or already added
			if (rankedKeywords.has(keyLower) || seenKeywords.has(keyLower)) {
				continue;
			}
			// Skip low volume
			if (kw.searchVolume < LIMITS.MIN_SEARCH_VOLUME) {
				continue;
			}
			seenKeywords.add(keyLower);
			opportunities.push({
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

	log.info(
		`[analysis] Seed expansion found ${opportunities.length} new opportunities`,
	);
	return opportunities.sort((a, b) => b.impactScore - a.impactScore);
}

async function generateAiSuggestionsForQuickWin(
	candidate: CurrentRanking,
	page: CrawledPage,
	allPages: CrawledPage[],
): Promise<QuickWinSuggestions | null> {
	try {
		const [serpResults, questions] = await Promise.all([
			dataForSeo.getSerpResults(candidate.keyword),
			dataForSeo.getPeopleAlsoAsk(candidate.keyword),
		]);

		return await generateQuickWinSuggestions({
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
		});
	} catch (error) {
		log.error({ err: error, url: candidate.url }, "AI suggestion failed");
		return null;
	}
}

async function analyzeQuickWins(
	currentRankings: CurrentRanking[],
	pages: CrawledPage[],
): Promise<QuickWin[]> {
	const pagesByUrl = new Map(pages.map((p) => [p.url, p]));

	// Sort by traffic gain potential: volume * (top3 CTR - current CTR)
	// Higher volume + closer to top = more potential
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
			return potentialB - potentialA; // Higher potential first
		})
		.slice(0, LIMITS.QUICK_WIN_CANDIDATES);

	const aiCandidates = candidates.slice(0, LIMITS.AI_QUICK_WINS);
	const nonAiCandidates = candidates.slice(LIMITS.AI_QUICK_WINS);

	log.info(
		`[analysis] Generating AI suggestions for ${aiCandidates.length} quick wins`,
	);

	const aiResults = await Promise.all(
		aiCandidates.map(async (candidate) => {
			const page = pagesByUrl.get(candidate.url);
			if (!page) return { candidate, suggestions: null };

			const suggestions = await generateAiSuggestionsForQuickWin(
				candidate,
				page,
				pages,
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

	return quickWins;
}

function normalizeCompetitorInput(input: string): string | null {
	const trimmed = input.trim().toLowerCase();
	if (!trimmed) return null;

	// Already a valid URL
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		try {
			new URL(trimmed);
			return trimmed;
		} catch {
			return null;
		}
	}

	// Looks like a domain (has a dot) - add https://
	if (trimmed.includes(".")) {
		try {
			const url = `https://${trimmed}`;
			new URL(url);
			return url;
		} catch {
			return null;
		}
	}

	// Just a name without domain - can't reliably guess
	log.info(
		`[analysis] Skipping competitor "${input}" - needs full domain (e.g., ${input}.com)`,
	);
	return null;
}

async function analyzeCompetitorGaps(
	competitorInputs: string[],
	currentRankings: CurrentRanking[],
	existingOpportunities: Opportunity[],
): Promise<{ gaps: CompetitorGap[]; newOpportunities: Opportunity[] }> {
	if (competitorInputs.length === 0) {
		return { gaps: [], newOpportunities: [] };
	}

	// Normalize inputs to URLs
	const competitorUrls = competitorInputs
		.map(normalizeCompetitorInput)
		.filter((url): url is string => url !== null);

	if (competitorUrls.length === 0) {
		log.info(
			"[analysis] No valid competitor URLs - ensure domains include TLD (e.g., resend.com)",
		);
		return { gaps: [], newOpportunities: [] };
	}

	const urlsToAnalyze = competitorUrls.slice(0, LIMITS.MAX_COMPETITORS);
	log.info(
		`[analysis] Analyzing ${urlsToAnalyze.length} competitors: ${urlsToAnalyze.join(", ")}`,
	);

	// Fetch all competitor keywords in parallel
	const competitorResults = await Promise.all(
		urlsToAnalyze.map(async (competitorUrl) => {
			try {
				const domain = new URL(competitorUrl).hostname;
				const keywords = await dataForSeo.getDomainRankedKeywords(domain, {
					limit: 200,
					maxPosition: 30,
					minVolume: LIMITS.MIN_SEARCH_VOLUME,
					maxDifficulty: LIMITS.REALISTIC_DIFFICULTY,
				});
				return { domain, keywords };
			} catch (error) {
				log.error(
					{ err: error, competitorUrl },
					"Failed to analyze competitor",
				);
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

	// Process results sequentially (mutations to existingOpportunities)
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
					// Recalculate score with position bonus
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

		// Sort gap keywords by impact potential (new scoring)
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
			`[analysis] ${domain}: ${gapKeywords.length} gap keywords, ${commonKeywords.length} common`,
		);
	}

	return { gaps, newOpportunities };
}

function detectCannibalization(
	pages: CrawledPage[],
	currentRankings: CurrentRanking[],
	_keywordData: dataForSeo.KeywordData[],
): CannibalizationIssue[] {
	const issues: CannibalizationIssue[] = [];
	const seenKeywords = new Set<string>();

	// Primary detection: Multiple URLs ranking for same keyword (confirmed cannibalization)
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

		// Get unique URLs (DataForSEO might return same URL multiple times)
		const uniqueUrls = [...new Set(rankings.map((r) => r.url))];
		if (uniqueUrls.length < 2) continue;

		seenKeywords.add(keyword);

		// Build page info with signals from content analysis
		const pagesInfo = uniqueUrls.map((url) => {
			const ranking = rankings.find((r) => r.url === url);
			const page = pages.find((p) => p.url === url);
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
					THRESHOLDS.cannibalization.minContentMentions
			) {
				signals.push("content");
			}

			return {
				url,
				position: ranking?.position ?? null,
				signals,
			};
		});

		// Both pages ranking = confirmed cannibalization, always high severity
		const volume = rankings[0]?.searchVolume ?? 0;
		issues.push({
			keyword,
			searchVolume: volume,
			pages: pagesInfo,
			severity: SEVERITY.HIGH,
		});
	}

	// Secondary detection: Pages targeting same keyword but only one ranks (potential cannibalization)
	// This catches issues before they become confirmed in SERPs
	const keywordToTargetingPages = new Map<
		string,
		Array<{ url: string; signals: ("title" | "h1" | "content")[] }>
	>();

	// Build a set of keywords we have volume data for
	const volumeByKeyword = new Map(
		currentRankings.map((r) => [r.keyword.toLowerCase(), r.searchVolume]),
	);

	// Check each page's title/h1 for potential targeting
	for (const page of pages) {
		const titleWords = page.title?.toLowerCase().split(/\s+/) ?? [];
		const h1Words = page.h1?.toLowerCase().split(/\s+/) ?? [];

		// Extract potential keywords (2-4 word phrases from title/h1)
		const potentialKeywords = new Set<string>();
		for (const words of [titleWords, h1Words]) {
			for (let len = 2; len <= 4; len++) {
				for (let i = 0; i <= words.length - len; i++) {
					const phrase = words.slice(i, i + len).join(" ");
					if (volumeByKeyword.has(phrase)) {
						potentialKeywords.add(phrase);
					}
				}
			}
		}

		for (const keyword of potentialKeywords) {
			if (seenKeywords.has(keyword)) continue; // Already found in primary detection

			const signals: ("title" | "h1" | "content")[] = [];
			if (page.title && hasWholeWordMatch(page.title, keyword)) {
				signals.push("title");
			}
			if (page.h1 && hasWholeWordMatch(page.h1, keyword)) {
				signals.push("h1");
			}

			if (signals.length > 0) {
				const existing = keywordToTargetingPages.get(keyword) ?? [];
				existing.push({ url: page.url, signals });
				keywordToTargetingPages.set(keyword, existing);
			}
		}
	}

	// Find keywords targeted by 2+ pages
	for (const [keyword, targetingPages] of keywordToTargetingPages) {
		if (targetingPages.length < 2) continue;

		// Check if any of these pages actually rank
		const rankings = currentRankings.filter(
			(r) => r.keyword.toLowerCase() === keyword,
		);
		if (rankings.length === 0) continue;

		const pagesWithRankings = targetingPages.map((p) => ({
			...p,
			position: rankings.find((r) => r.url === p.url)?.position ?? null,
		}));

		// Only one ranks but multiple target = potential issue (medium severity)
		const rankingCount = pagesWithRankings.filter((p) => p.position).length;
		if (rankingCount >= 2) continue; // This should have been caught in primary detection

		issues.push({
			keyword,
			searchVolume: volumeByKeyword.get(keyword) ?? 0,
			pages: pagesWithRankings,
			severity: SEVERITY.MEDIUM,
		});
	}

	return issues
		.sort((a, b) => b.searchVolume - a.searchVolume)
		.slice(0, LIMITS.MAX_CANNIBALIZATION_ISSUES);
}

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

async function analyzeSnippetOpportunities(
	currentRankings: CurrentRanking[],
	competitorGaps: CompetitorGap[],
	siteHostname: string,
): Promise<SnippetOpportunity[]> {
	const opportunities: SnippetOpportunity[] = [];

	// Check top-ranking keywords for snippet opportunities (where we rank 1-10)
	const topRankings = currentRankings
		.filter((r) => r.position <= 10)
		.slice(0, LIMITS.MAX_TOP_RANKINGS_FOR_SNIPPETS);

	// Fetch in parallel with concurrency limit
	const rankingResults = await Promise.allSettled(
		topRankings.map(async (ranking) => {
			const { featuredSnippet } = await dataForSeo.getSerpWithFeatures(
				ranking.keyword,
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

		const weHaveSnippet = snippetHostname.includes(siteHostname);
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

	// Check competitor gap keywords for snippet opportunities (steal opportunities)
	const gapKeywords = competitorGaps
		.flatMap((g) => g.gapKeywords)
		.sort((a, b) => b.searchVolume - a.searchVolume)
		.slice(0, 10);

	const gapResults = await Promise.allSettled(
		gapKeywords.map(async (gap) => {
			const { featuredSnippet } = await dataForSeo.getSerpWithFeatures(
				gap.keyword,
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

	return opportunities
		.sort((a, b) => b.searchVolume - a.searchVolume)
		.slice(0, LIMITS.MAX_SNIPPET_OPPORTUNITIES);
}

export type AnalyzeSiteOptions = {
	maxCompetitors?: number;
	maxSeeds?: number;
	isFreeTier?: boolean;
	hasRobotsTxt?: boolean;
	hasSitemap?: boolean;
	redirectChains?: RedirectChain[];
};

export async function analyzeSite(
	pages: CrawledPage[],
	competitorUrls: string[],
	options: AnalyzeSiteOptions = {},
): Promise<AnalysisResult> {
	const {
		maxCompetitors = 3,
		maxSeeds = 5,
		isFreeTier = false,
		hasRobotsTxt,
		hasSitemap,
		redirectChains = [],
	} = options;

	log.info(
		`[analysis] Starting analysis of ${pages.length} pages (freeTier: ${isFreeTier})`,
	);

	// Technical analysis (always runs - no external API)
	const technicalIssues = findTechnicalIssues(pages);

	// Site-level checks (use first page URL as representative)
	const siteUrl = pages[0]?.url;
	if (siteUrl) {
		if (hasRobotsTxt === false) {
			technicalIssues.push({
				url: siteUrl,
				issue: "Missing robots.txt file",
				severity: SEVERITY.MEDIUM,
			});
		}
		if (hasSitemap === false) {
			technicalIssues.push({
				url: siteUrl,
				issue: "Missing XML sitemap",
				severity: SEVERITY.MEDIUM,
			});
		}
	}

	// Redirect chain issues
	for (const chain of redirectChains) {
		technicalIssues.push({
			url: chain.originalUrl,
			issue: `Redirect chain with ${chain.hops} hops (${chain.chain.join(" → ")})`,
			severity: chain.hops >= 3 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
		});
	}

	const internalLinkingIssues = analyzeInternalLinking(pages);

	for (const orphanUrl of internalLinkingIssues.orphanPages) {
		technicalIssues.push({
			url: orphanUrl,
			issue: "Orphan page (no internal links pointing to it)",
			severity: SEVERITY.MEDIUM,
		});
	}

	for (const underlinked of internalLinkingIssues.underlinkedPages) {
		technicalIssues.push({
			url: underlinked.url,
			issue: `Underlinked page (only ${underlinked.incomingLinks} internal link${underlinked.incomingLinks === 1 ? "" : "s"})`,
			severity: SEVERITY.LOW,
		});
	}

	// Broken internal link detection
	// Note: We can only detect links pointing to pages that weren't crawled.
	// This may include false positives if page limit was reached before crawling all pages.
	// For high confidence, the crawler also does HEAD requests on uncrawled links.
	const crawledUrls = new Set(pages.map((p) => p.url));
	const allOutboundLinks = new Set<string>();
	for (const page of pages) {
		for (const link of page.outboundLinks) {
			allOutboundLinks.add(link);
		}
	}
	// A link is potentially broken if: multiple pages link to it AND it wasn't crawled
	// Single references could be typos, but multiple = more likely a real broken page
	const linkCounts = new Map<string, { count: number; sources: string[] }>();
	for (const page of pages) {
		for (const link of page.outboundLinks) {
			if (!crawledUrls.has(link)) {
				const existing = linkCounts.get(link) ?? { count: 0, sources: [] };
				existing.count++;
				if (existing.sources.length < 3) existing.sources.push(page.url);
				linkCounts.set(link, existing);
			}
		}
	}
	// Only report links referenced by 2+ pages as potentially broken
	for (const [brokenLink, { count, sources }] of linkCounts) {
		if (count >= 2) {
			technicalIssues.push({
				url: sources[0] ?? "",
				issue: `Potentially broken link: ${brokenLink} (linked from ${count} pages)`,
				severity: SEVERITY.MEDIUM,
			});
		}
	}

	// Duplicate content detection
	const duplicateGroups = detectDuplicateContent(pages);
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

	// FREE tier: technical analysis only, no DataForSEO/AI
	if (isFreeTier) {
		log.info(" FREE tier - skipping DataForSEO/AI calls");
		return {
			currentRankings: [],
			opportunities: [],
			opportunityClusters: [],
			quickWins: [],
			technicalIssues,
			internalLinkingIssues,
			competitorGaps: [],
			cannibalizationIssues: [],
			snippetOpportunities: [],
			discoveredCompetitors: [],
		};
	}

	// Paid tiers: full analysis with DataForSEO and AI
	const firstPageUrl = pages[0]?.url;
	if (!firstPageUrl) {
		throw new Error("No pages to analyze");
	}
	const hostname = new URL(firstPageUrl).hostname;

	// Get actual domain rankings (not guessing from content)
	log.info(` Fetching domain rankings for ${hostname}...`);
	const domainRankings = await dataForSeo.getDomainRankedKeywords(hostname, {
		limit: 100,
		maxPosition: 100,
		minVolume: 10,
	});
	log.info(` Found ${domainRankings.length} ranked keywords`);

	const currentRankings: CurrentRanking[] = domainRankings.map((r) => ({
		url: r.url,
		keyword: r.keyword,
		position: r.position,
		searchVolume: r.searchVolume,
		estimatedTraffic: Math.round(r.searchVolume * getCTR(r.position)),
	}));

	const rankedKeywords = new Set(
		currentRankings.map((r) => r.keyword.toLowerCase()),
	);

	// Extract keywords from content for opportunity discovery
	const extractedKeywords = extractKeywordsFromContent(pages);
	log.info(` Extracted ${extractedKeywords.length} keywords`);

	log.info(" Fetching keyword data from DataForSEO...");
	const keywordData = await dataForSeo.getKeywordData(extractedKeywords);
	log.info(` Got data for ${keywordData.length} keywords`);

	const opportunities = buildInitialOpportunities(keywordData, rankedKeywords);

	const quickWins = await analyzeQuickWins(currentRankings, pages);

	const cannibalizationIssues = detectCannibalization(
		pages,
		currentRankings,
		keywordData,
	);

	// Skip competitor analysis if tier doesn't allow it
	let discoveredCompetitors: DiscoveredCompetitor[] = [];
	let competitorGaps: CompetitorGap[] = [];
	let newOpportunities: Opportunity[] = [];

	if (maxCompetitors > 0) {
		let finalCompetitorUrls = competitorUrls.slice(0, maxCompetitors);

		// Auto-discover competitors if none provided
		if (finalCompetitorUrls.length === 0) {
			try {
				log.info(` Auto-discovering competitors for ${hostname}`);
				discoveredCompetitors = await dataForSeo.discoverCompetitors(hostname, {
					limit: 5,
				});

				if (discoveredCompetitors.length > 0) {
					log.info(
						`[analysis] Discovered ${discoveredCompetitors.length} competitors: ${discoveredCompetitors.map((c) => c.domain).join(", ")}`,
					);
					finalCompetitorUrls = discoveredCompetitors
						.slice(0, maxCompetitors)
						.map((c) => `https://${c.domain}`);
				}
			} catch (error) {
				log.error({ err: error }, "Failed to auto-discover competitors");
			}
		}

		const gapResult = await analyzeCompetitorGaps(
			finalCompetitorUrls,
			currentRankings,
			opportunities,
		);
		competitorGaps = gapResult.gaps;
		newOpportunities = gapResult.newOpportunities;
	} else {
		log.info(" Skipping competitor analysis (tier limit: 0)");
	}

	// Seed expansion: find related keywords from top rankings
	let seedOpportunities: Opportunity[] = [];
	if (maxSeeds > 0) {
		seedOpportunities = await expandFromSeeds(
			currentRankings,
			rankedKeywords,
			maxSeeds,
		);
	}

	// Merge and deduplicate opportunities
	const mergedOpportunities = [
		...opportunities,
		...newOpportunities,
		...seedOpportunities,
	];
	const deduped = deduplicateOpportunities(mergedOpportunities);
	const allOpportunities = deduped.slice(0, LIMITS.MAX_OPPORTUNITIES);

	// Count quick wins for logging
	const quickWinCount = allOpportunities.filter((o) => o.isQuickWin).length;
	log.info(
		`[analysis] ${allOpportunities.length} opportunities (${quickWinCount} quick wins)`,
	);

	// Classify intents
	log.info(
		`[analysis] Classifying intents for ${allOpportunities.length} opportunities...`,
	);
	const intentMap = await classifyKeywordIntents(
		allOpportunities.map((o) => o.keyword),
	);
	for (const opp of allOpportunities) {
		opp.intent = intentMap.get(opp.keyword.toLowerCase());
	}

	// Create semantic clusters with existing page matching
	log.info(" Creating semantic clusters...");
	const opportunityClusters = await createOpportunityClusters(
		allOpportunities,
		pages,
		currentRankings,
	);
	log.info(` Created ${opportunityClusters.length} clusters`);

	// Analyze snippet opportunities
	let snippetOpportunities: SnippetOpportunity[] = [];
	try {
		log.info(` Analyzing snippet opportunities for ${hostname}`);
		snippetOpportunities = await analyzeSnippetOpportunities(
			currentRankings,
			competitorGaps,
			hostname,
		);
		log.info(
			`[analysis] Found ${snippetOpportunities.length} snippet opportunities`,
		);
	} catch {
		log.info(" Failed to analyze snippet opportunities");
	}

	log.info(
		`[analysis] Done: ${allOpportunities.length} opportunities, ${quickWins.length} quick wins`,
	);

	return {
		currentRankings,
		opportunities: allOpportunities,
		opportunityClusters,
		quickWins,
		technicalIssues,
		internalLinkingIssues,
		competitorGaps,
		cannibalizationIssues,
		snippetOpportunities,
		discoveredCompetitors,
	};
}
