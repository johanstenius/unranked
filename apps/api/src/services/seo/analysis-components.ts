/**
 * Component-level analysis functions for resilient pipeline.
 * Each function handles one component that can independently succeed/fail.
 */

import { createLogger } from "../../lib/logger.js";
import type {
	AuditProgress,
	ComponentStatus,
} from "../../types/audit-progress.js";
import {
	type AiResult,
	type SearchIntent,
	type SemanticCluster,
	classifyKeywordIntentsTyped,
	clusterKeywordsSemanticTyped,
	generateQuickWinSuggestionsTyped,
} from "../ai/anthropic.js";
import type { CrawledPage, RedirectChain } from "../crawler/types.js";
import {
	type ApiResult,
	type DiscoveredCompetitor,
	type DomainKeyword,
	discoverCompetitorsTyped,
	getDomainRankedKeywordsTyped,
	getKeywordDataTyped,
	isApiAvailable,
} from "./dataforseo.js";

const log = createLogger("analysis-components");

// Re-export types from main analysis
export type {
	AnalysisResult,
	CurrentRanking,
	TechnicalIssue,
	QuickWin,
	CompetitorGap,
	CannibalizationIssue,
	SnippetOpportunity,
	Opportunity,
	OpportunityCluster,
} from "./analysis.js";

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
 * Classify keyword intents (Claude dependent)
 */
export async function runIntentClassification(
	keywords: string[],
): Promise<ComponentResult<Map<string, SearchIntent>>> {
	log.info(
		{ count: keywords.length },
		"Running intent classification component",
	);

	if (keywords.length === 0) {
		return { ok: true, data: new Map() };
	}

	const result = await classifyKeywordIntentsTyped(keywords);

	if (!result.ok) {
		const retriable = result.error !== "auth_error";
		return {
			ok: false,
			error: `Claude error: ${result.message}`,
			retriable,
		};
	}

	log.info({ count: result.data.size }, "Intent classification complete");
	return { ok: true, data: result.data };
}

/**
 * Cluster keywords semantically (Claude dependent)
 */
export async function runKeywordClustering(
	keywords: Array<{ keyword: string; searchVolume: number }>,
): Promise<ComponentResult<SemanticCluster[]>> {
	log.info({ count: keywords.length }, "Running keyword clustering component");

	if (keywords.length === 0) {
		return { ok: true, data: [] };
	}

	const result = await clusterKeywordsSemanticTyped(keywords);

	if (!result.ok) {
		const retriable = result.error !== "auth_error";
		return {
			ok: false,
			error: `Claude error: ${result.message}`,
			retriable,
		};
	}

	log.info({ count: result.data.length }, "Keyword clustering complete");
	return { ok: true, data: result.data };
}

/**
 * Update progress for a component based on result
 */
export function updateComponentProgress<T>(
	progress: AuditProgress,
	component: keyof AuditProgress,
	result: ComponentResult<T>,
): ComponentStatus {
	if (result.ok) {
		return "completed";
	}
	return result.retriable ? "retrying" : "failed";
}

/**
 * Check if all required components for briefs are ready
 */
export function canGenerateBriefs(progress: AuditProgress): boolean {
	// Need keywords and at least intent classification for briefs
	return (
		progress.keywordOpportunities === "completed" &&
		(progress.intentClassification === "completed" ||
			progress.keywordClustering === "completed")
	);
}

/**
 * Check if enough is done to show partial results
 */
export function hasPartialResults(progress: AuditProgress): boolean {
	// Show results if technical analysis is done
	return (
		progress.technicalIssues === "completed" &&
		progress.internalLinking === "completed"
	);
}

/**
 * Determine overall status from component progress
 */
export function determineOverallStatus(
	progress: AuditProgress,
): "ANALYZING" | "RETRYING" | "COMPLETED" | "FAILED" {
	const allComponents: (keyof AuditProgress)[] = [
		"crawl",
		"technicalIssues",
		"internalLinking",
		"duplicateContent",
		"redirectChains",
		"currentRankings",
		"competitorAnalysis",
		"keywordOpportunities",
		"intentClassification",
		"keywordClustering",
		"quickWins",
		"briefs",
	];

	// If any critical component failed, overall is FAILED
	const criticalFailed = progress.crawl === "failed";
	if (criticalFailed) return "FAILED";

	// If all are completed, overall is COMPLETED
	const allCompleted = allComponents.every((c) => progress[c] === "completed");
	if (allCompleted) return "COMPLETED";

	// If any are retrying, overall is RETRYING
	const anyRetrying = allComponents.some((c) => progress[c] === "retrying");
	if (anyRetrying) return "RETRYING";

	// Otherwise still analyzing
	return "ANALYZING";
}
