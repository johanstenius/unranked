import type { AnalysisResult, TechnicalIssue } from "./analysis.js";
import type { AIReadinessData } from "./components/types.js";

/** Max points per health score component */
const POINTS = {
	OPPORTUNITY_DISCOVERY: 30,
	RANKING_COVERAGE: 20,
	POSITION_QUALITY: 15,
	TECHNICAL_HEALTH: 15,
	INTERNAL_LINKING: 10,
	CONTENT_OPPORTUNITY: 10,
	/** AI readiness max varies by tier: FREE=2, SCAN=5, AUDIT/DEEP_DIVE=10 */
	AI_READINESS: { FREE: 2, SCAN: 5, AUDIT: 10, DEEP_DIVE: 10 },
	/** Total max for AUDIT/DEEP_DIVE tier (includes AI readiness) */
	FULL_MAX: 110,
	/** Max achievable for new sites (excludes ranking-dependent components) */
	NEW_SITE_MAX: 75,
	/** Max for FREE tier (technical + linking + basic AI) */
	FREE_TIER_MAX: 27,
} as const;

const THRESHOLDS = {
	HIGH_IMPACT_SCORE: 50,
	OPPORTUNITY_SCALE: 10,
} as const;

const SEVERITY_WEIGHTS = { high: 3, medium: 1, low: 0.5 } as const;

const POSITION_SCORES: Array<{ maxPosition: number; score: number }> = [
	{ maxPosition: 3, score: 15 },
	{ maxPosition: 10, score: 12 },
	{ maxPosition: 20, score: 8 },
	{ maxPosition: 50, score: 4 },
];

type HealthScoreComponent = {
	score: number;
	max: number;
	detail: string;
};

export type HealthScoreBreakdown = {
	// Renamed: measures how many valuable opportunities were found, not site health
	opportunityDiscovery: HealthScoreComponent & { max: 30 };
	rankingCoverage: HealthScoreComponent & { max: 20 };
	positionQuality: HealthScoreComponent & { max: 15 };
	technicalHealth: HealthScoreComponent & { max: 15 };
	internalLinking: HealthScoreComponent & { max: 10 };
	contentOpportunity: HealthScoreComponent & { max: 10 };
	aiReadiness: HealthScoreComponent; // max varies by tier: FREE=2, SCAN=5, AUDIT+=10
};

export type HealthScoreGrade = "excellent" | "good" | "needs_work" | "poor";

export type HealthScore = {
	score: number;
	grade: HealthScoreGrade;
	breakdown: HealthScoreBreakdown;
};

function calculateOpportunityDiscovery(
	analysis: AnalysisResult,
): HealthScoreComponent & { max: 30 } {
	const MAX = 30;

	if (analysis.competitorGaps.length === 0) {
		return { score: 0, max: MAX, detail: "No competitors analyzed" };
	}

	let totalGaps = 0;
	let highValueGaps = 0;

	for (const gap of analysis.competitorGaps) {
		totalGaps += gap.gapKeywords.length;
		highValueGaps += gap.gapKeywords.filter((k) => k.searchVolume > 100).length;
	}

	// Higher score = more valuable opportunities discovered
	// This measures audit value, not site health
	const gapScore = Math.min(MAX, Math.round((highValueGaps / 10) * MAX));

	return {
		score: gapScore,
		max: MAX,
		detail:
			totalGaps > 0
				? `${totalGaps} keyword gaps found (${highValueGaps} high-value)`
				: "No keyword gaps found",
	};
}

function calculateRankingCoverage(
	analysis: AnalysisResult,
	pagesFound: number,
): HealthScoreComponent & { max: 20 } {
	const MAX = 20;

	if (pagesFound === 0) {
		return { score: 0, max: MAX, detail: "No pages crawled" };
	}

	const pagesWithRankings = new Set(analysis.currentRankings.map((r) => r.url))
		.size;
	const ratio = pagesWithRankings / pagesFound;
	const score = Math.round(ratio * MAX);
	const percentage = Math.round(ratio * 100);

	return {
		score,
		max: MAX,
		detail: `${pagesWithRankings} of ${pagesFound} pages ranking (${percentage}%)`,
	};
}

