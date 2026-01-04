/**
 * Action Plan Component
 *
 * Aggregates insights from all components into a prioritized list
 * of top 10 actions by business impact.
 *
 * Priority formula:
 *   priority = (volumeScore * 0.35) + (positionScore * 0.25) + (difficultyScore * 0.25) + (effortScore * 0.15)
 *
 * FREE tier: Only technical issues (no AI/DataForSEO data available)
 */

import { createLogger } from "../../../lib/logger.js";
import type { ActionType, PrioritizedAction } from "../analysis.js";
import type {
	ComponentContext,
	ComponentEntry,
	ComponentResult,
	ComponentResults,
} from "./types.js";

const log = createLogger("components.action-plan");

const LIMITS = {
	MAX_ACTIONS: 10,
	MAX_TECHNICAL: 3,
	MAX_QUICK_WINS: 3,
	MAX_OPPORTUNITIES: 2,
	MAX_CANNIBALIZATION: 1,
	MAX_SNIPPETS: 1,
} as const;

const EFFORT_SCORES: Record<ActionType, number> = {
	fix_technical: 90,
	add_internal_links: 80,
	optimize_existing: 60,
	steal_snippet: 50,
	fix_cannibalization: 40,
	create_content: 30,
};

const EFFORT_LABELS: Record<ActionType, "low" | "medium" | "high"> = {
	fix_technical: "low",
	add_internal_links: "low",
	optimize_existing: "medium",
	steal_snippet: "medium",
	fix_cannibalization: "medium",
	create_content: "high",
};

function normalizeScore(value: number, max: number): number {
	return Math.min(100, Math.max(0, (value / max) * 100));
}

function calculatePriority(
	volumeScore: number,
	positionScore: number,
	difficultyScore: number,
	effortScore: number,
): number {
	return Math.round(
		volumeScore * 0.35 +
			positionScore * 0.25 +
			difficultyScore * 0.25 +
			effortScore * 0.15,
	);
}

function generateId(type: ActionType, index: number): string {
	return `${type}-${index}`;
}

function collectTechnicalActions(
	results: ComponentResults,
): PrioritizedAction[] {
	const issues = results.technicalIssues ?? [];

	return issues
		.filter((i) => i.severity === "high")
		.slice(0, LIMITS.MAX_TECHNICAL)
		.map((issue, idx) => {
			const priority = calculatePriority(
				50, // volume (N/A for technical)
				80, // position impact (high)
				80, // low difficulty
				EFFORT_SCORES.fix_technical,
			);
			return {
				id: generateId("fix_technical", idx),
				priority,
				type: "fix_technical" as const,
				title: `Fix: ${issue.issue}`,
				description: `High severity technical issue on ${issue.url}`,
				url: issue.url,
				estimatedImpact: {},
				effort: EFFORT_LABELS.fix_technical,
				category: "technical" as const,
			};
		});
}

function collectInternalLinkingActions(
	results: ComponentResults,
): PrioritizedAction[] {
	const linking = results.internalLinkingIssues;
	if (!linking) return [];

	const orphanPages = linking.orphanPages ?? [];
	if (orphanPages.length === 0) return [];

	const priority = calculatePriority(
		40, // volume (moderate)
		60, // position impact (moderate)
		70, // low difficulty
		EFFORT_SCORES.add_internal_links,
	);

	return [
		{
			id: generateId("add_internal_links", 0),
			priority,
			type: "add_internal_links",
			title: `Fix ${orphanPages.length} orphan pages`,
			description: "Add internal links to pages with no incoming links",
			estimatedImpact: {},
			effort: EFFORT_LABELS.add_internal_links,
			category: "linking",
		},
	];
}

function collectQuickWinActions(
	results: ComponentResults,
): PrioritizedAction[] {
	return (results.quickWins ?? [])
		.slice(0, LIMITS.MAX_QUICK_WINS)
		.map((qw, idx) => {
			const positionScore = normalizeScore(30 - qw.currentPosition, 20);
			const priority = calculatePriority(
				60, // volume (good)
				positionScore, // based on current position
				60, // medium difficulty
				EFFORT_SCORES.optimize_existing,
			);
			return {
				id: generateId("optimize_existing", idx),
				priority,
				type: "optimize_existing" as const,
				title: `Optimize "${qw.keyword}"`,
				description: `Position ${qw.currentPosition} - ${qw.suggestions[0] ?? "Improve content"}`,
				url: qw.url,
				keyword: qw.keyword,
				estimatedImpact: {},
				effort: EFFORT_LABELS.optimize_existing,
				category: "optimization" as const,
			};
		});
}

