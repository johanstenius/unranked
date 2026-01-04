/**
 * Types for analysis data stored in the database (audit.opportunities JSON field).
 * Shared between pipeline service and retry jobs.
 */

import type {
	CompetitorGap,
	OpportunityCluster,
	PrioritizedAction,
	QuickWin,
	TechnicalIssue,
} from "../services/seo/analysis.js";

export type StoredRanking = {
	url: string;
	keyword: string;
	position: number;
	searchVolume: number;
	estimatedTraffic: number;
};

export type StoredOpportunity = {
	keyword: string;
	searchVolume: number;
	difficulty: number;
	impactScore: number;
	reason: string;
	competitorUrl?: string;
	intent?: string;
};

export type StoredHealthScore = {
	score: number;
	grade: string;
};

export type StoredAnalysisData = {
	currentRankings?: StoredRanking[];
	opportunities?: StoredOpportunity[];
	opportunityClusters?: OpportunityCluster[];
	quickWins?: QuickWin[];
	competitorGaps?: CompetitorGap[];
	technicalIssues?: TechnicalIssue[];
	healthScore?: StoredHealthScore;
	actionPlan?: PrioritizedAction[];
};