function calculatePositionQuality(
	analysis: AnalysisResult,
): HealthScoreComponent & { max: 15 } {
	const MAX = 15;

	if (analysis.currentRankings.length === 0) {
		return { score: 0, max: MAX, detail: "No rankings found" };
	}

	const avgPosition =
		analysis.currentRankings.reduce((sum, r) => sum + r.position, 0) /
		analysis.currentRankings.length;

	const score =
		POSITION_SCORES.find((p) => avgPosition <= p.maxPosition)?.score ?? 0;

	return {
		score,
		max: MAX,
		detail: `Avg position: ${Math.round(avgPosition)}`,
	};
}

function countSeverityWeight(issues: TechnicalIssue[]): number {
	return issues.reduce(
		(sum, issue) => sum + SEVERITY_WEIGHTS[issue.severity],
		0,
	);
}

function calculateTechnicalHealth(
	analysis: AnalysisResult,
	pagesFound: number,
): HealthScoreComponent & { max: 15 } {
	const MAX = 15;

	if (pagesFound === 0) {
		return { score: 0, max: MAX, detail: "No pages crawled" };
	}

	// Calculate issues score (0-15 points)
	const issueWeight = countSeverityWeight(analysis.technicalIssues);
	const maxPossibleWeight = pagesFound * 3;
	const healthRatio = Math.max(0, 1 - issueWeight / maxPossibleWeight);
	const score = Math.round(healthRatio * MAX);

	// Build detail string
	const highCount = analysis.technicalIssues.filter(
		(i) => i.severity === "high",
	).length;
	const mediumCount = analysis.technicalIssues.filter(
		(i) => i.severity === "medium",
	).length;

	let detail: string;
	if (analysis.technicalIssues.length === 0) {
		detail = "No issues";
	} else if (highCount > 0 && mediumCount > 0) {
		detail = `${highCount} critical, ${mediumCount} warnings`;
	} else if (highCount > 0) {
		detail = `${highCount} critical`;
	} else if (mediumCount > 0) {
		detail = `${mediumCount} warning${mediumCount > 1 ? "s" : ""}`;
	} else {
		detail = `${analysis.technicalIssues.length} minor`;
	}

	return { score, max: MAX, detail };
}

function calculateInternalLinking(
	analysis: AnalysisResult,
	pagesFound: number,
): HealthScoreComponent & { max: 10 } {
	const MAX = 10;

	if (pagesFound === 0) {
		return { score: 0, max: MAX, detail: "No pages crawled" };
	}

	const { orphanPages, underlinkedPages } = analysis.internalLinkingIssues;
	const problemPages = orphanPages.length + underlinkedPages.length;
	const healthRatio = Math.max(0, 1 - problemPages / pagesFound);
	const score = Math.round(healthRatio * MAX);

	let detail: string;
	if (orphanPages.length === 0 && underlinkedPages.length === 0) {
		detail = "Good internal linking";
	} else if (orphanPages.length > 0 && underlinkedPages.length > 0) {
		detail = `${orphanPages.length} orphan, ${underlinkedPages.length} underlinked`;
	} else if (orphanPages.length > 0) {
		detail = `${orphanPages.length} orphan page${orphanPages.length > 1 ? "s" : ""}`;
	} else {
		detail = `${underlinkedPages.length} underlinked page${underlinkedPages.length > 1 ? "s" : ""}`;
	}

	return { score, max: MAX, detail };
}

function calculateContentOpportunity(
	analysis: AnalysisResult,
): HealthScoreComponent & { max: 10 } {
	const MAX = 10;

	const hasQuickWins = analysis.quickWins.length > 0;
	const highImpactOpps = analysis.opportunities.filter(
		(o) => o.impactScore > THRESHOLDS.HIGH_IMPACT_SCORE,
	);

	if (hasQuickWins || highImpactOpps.length >= 3) {
		return {
			score: MAX,
			max: MAX,
			detail: `${analysis.quickWins.length} quick wins, ${highImpactOpps.length} high-impact opps`,
		};
	}

	const opportunityCount =
		analysis.quickWins.length + analysis.opportunities.length;
	const score = Math.min(
		MAX,
		Math.round((opportunityCount / THRESHOLDS.OPPORTUNITY_SCALE) * MAX),
	);

	return {
		score,
		max: MAX,
		detail:
			opportunityCount > 0
				? `${opportunityCount} opportunities identified`
				: "No opportunities found",
	};
}