function collectOpportunityActions(
	results: ComponentResults,
): PrioritizedAction[] {
	return [...(results.opportunities ?? [])]
		.sort((a, b) => b.impactScore - a.impactScore)
		.slice(0, LIMITS.MAX_OPPORTUNITIES)
		.map((opp, idx) => {
			const volumeScore = normalizeScore(opp.searchVolume, 10000);
			const difficultyScore = 100 - opp.difficulty;
			const priority = calculatePriority(
				volumeScore,
				50, // position impact (new content)
				difficultyScore,
				EFFORT_SCORES.create_content,
			);
			return {
				id: generateId("create_content", idx),
				priority,
				type: "create_content" as const,
				title: `Create content for "${opp.keyword}"`,
				description: `${opp.searchVolume.toLocaleString()} monthly searches, ${opp.difficulty}% difficulty`,
				keyword: opp.keyword,
				estimatedImpact: {
					searchVolume: opp.searchVolume,
					trafficGain: opp.estimatedTraffic,
				},
				effort: EFFORT_LABELS.create_content,
				category: "content" as const,
			};
		});
}

function collectCannibalizationActions(
	results: ComponentResults,
): PrioritizedAction[] {
	return (results.cannibalizationIssues ?? [])
		.filter((i) => i.severity === "high")
		.slice(0, LIMITS.MAX_CANNIBALIZATION)
		.map((issue, idx) => {
			const volumeScore = normalizeScore(issue.searchVolume, 5000);
			const priority = calculatePriority(
				volumeScore,
				70, // position impact (high - fixing helps)
				60, // medium difficulty
				EFFORT_SCORES.fix_cannibalization,
			);
			return {
				id: generateId("fix_cannibalization", idx),
				priority,
				type: "fix_cannibalization" as const,
				title: `Fix cannibalization for "${issue.keyword}"`,
				description: `${issue.pages.length} pages competing - consolidate or differentiate`,
				keyword: issue.keyword,
				estimatedImpact: { searchVolume: issue.searchVolume },
				effort: EFFORT_LABELS.fix_cannibalization,
				category: "optimization" as const,
			};
		});
}

function collectSnippetActions(results: ComponentResults): PrioritizedAction[] {
	return (results.snippetOpportunities ?? [])
		.filter((s) => s.difficulty === "easy")
		.slice(0, LIMITS.MAX_SNIPPETS)
		.map((snippet, idx) => {
			const volumeScore = normalizeScore(snippet.searchVolume, 5000);
			const priority = calculatePriority(
				volumeScore,
				80, // position impact (high - snippet is top)
				90, // easy difficulty
				EFFORT_SCORES.steal_snippet,
			);
			return {
				id: generateId("steal_snippet", idx),
				priority,
				type: "steal_snippet" as const,
				title: `Capture "${snippet.keyword}" snippet`,
				description: `${snippet.snippetType} snippet - ${snippet.searchVolume.toLocaleString()} searches`,
				keyword: snippet.keyword,
				estimatedImpact: { searchVolume: snippet.searchVolume },
				effort: EFFORT_LABELS.steal_snippet,
				category: "optimization" as const,
			};
		});
}

async function runActionPlan(
	ctx: ComponentContext,
	results: ComponentResults,
): Promise<ComponentResult<PrioritizedAction[]>> {
	log.info("Generating action plan");

	const allActions: PrioritizedAction[] = [
		...collectTechnicalActions(results),
		...collectInternalLinkingActions(results),
	];

	// Add paid-tier actions
	if (ctx.tier.tier !== "FREE") {
		allActions.push(
			...collectQuickWinActions(results),
			...collectOpportunityActions(results),
			...collectCannibalizationActions(results),
			...collectSnippetActions(results),
		);
	}

	// Sort by priority and take top N
	const sortedActions = allActions
		.sort((a, b) => b.priority - a.priority)
		.slice(0, LIMITS.MAX_ACTIONS);

	log.info({ count: sortedActions.length }, "Action plan generated");

	return { ok: true, data: sortedActions };
}

export const actionPlanComponent: ComponentEntry<PrioritizedAction[]> = {
	key: "actionPlan",
	dependencies: [
		"technicalIssues",
		"internalLinking",
		"quickWins",
		"keywordOpportunities",
		"cannibalization",
		"snippetOpportunities",
	],
	run: runActionPlan,
	store: (results, data) => ({ ...results, actionPlan: data }),
};
