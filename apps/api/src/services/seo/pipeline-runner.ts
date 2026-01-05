/**
 * Pipeline Runner
 *
 * Executes components in dependency order with retry support.
 * This replaces the ad-hoc component execution in audit-pipeline.service.ts.
 */

import { createLogger } from "../../lib/logger.js";
import { UNLIMITED, tierLimits } from "../../schemas/audit.schema.js";
import { type ApiUsage, createEmptyUsage } from "../../types/api-usage.js";
import type {
	BrokenLink,
	CrawledPage,
	RedirectChain,
} from "../crawler/types.js";
import type {
	ComponentContext,
	ComponentKey,
	ComponentResults,
	TierConfig,
} from "./components/index.js";
import {
	COMPONENT_REGISTRY,
	areDependenciesSatisfied,
	getComponentOrder,
} from "./components/index.js";

const log = createLogger("pipeline-runner");

export type PipelineInput = {
	auditId: string;
	siteUrl: string;
	pages: CrawledPage[];
	competitors: string[];
	productDesc: string | null;
	tier: "FREE" | "SCAN" | "AUDIT" | "DEEP_DIVE";
	crawlMetadata: {
		hasRobotsTxt: boolean;
		hasSitemap: boolean;
		redirectChains: RedirectChain[];
		brokenLinks: BrokenLink[];
	};
};

export type PipelineResult = {
	results: ComponentResults;
	completed: ComponentKey[];
	failed: Array<{ key: ComponentKey; error: string }>;
	usage: ApiUsage;
};

/**
 * Build the tier configuration from tier name
 */
function buildTierConfig(tier: PipelineInput["tier"]): TierConfig {
	const limits = tierLimits[tier];

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
function buildContext(input: PipelineInput, usage: ApiUsage): ComponentContext {
	const hostname = new URL(input.siteUrl).hostname;

	return {
		auditId: input.auditId,
		siteUrl: input.siteUrl,
		hostname,
		pages: input.pages,
		crawlMetadata: input.crawlMetadata,
		competitors: input.competitors,
		productDesc: input.productDesc,
		tier: buildTierConfig(input.tier),
		usage,
	};
}

export type PipelineCallbacks = {
	onComponentStart?: (key: ComponentKey) => void | Promise<void>;
	onComponentComplete?: (
		key: ComponentKey,
		results: ComponentResults,
	) => void | Promise<void>;
	onComponentFailed?: (
		key: ComponentKey,
		error: string,
	) => void | Promise<void>;
};

/**
 * Run all specified components in dependency order
 */
export async function runPipeline(
	input: PipelineInput,
	componentsToRun: ComponentKey[],
	existingResults: ComponentResults = {},
	existingUsage?: ApiUsage,
	callbacks?: PipelineCallbacks,
): Promise<PipelineResult> {
	const usage = existingUsage ?? createEmptyUsage();
	const ctx = buildContext(input, usage);
	let results = { ...existingResults };

	const completed: ComponentKey[] = [];
	const failed: Array<{ key: ComponentKey; error: string }> = [];

	// Get components in dependency order
	const orderedComponents = getComponentOrder(componentsToRun);
	const completedSet = new Set<ComponentKey>();

	// Mark pre-existing results as completed
	if (results.technicalIssues) completedSet.add("technicalIssues");
	if (results.internalLinkingIssues) completedSet.add("internalLinking");
	if (results.duplicateGroups) completedSet.add("duplicateContent");
	if (results.coreWebVitals) completedSet.add("coreWebVitals");
	if (results.currentRankings) completedSet.add("currentRankings");
	if (results.opportunities) {
		completedSet.add("keywordOpportunities");
		completedSet.add("competitorAnalysis");
	}
	if (results.cannibalizationIssues) completedSet.add("cannibalization");
	if (results.snippetOpportunities) completedSet.add("snippetOpportunities");
	if (results.opportunityClusters) {
		completedSet.add("intentClassification");
		completedSet.add("keywordClustering");
	}
	if (results.quickWins) completedSet.add("quickWins");
	if (results.actionPlan) completedSet.add("actionPlan");

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
			failed.push({
				key,
				error: "Dependencies not satisfied",
			});
			continue;
		}

		const component = COMPONENT_REGISTRY[key];
		log.info({ component: key }, "Running component");

		// Emit start callback
		await callbacks?.onComponentStart?.(key);

		try {
			const result = await component.run(ctx, results);

			if (result.ok) {
				results = component.store(results, result.data);
				completedSet.add(key);
				completed.push(key);
				log.info({ component: key }, "Component completed");
				// Emit complete callback with stored results
				await callbacks?.onComponentComplete?.(key, results);
			} else {
				failed.push({ key, error: result.error });
				log.warn({ component: key, error: result.error }, "Component failed");
				await callbacks?.onComponentFailed?.(key, result.error);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			failed.push({ key, error: message });
			log.error(
				{ component: key, error: message },
				"Component threw exception",
			);
			await callbacks?.onComponentFailed?.(key, message);
		}
	}

	log.info(
		{ completed: completed.length, failed: failed.length },
		"Pipeline complete",
	);

	return { results, completed, failed, usage };
}

/**
 * Run local components (always succeed, no external deps)
 */
export async function runLocalComponents(
	input: PipelineInput,
): Promise<PipelineResult> {
	const localComponents: ComponentKey[] = [
		"technicalIssues",
		"internalLinking",
		"duplicateContent",
	];

	return runPipeline(input, localComponents);
}

/**
 * Run all external components (DataForSEO + AI)
 */
export async function runExternalComponents(
	input: PipelineInput,
	existingResults: ComponentResults,
	existingUsage?: ApiUsage,
	callbacks?: PipelineCallbacks,
): Promise<PipelineResult> {
	// Note: coreWebVitals is run separately in audit.jobs.ts with SSE streaming
	const externalComponents: ComponentKey[] = [
		"currentRankings",
		"keywordOpportunities",
		"competitorAnalysis",
		"cannibalization",
		"snippetOpportunities",
		"intentClassification",
		"keywordClustering",
		"quickWins",
		"actionPlan", // Runs last, aggregates all results
	];

	return runPipeline(
		input,
		externalComponents,
		existingResults,
		existingUsage,
		callbacks,
	);
}

/**
 * Deduplicate and sort opportunities
 */
export function finalizeOpportunities(
	results: ComponentResults,
): ComponentResults {
	if (!results.opportunities) return results;

	const seen = new Set<string>();
	const deduped = results.opportunities.filter((opp) => {
		const key = opp.keyword.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	// Sort by impact score and limit
	deduped.sort((a, b) => b.impactScore - a.impactScore);
	const limited = deduped.slice(0, 50);

	return { ...results, opportunities: limited };
}