function getGrade(score: number): HealthScoreGrade {
	if (score >= 80) return "excellent";
	if (score >= 60) return "good";
	if (score >= 40) return "needs_work";
	return "poor";
}

type HealthScoreOptions = {
	isFreeTier?: boolean;
	isNewSite?: boolean;
	tier?: "FREE" | "SCAN" | "AUDIT" | "DEEP_DIVE";
};

/**
 * Calculate AI Readiness score contribution
 * - FREE: 2 pts max (robots.txt AI access only)
 * - SCAN: 5 pts max (+ llms.txt + content structure)
 * - AUDIT/DEEP_DIVE: 10 pts max (full analysis)
 */
function calculateAIReadiness(
	aiReadiness: AIReadinessData | undefined,
	tier: HealthScoreOptions["tier"] = "AUDIT",
): HealthScoreComponent {
	// Max points by tier
	const max = POINTS.AI_READINESS[tier ?? "AUDIT"];

	if (!aiReadiness) {
		return { score: 0, max, detail: "No AI readiness data" };
	}

	// Robots.txt score (0-2 pts): ratio of AI bots allowed/unspecified
	const { summary } = aiReadiness.robotsTxtAnalysis;
	const totalBots = summary.allowed + summary.blocked + summary.unspecified;
	const allowedRatio =
		totalBots > 0 ? (summary.allowed + summary.unspecified) / totalBots : 1;
	const robotsScore = Math.round(allowedRatio * 2);

	if (tier === "FREE") {
		// FREE: only robots.txt analysis (max 2 pts)
		const blockedCount = summary.blocked;
		const detail =
			blockedCount === 0
				? `${summary.allowed + summary.unspecified} AI bots accessible`
				: `${blockedCount} AI bot${blockedCount > 1 ? "s" : ""} blocked`;
		return { score: robotsScore, max, detail };
	}

	// llms.txt score (0-1 pt)
	const llmsTxtScore = aiReadiness.llmsTxt.exists ? 1 : 0;

	// Content structure score (0-2 pts)
	const { contentStructure } = aiReadiness;
	let structureScore = 0;
	// Heading hierarchy (1 pt if > 70% pages have proper H1)
	if (contentStructure.headingHierarchy.score >= 70) structureScore += 1;
	// Structured data (1 pt if any schema present)
	if (contentStructure.structuredData.pagesWithSchema > 0) structureScore += 1;

	if (tier === "SCAN") {
		// SCAN: robots + llms.txt + content structure (max 5 pts)
		const score = robotsScore + llmsTxtScore + structureScore;
		const detail = buildAIReadinessDetail(aiReadiness, false);
		return { score, max, detail };
	}

	// AUDIT/DEEP_DIVE: full analysis (max 10 pts)
	// Additional content quality points (0-5 pts)
	let contentQualityScore = 0;
	// FAQ schema (2 pts)
	if (contentStructure.structuredData.hasFAQSchema) contentQualityScore += 2;
	// Good content depth (2 pts for avg > 500 words, 1 pt for > 300)
	if (contentStructure.contentQuality.avgWordCount >= 500) {
		contentQualityScore += 2;
	} else if (contentStructure.contentQuality.avgWordCount >= 300) {
		contentQualityScore += 1;
	}
	// No thin content (1 pt)
	if (contentStructure.contentQuality.pagesWithThinContent === 0) {
		contentQualityScore += 1;
	}

	const score = Math.min(
		max,
		robotsScore + llmsTxtScore + structureScore + contentQualityScore,
	);
	const detail = buildAIReadinessDetail(aiReadiness, true);
	return { score, max, detail };
}

function buildAIReadinessDetail(
	aiReadiness: AIReadinessData,
	includeContent: boolean,
): string {
	const parts: string[] = [];

	// Robots.txt status
	const { summary } = aiReadiness.robotsTxtAnalysis;
	if (summary.blocked > 0) {
		parts.push(
			`${summary.blocked} AI bot${summary.blocked > 1 ? "s" : ""} blocked`,
		);
	} else {
		parts.push("AI bots accessible");
	}

	// llms.txt
	if (aiReadiness.llmsTxt.exists) {
		parts.push("llms.txt present");
	}

	// Content structure (for paid tiers)
	if (includeContent) {
		const { structuredData, contentQuality } = aiReadiness.contentStructure;
		if (structuredData.hasFAQSchema) {
			parts.push("FAQ schema");
		}
		if (contentQuality.pagesWithThinContent > 0) {
			parts.push(`${contentQuality.pagesWithThinContent} thin pages`);
		}
	}

	return parts.join(", ") || "AI readiness analyzed";
}

