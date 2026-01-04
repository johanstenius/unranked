/**
 * SEO Analysis Types
 *
 * Type definitions for SEO analysis results.
 * The actual analysis is now done by components in ./components/
 */

import type { QuickWinSuggestions, SearchIntent } from "../ai/anthropic.js";
import type { CoreWebVitalsData } from "./components/types.js";
import type { DiscoveredCompetitor } from "./dataforseo.js";
import type { InternalLinkingIssues } from "./internal-linking.js";

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
	severity: "high" | "medium" | "low";
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

export type ActionType =
	| "fix_technical"
	| "add_internal_links"
	| "optimize_existing"
	| "create_content"
	| "fix_cannibalization"
	| "steal_snippet";

export type ActionCategory =
	| "technical"
	| "content"
	| "linking"
	| "optimization";

export type PrioritizedAction = {
	id: string;
	priority: number;
	type: ActionType;
	title: string;
	description: string;
	url?: string;
	keyword?: string;
	estimatedImpact: {
		trafficGain?: number;
		searchVolume?: number;
	};
	effort: "low" | "medium" | "high";
	category: ActionCategory;
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
	actionPlan: PrioritizedAction[];
	coreWebVitals?: CoreWebVitalsData;
};
