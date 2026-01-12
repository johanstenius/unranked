/**
 * Briefs Component
 *
 * Briefs are now generated on-demand via API, not during pipeline.
 * This component just marks briefs as ready for user selection.
 * Actual generation happens via POST /audits/:token/briefs/generate
 */

import { createLogger } from "../../../lib/logger.js";
import type {
	ComponentContext,
	ComponentEntry,
	ComponentResult,
	ComponentResults,
} from "./types.js";

const log = createLogger("components.briefs");

export type BriefsComponentResult = {
	briefCount: number;
	availableClusters: number;
};

async function runBriefs(
	ctx: ComponentContext,
	results: ComponentResults,
): Promise<ComponentResult<BriefsComponentResult>> {
	const { auditId, tier } = ctx;

	// FREE tier doesn't get briefs
	if (tier.tier === "FREE") {
		log.info({ auditId }, "FREE tier - briefs not available");
		return { ok: true, data: { briefCount: 0, availableClusters: 0 } };
	}

	const clusters = results.opportunityClusters ?? [];

	// No auto-generation - briefs are created on-demand via API
	log.info(
		{
			auditId,
			availableClusters: clusters.length,
			maxBriefs: tier.maxBriefs,
		},
		"Briefs ready for on-demand generation",
	);

	return {
		ok: true,
		data: {
			briefCount: 0, // No briefs generated yet
			availableClusters: clusters.length,
		},
	};
}

export const briefsComponent: ComponentEntry<BriefsComponentResult> = {
	key: "briefs",
	dependencies: ["keywordOpportunities", "competitorAnalysis"],
	run: runBriefs,
	store: (results, _data) => results,
	sseKey: "briefs",
	getSSEData: () => [], // Briefs fetched via /api/audits/:id/briefs
};
