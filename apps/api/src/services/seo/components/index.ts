/**
 * Component Registry
 *
 * Central registry of all pipeline components with their dependencies.
 */

import { actionPlanComponent } from "./action-plan.js";
import {
	intentClassificationComponent,
	keywordClusteringComponent,
	quickWinsComponent,
} from "./ai.js";
import { coreWebVitalsComponent } from "./cwv.js";
import {
	cannibalizationComponent,
	competitorAnalysisComponent,
	currentRankingsComponent,
	keywordOpportunitiesComponent,
	snippetOpportunitiesComponent,
} from "./dataforseo.js";
import {
	duplicateContentComponent,
	internalLinkingComponent,
	technicalIssuesComponent,
} from "./technical-analysis.js";
import type {
	ComponentEntry,
	ComponentKey,
	ComponentRegistry,
	ComponentResults,
} from "./types.js";

export * from "./types.js";

/**
 * All registered components
 * Cast to unknown to allow mixed component types in the registry.
 */
export const COMPONENT_REGISTRY: ComponentRegistry = {
	// Technical analysis components (no external deps)
	technicalIssues: technicalIssuesComponent as ComponentEntry<unknown>,
	internalLinking: internalLinkingComponent as ComponentEntry<unknown>,
	duplicateContent: duplicateContentComponent as ComponentEntry<unknown>,

	// Core Web Vitals (PageSpeed Insights API)
	coreWebVitals: coreWebVitalsComponent as ComponentEntry<unknown>,

	// DataForSEO components
	currentRankings: currentRankingsComponent as ComponentEntry<unknown>,
	keywordOpportunities:
		keywordOpportunitiesComponent as ComponentEntry<unknown>,
	competitorAnalysis: competitorAnalysisComponent as ComponentEntry<unknown>,
	cannibalization: cannibalizationComponent as ComponentEntry<unknown>,
	snippetOpportunities:
		snippetOpportunitiesComponent as ComponentEntry<unknown>,

	// AI components
	intentClassification:
		intentClassificationComponent as ComponentEntry<unknown>,
	keywordClustering: keywordClusteringComponent as ComponentEntry<unknown>,
	quickWins: quickWinsComponent as ComponentEntry<unknown>,

	// Briefs handled separately (has its own flow)
	briefs: {
		key: "briefs",
		dependencies: ["keywordClustering"],
		run: async () => ({ ok: true as const, data: null }),
		store: (results: ComponentResults) => results,
	},

	// Aggregation component - runs last
	actionPlan: actionPlanComponent as ComponentEntry<unknown>,
};

/**
 * Get components in dependency order (topological sort)
 */
export function getComponentOrder(keys: ComponentKey[]): ComponentKey[] {
	const visited = new Set<ComponentKey>();
	const result: ComponentKey[] = [];

	function visit(key: ComponentKey): void {
		if (visited.has(key)) return;
		visited.add(key);

		const component = COMPONENT_REGISTRY[key];
		for (const dep of component.dependencies) {
			if (keys.includes(dep)) {
				visit(dep);
			}
		}
		result.push(key);
	}

	for (const key of keys) {
		visit(key);
	}

	return result;
}

/**
 * Check if all dependencies are satisfied
 */
export function areDependenciesSatisfied(
	key: ComponentKey,
	completedComponents: Set<ComponentKey>,
): boolean {
	const component = COMPONENT_REGISTRY[key];
	return component.dependencies.every((dep) => completedComponents.has(dep));
}

/**
 * Get components that can run next (dependencies satisfied)
 */
export function getReadyComponents(
	pendingComponents: ComponentKey[],
	completedComponents: Set<ComponentKey>,
): ComponentKey[] {
	return pendingComponents.filter((key) =>
		areDependenciesSatisfied(key, completedComponents),
	);
}