function createUpgradeRequiredComponent<T extends number>(
	max: T,
): HealthScoreComponent & { max: T } {
	return { score: 0, max, detail: "Upgrade for full analysis" };
}

function createNewSiteComponent<T extends number>(
	max: T,
	detail: string,
): HealthScoreComponent & { max: T } {
	return { score: 0, max, detail };
}

export function calculateHealthScore(
	analysis: AnalysisResult,
	pagesFound: number,
	options: HealthScoreOptions = {},
): HealthScore {
	const { isFreeTier = false, isNewSite = false, tier = "AUDIT" } = options;

	// Determine effective tier for AI readiness calculation
	const effectiveTier = isFreeTier ? "FREE" : tier;

	// Free tier: technical assessment + basic AI readiness
	// Paid tiers: full 7-component analysis
	const breakdown: HealthScoreBreakdown = isFreeTier
		? {
				opportunityDiscovery: createUpgradeRequiredComponent(30),
				rankingCoverage: createUpgradeRequiredComponent(20),
				positionQuality: createUpgradeRequiredComponent(15),
				technicalHealth: calculateTechnicalHealth(analysis, pagesFound),
				internalLinking: calculateInternalLinking(analysis, pagesFound),
				contentOpportunity: createUpgradeRequiredComponent(10),
				aiReadiness: calculateAIReadiness(analysis.aiReadiness, "FREE"),
			}
		: {
				opportunityDiscovery: calculateOpportunityDiscovery(analysis),
				rankingCoverage: calculateRankingCoverage(analysis, pagesFound),
				positionQuality: calculatePositionQuality(analysis),
				technicalHealth: calculateTechnicalHealth(analysis, pagesFound),
				internalLinking: calculateInternalLinking(analysis, pagesFound),
				contentOpportunity: calculateContentOpportunity(analysis),
				aiReadiness: calculateAIReadiness(analysis.aiReadiness, effectiveTier),
			};

	if (isFreeTier) {
		// Free tier: technical + linking + basic AI readiness (max 27)
		// Normalize to 0-100 scale for consistent grading
		const rawScore =
			breakdown.technicalHealth.score +
			breakdown.internalLinking.score +
			breakdown.aiReadiness.score;
		const normalizedScore = Math.round((rawScore / POINTS.FREE_TIER_MAX) * 100);

		return {
			score: normalizedScore,
			grade: getGrade(normalizedScore),
			breakdown,
		};
	}

	// New site: rankings don't exist yet, so normalize score based on achievable factors
	// Focus: technical foundation + opportunity discovery (what they CAN improve/measure)
	if (isNewSite) {
		// For new sites, ranking-based metrics are N/A - mark them clearly
		breakdown.rankingCoverage = createNewSiteComponent(
			20,
			"Rankings build over time",
		);
		breakdown.positionQuality = createNewSiteComponent(
			15,
			"No rankings yet (expected)",
		);

		// Score from achievable components (excludes ranking-dependent)
		const achievableScore =
			breakdown.opportunityDiscovery.score +
			breakdown.technicalHealth.score +
			breakdown.internalLinking.score +
			breakdown.contentOpportunity.score +
			breakdown.aiReadiness.score;

		const normalizedScore = Math.round(
			(achievableScore / POINTS.NEW_SITE_MAX) * 100,
		);

		return {
			score: normalizedScore,
			grade: getGrade(normalizedScore),
			breakdown,
		};
	}

	// Full analysis: normalize to 100-point scale
	const rawScore =
		breakdown.opportunityDiscovery.score +
		breakdown.rankingCoverage.score +
		breakdown.positionQuality.score +
		breakdown.technicalHealth.score +
		breakdown.internalLinking.score +
		breakdown.contentOpportunity.score +
		breakdown.aiReadiness.score;

	const normalizedScore = Math.round((rawScore / POINTS.FULL_MAX) * 100);

	return {
		score: normalizedScore,
		grade: getGrade(normalizedScore),
		breakdown,
	};
}
