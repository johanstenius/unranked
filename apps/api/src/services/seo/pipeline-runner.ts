/**
 * Pipeline Runner
 *
 * Single entry point for running audit pipeline components.
 * Both primary flow (audit.jobs) and retry flow (retry.jobs) use this.
 *
 * Key guarantees:
 * 1. PipelineState tracks progress + results together
 * 2. Atomic state persistence after each component
 * 3. Resume from any point - failed/stale components re-run
 * 4. All components follow same pattern
 */

import { getErrorMessage } from "../../lib/errors.js";
import { createLogger } from "../../lib/logger.js";
import { UNLIMITED, getLimits } from "../../schemas/audit.schema.js";
import {
	type PipelineState,
	createEmptyPipelineState,
	markPipelineCompleted,
	markPipelineFailed,
	markPipelineRunning,
} from "../../types/audit-state.js";
import type {
	BrokenLink,
	CrawledPage,
	RedirectChain,
} from "../crawler/types.js";
import type {
	ComponentContext,
	ComponentKey,
	SSEComponentKey,
	TierConfig,
} from "./components/index.js";
import {
	COMPONENT_REGISTRY,
	areDependenciesSatisfied,
	getComponentOrder,
} from "./components/index.js";

const log = createLogger("pipeline-runner");

export type PrefetchedRanking = {
	url: string;
	keyword: string;
	position: number;
	searchVolume: number;
	estimatedTraffic: number;
};

export type PipelineInput = {
	auditId: string;
	siteUrl: string;
	pages: CrawledPage[];
	competitors: string[];
	targetKeywords: string[];
	productDesc: string | null;
	tier: "FREE" | "SCAN" | "AUDIT" | "DEEP_DIVE";
	crawlMetadata: {
		hasRobotsTxt: boolean;
		hasSitemap: boolean;
		redirectChains: RedirectChain[];
		brokenLinks: BrokenLink[];
		robotsTxtContent: string | null;
		hasLlmsTxt: boolean;
	};
	/** True if site has no existing Google rankings (from pre-flight check) */
	isNewSite?: boolean;
	/** Pre-fetched rankings from pre-flight check (reused by rankings component) */
	prefetchedRankings?: PrefetchedRanking[];
};

export type PipelineCallbacks = {
	onStateUpdate: (state: PipelineState) => Promise<void>;
	onComponentStart?: (key: SSEComponentKey) => void;
	onComponentComplete?: (key: SSEComponentKey, data: unknown) => void;
	onComponentFailed?: (key: SSEComponentKey, error: string) => void;
};

/**
 * Build the tier configuration from tier name.
 * When isNewSite is true, uses boosted limits (more briefs, more competitors).
 */
function buildTierConfig(
	tier: PipelineInput["tier"],
	isNewSite = false,
): TierConfig {
	const limits = getLimits(tier, isNewSite);

	// Tier-dependent snippet limits
	const snippetLimits: Record<PipelineInput["tier"], number> = {
		FREE: 0,
		SCAN: 5,
		AUDIT: 10,
		DEEP_DIVE: 25,
	};

	return {
		tier,
		maxCompetitors: limits.competitors,
		maxSeeds: limits.seeds,
		maxBriefs: limits.briefs === UNLIMITED ? 100 : limits.briefs,
		maxSnippets: snippetLimits[tier],
	};
}

/**
 * Build the component context from pipeline input
 */
function buildContext(
	input: PipelineInput,
	state: PipelineState,
): ComponentContext {
	const hostname = new URL(input.siteUrl).hostname;

	return {
		auditId: input.auditId,
		siteUrl: input.siteUrl,
		hostname,
		pages: input.pages,
		crawlMetadata: input.crawlMetadata,
		competitors: input.competitors,
		targetKeywords: input.targetKeywords,
		productDesc: input.productDesc,
		tier: buildTierConfig(input.tier, input.isNewSite ?? false),
		usage: state.usage,
		prefetchedRankings: input.prefetchedRankings ?? null,
	};
}

/**
 * Get components that need to run based on state.
 * Skips completed, runs pending/failed.
 */
function getComponentsToRun(
	state: PipelineState,
	allComponents: ComponentKey[],
): ComponentKey[] {
	return allComponents.filter((key) => {
		const status = state.progress[key]?.status;
		return !status || status === "pending" || status === "failed";
	});
}

/**
 * Run all specified components in dependency order.
 * Persists state after each component for resumability.
 */
export async function runPipeline(
	input: PipelineInput,
	componentsToRun: ComponentKey[],
	existingState: PipelineState,
	callbacks: PipelineCallbacks,
): Promise<PipelineState> {
	let state = structuredClone(existingState);
	const ctx = buildContext(input, state);

	// Get components in dependency order
	const orderedComponents = getComponentOrder(componentsToRun);
	const completedSet = new Set<ComponentKey>();

	// Mark pre-completed components
	for (const key of Object.keys(state.progress) as ComponentKey[]) {
		if (state.progress[key]?.status === "completed") {
			completedSet.add(key);
		}
	}

	log.info(
		{ components: orderedComponents, preCompleted: [...completedSet] },
		"Running pipeline",
	);

	for (const key of orderedComponents) {
		// Skip if already completed
		if (completedSet.has(key)) {
			log.debug({ component: key }, "Skipping completed component");
			continue;
		}

		// Check dependencies
		if (!areDependenciesSatisfied(key, completedSet)) {
			const component = COMPONENT_REGISTRY[key];
			log.warn(
				{ component: key, deps: component.dependencies },
				"Dependencies not satisfied, skipping",
			);
			state = markPipelineFailed(state, key, "Dependencies not satisfied");
			await callbacks.onStateUpdate(state);
			continue;
		}

		const component = COMPONENT_REGISTRY[key];
		log.info({ component: key }, "Running component");

		// Mark running and persist
		state = markPipelineRunning(state, key);
		await callbacks.onStateUpdate(state);

		// Emit start callback
		if (component.sseKey) {
			callbacks.onComponentStart?.(component.sseKey);
		}

		try {
			const result = await component.run(ctx, state.results);

			if (result.ok) {
				state.results = component.store(state.results, result.data);
				state = markPipelineCompleted(state, key, state.results);
				completedSet.add(key);

				log.info({ component: key }, "Component completed");

				// Persist and emit
				await callbacks.onStateUpdate(state);
				if (component.sseKey) {
					callbacks.onComponentComplete?.(
						component.sseKey,
						component.getSSEData(state.results),
					);
				}
			} else {
				state = markPipelineFailed(state, key, result.error);
				await callbacks.onStateUpdate(state);

				log.warn({ component: key, error: result.error }, "Component failed");
				if (component.sseKey) {
					callbacks.onComponentFailed?.(component.sseKey, result.error);
				}
			}
		} catch (error) {
			const message = getErrorMessage(error);
			state = markPipelineFailed(state, key, message);
			await callbacks.onStateUpdate(state);

			log.error(
				{ component: key, error: message },
				"Component threw exception",
			);
			if (component.sseKey) {
				callbacks.onComponentFailed?.(component.sseKey, message);
			}
		}
	}

	log.info(
		{
			completedCount: completedSet.size,
			totalComponents: orderedComponents.length,
		},
		"Pipeline complete",
	);

	return state;
}

/** Components that require existing rankings - skipped for new sites */
const RANKING_DEPENDENT_COMPONENTS: ComponentKey[] = [
	"quickWins", // needs positions 10-30 to optimize
];

/**
 * Components that run during crawl phase (no user input required).
 * These run in parallel with the interactive flow.
 */
const CRAWL_PHASE_COMPONENTS: ComponentKey[] = [
	"technicalIssues",
	"internalLinking",
	"duplicateContent",
	"aiReadiness",
];

/**
 * Components that run after merge (require user selections from interactive flow).
 * These run only after both crawl AND interactive flows complete.
 */
const POST_MERGE_COMPONENTS: ComponentKey[] = [
	"currentRankings",
	"keywordOpportunities",
	"competitorAnalysis",
	"snippetOpportunities",
	"quickWins",
	"briefs",
	"actionPlan",
];

/**
 * Get crawl-phase components for paid tiers.
 * These run during the crawl job, in parallel with interactive flow.
 */
export function getCrawlPhaseComponents(): ComponentKey[] {
	return CRAWL_PHASE_COMPONENTS;
}

/**
 * Get post-merge components for paid tiers.
 * These run after both crawl and interactive flows complete.
 */
export function getPostMergeComponents(isNewSite = false): ComponentKey[] {
	if (isNewSite) {
		return POST_MERGE_COMPONENTS.filter(
			(c) => !RANKING_DEPENDENT_COMPONENTS.includes(c),
		);
	}
	return POST_MERGE_COMPONENTS;
}

/**
 * Get components for a tier, optionally excluding ranking-dependent ones for new sites.
 */
export function getComponentsForTier(
	tier: PipelineInput["tier"],
	isNewSite = false,
): ComponentKey[] {
	// All components except crawl (run separately with page streaming)
	const allComponents: ComponentKey[] = [
		"technicalIssues",
		"internalLinking",
		"duplicateContent",
		"aiReadiness",
		"currentRankings",
		"keywordOpportunities",
		"competitorAnalysis",
		"snippetOpportunities",
		"quickWins",
		"briefs",
		"actionPlan",
	];

	// FREE tier skips expensive components (keywords, competitors, briefs)
	if (tier === "FREE") {
		return allComponents.filter(
			(c) =>
				![
					"currentRankings",
					"keywordOpportunities",
					"competitorAnalysis",
					"snippetOpportunities",
					"quickWins",
					"briefs",
				].includes(c),
		);
	}

	// New sites skip ranking-dependent components
	if (isNewSite) {
		return allComponents.filter(
			(c) => !RANKING_DEPENDENT_COMPONENTS.includes(c),
		);
	}

	return allComponents;
}

/**
 * Get pending/failed components from state.
 */
export function getPendingComponents(
	state: PipelineState,
	allComponents: ComponentKey[],
): ComponentKey[] {
	return getComponentsToRun(state, allComponents);
}

/**
 * Check if all components are completed.
 */
export function isAllCompleted(
	state: PipelineState,
	allComponents: ComponentKey[],
): boolean {
	return allComponents.every(
		(key) => state.progress[key]?.status === "completed",
	);
}

/**
 * Deduplicate and sort opportunities
 */
export function finalizeOpportunities(state: PipelineState): PipelineState {
	if (!state.results.opportunities) return state;

	const seen = new Set<string>();
	const deduped = state.results.opportunities.filter((opp) => {
		const key = opp.keyword.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	// Sort by impact score and limit
	deduped.sort((a, b) => b.impactScore - a.impactScore);
	const limited = deduped.slice(0, 50);

	return {
		...state,
		results: { ...state.results, opportunities: limited },
	};
}
