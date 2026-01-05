"use client";

import {
	AnalysisProgressCard,
	BriefsTab,
	CannibalizationSummary,
	CompetitorAnalysis,
	HealthScoreCard,
	InternalLinkingSummary,
	OpportunitiesTab,
	OverviewTab,
	PerformanceTab,
	ProgressiveStats,
	QuickWinsTab,
	TechnicalTab,
	UpgradeBanner,
} from "@/components/audit";
import { downloadAuditPdf } from "@/components/audit-pdf";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { LoadingScreen, Spinner } from "@/components/ui/spinner";
import { useAuditState } from "@/hooks/useAuditState";
import { getAuditBriefs, tierInfo } from "@/lib/api";
import type {
	Analysis,
	Audit,
	AuditProgress,
	Brief,
	ComponentState,
} from "@/lib/types";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

type TabType =
	| "overview"
	| "opportunities"
	| "quickwins"
	| "technical"
	| "performance"
	| "briefs";

const TAB_LABELS: Record<TabType, string> = {
	overview: "Overview",
	opportunities: "Opportunities",
	quickwins: "Quick Wins",
	technical: "Technical Issues",
	performance: "Performance",
	briefs: "Content Briefs",
};

/**
 * Extract component status for legacy progress format
 */
function extractStatus(component: ComponentState<unknown>): string {
	return component.status;
}

function AuditContent() {
	const params = useParams();
	const searchParams = useSearchParams();
	const token = params.token as string;
	const success = searchParams.get("success") === "true";

	// Use unified state hook
	const { state, loading, error } = useAuditState(token);

	// Local UI state
	const [briefs, setBriefs] = useState<Brief[]>([]);
	const [activeTab, setActiveTab] = useState<TabType>("overview");
	const [healthScoreExpanded, setHealthScoreExpanded] = useState(false);
	const [pdfExporting, setPdfExporting] = useState(false);

	// Fetch briefs when completed (briefs not streamed via SSE)
	useEffect(() => {
		if (state?.status === "COMPLETED") {
			getAuditBriefs(token)
				.then(setBriefs)
				.catch((err) => console.error("Failed to fetch briefs:", err));
		}
	}, [state?.status, token]);

	// Transform unified state to legacy Analysis format for components
	const analysis: Analysis | null = useMemo(() => {
		if (!state) return null;

		const { components } = state;

		// Only build analysis if we have some completed components
		const hasData =
			components.technical.status === "completed" ||
			components.rankings.status === "completed" ||
			components.opportunities.status === "completed";

		if (!hasData) return null;

		return {
			currentRankings:
				components.rankings.status === "completed"
					? components.rankings.data
					: [],
			opportunities:
				components.opportunities.status === "completed"
					? components.opportunities.data
					: [],
			opportunityClusters: state.opportunityClusters ?? [],
			quickWins:
				components.quickWins.status === "completed"
					? components.quickWins.data
					: [],
			technicalIssues:
				components.technical.status === "completed"
					? components.technical.data
					: [],
			internalLinkingIssues:
				components.internalLinking.status === "completed"
					? components.internalLinking.data
					: { orphanPages: [], underlinkedPages: [] },
			competitorGaps:
				components.competitors.status === "completed"
					? components.competitors.data.gaps
					: [],
			cannibalizationIssues:
				components.cannibalization.status === "completed"
					? components.cannibalization.data
					: [],
			snippetOpportunities:
				components.snippets.status === "completed"
					? components.snippets.data
					: [],
			sectionStats: [],
			healthScore: state.healthScore,
			discoveredCompetitors:
				components.competitors.status === "completed"
					? components.competitors.data.discovered
					: [],
			actionPlan: state.actionPlan,
			coreWebVitals:
				components.coreWebVitals.status === "completed"
					? components.coreWebVitals.data
					: undefined,
		};
	}, [state]);

	// Transform unified state to legacy Audit format for components
	const audit: Audit | null = useMemo(() => {
		if (!state) return null;

		// Build legacy progress from component states
		const progress: AuditProgress = {
			crawl: extractStatus(state.components.crawl) as AuditProgress["crawl"],
			technicalIssues: extractStatus(
				state.components.technical,
			) as AuditProgress["technicalIssues"],
			internalLinking: extractStatus(
				state.components.internalLinking,
			) as AuditProgress["internalLinking"],
			duplicateContent: extractStatus(
				state.components.duplicateContent,
			) as AuditProgress["duplicateContent"],
			redirectChains: extractStatus(
				state.components.redirectChains,
			) as AuditProgress["redirectChains"],
			coreWebVitals: extractStatus(
				state.components.coreWebVitals,
			) as AuditProgress["coreWebVitals"],
			currentRankings: extractStatus(
				state.components.rankings,
			) as AuditProgress["currentRankings"],
			competitorAnalysis: extractStatus(
				state.components.competitors,
			) as AuditProgress["competitorAnalysis"],
			keywordOpportunities: extractStatus(
				state.components.opportunities,
			) as AuditProgress["keywordOpportunities"],
			intentClassification: "pending" as AuditProgress["intentClassification"],
			keywordClustering: "pending" as AuditProgress["keywordClustering"],
			quickWins: extractStatus(
				state.components.quickWins,
			) as AuditProgress["quickWins"],
			briefs: extractStatus(state.components.briefs) as AuditProgress["briefs"],
			retryCount: 0,
		};

		return {
			accessToken: state.accessToken,
			status: state.status,
			siteUrl: state.siteUrl,
			productDesc: null,
			competitors: [],
			sections: null,
			detectedSections: null,
			tier: state.tier,
			pagesFound: state.pagesFound,
			sitemapUrlCount: state.sitemapUrlCount,
			currentRankings:
				state.components.rankings.status === "completed"
					? state.components.rankings.data
					: null,
			progress,
			retryAfter: null,
			createdAt: state.createdAt,
			startedAt: null,
			completedAt: state.completedAt,
		};
	}, [state]);

	const handleExportPdf = useCallback(async () => {
		if (!audit || !analysis) return;
		setPdfExporting(true);
		try {
			await downloadAuditPdf(audit, analysis, briefs);
		} catch (err) {
			console.error("PDF export failed:", err);
		} finally {
			setPdfExporting(false);
		}
	}, [audit, analysis, briefs]);

	if (loading) {
		return <LoadingScreen message="Loading audit..." />;
	}

	if (error || !state || !audit) {
		return (
			<div className="min-h-screen bg-canvas flex items-center justify-center">
				<div className="text-center">
					<div className="text-status-crit mb-4">
						{error || "Audit not found"}
					</div>
					<Link href="/" className="text-accent hover:underline">
						Go back home
					</Link>
				</div>
			</div>
		);
	}

	const isProcessing =
		state.status !== "COMPLETED" && state.status !== "FAILED";
	const isFreeTier = state.tier === "FREE";
	const hostname = new URL(state.siteUrl).hostname;

	// CWV data from streaming + final
	const cwvPages = state.cwvStream;
	const cwvData =
		state.components.coreWebVitals.status === "completed"
			? state.components.coreWebVitals.data
			: null;
	const healthScore = state.healthScore;

	return (
		<div className="min-h-screen bg-canvas">
			<nav className="h-[60px] bg-canvas/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
				<div className="max-w-[1100px] mx-auto px-10 h-full flex items-center justify-between">
					<Link href="/" className="flex items-center gap-2">
						<Logo size={18} />
						<span className="font-display font-semibold text-text-primary">
							Unranked
						</span>
					</Link>
					<ThemeToggle />
				</div>
			</nav>

			<main className="py-12 px-10">
				<div className="max-w-[1100px] mx-auto">
					<Breadcrumb className="mb-6">
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href="/">Home</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>{hostname}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>

					{success && isProcessing && (
						<div className="p-4 bg-status-good-bg border border-status-good rounded mb-8 text-sm text-status-good">
							Payment successful! Your audit is now processing.
						</div>
					)}

					{state.status === "FAILED" && (
						<div className="p-8 bg-status-crit-bg border border-status-crit rounded">
							<h2 className="font-display text-xl font-semibold text-status-crit mb-2">
								Analysis Failed
							</h2>
							<p className="text-status-crit">
								Something went wrong while analyzing your website. Please
								contact support.
							</p>
						</div>
					)}

					{state.status !== "FAILED" && (
						<>
							{/* Unified progress card during analysis */}
							{isProcessing && (
								<AnalysisProgressCard
									audit={audit}
									progress={audit.progress}
									cwvPages={cwvPages}
									cwvTotal={Math.min(
										state.pagesFound ?? tierInfo[state.tier].pages,
										tierInfo[state.tier].pages,
									)}
									healthScore={healthScore}
								/>
							)}

							<div className="flex items-start justify-between mb-10">
								<div>
									<div className="text-sm text-text-tertiary mb-2">
										{isProcessing
											? "Analysis in progress"
											: "Analysis completed"}
									</div>
									<h1 className="font-display text-3xl text-text-primary font-bold">
										{hostname}
									</h1>
									<p className="text-text-secondary mt-2">
										{new Date(
											state.completedAt || state.createdAt,
										).toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</p>
								</div>
								<div className="flex gap-2">
									{!isProcessing && tierInfo[state.tier].pdfExport && (
										<button
											type="button"
											onClick={handleExportPdf}
											disabled={pdfExporting}
											className="h-10 px-5 bg-surface border border-border text-sm font-medium text-text-primary rounded-lg hover:border-border-active hover:bg-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
										>
											{pdfExporting && <Spinner className="w-4 h-4" />}
											{pdfExporting ? "Exporting..." : "Export PDF"}
										</button>
									)}
								</div>
							</div>

							{/* Health score - only show when completed */}
							{!isProcessing && (
								<HealthScoreCard
									healthScore={healthScore}
									expanded={healthScoreExpanded}
									onToggle={() => setHealthScoreExpanded(!healthScoreExpanded)}
									isFreeTier={isFreeTier}
								/>
							)}

							{isFreeTier && analysis && (
								<UpgradeBanner auditToken={token} analysis={analysis} />
							)}

							<ProgressiveStats
								audit={audit}
								analysis={analysis}
								progress={audit.progress}
								isProcessing={isProcessing}
								isFreeTier={isFreeTier}
							/>

							<div className="flex gap-1 mb-10">
								{(Object.keys(TAB_LABELS) as TabType[])
									.filter((tab) => {
										// Hide briefs tab for tiers with 0 briefs
										if (tab === "briefs" && tierInfo[state.tier].briefs === 0) {
											return false;
										}
										// Hide opportunities, quickwins, and performance for FREE tier
										if (
											isFreeTier &&
											(tab === "opportunities" ||
												tab === "quickwins" ||
												tab === "performance")
										) {
											return false;
										}
										return true;
									})
									.map((tab) => (
										<button
											key={tab}
											type="button"
											onClick={() => setActiveTab(tab)}
											className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
												activeTab === tab
													? "bg-accent text-canvas"
													: "text-text-secondary hover:text-text-primary hover:bg-subtle"
											}`}
										>
											{TAB_LABELS[tab]}
										</button>
									))}
							</div>

							<div className="grid grid-cols-3 gap-6">
								<div className="col-span-2 space-y-6">
									{activeTab === "overview" && analysis && (
										<OverviewTab
											analysis={analysis}
											onViewAllOpportunities={() =>
												setActiveTab("opportunities")
											}
											onViewPerformance={
												!isFreeTier
													? () => setActiveTab("performance")
													: undefined
											}
										/>
									)}
									{activeTab === "opportunities" && analysis && (
										<OpportunitiesTab analysis={analysis} />
									)}
									{activeTab === "quickwins" && analysis && (
										<QuickWinsTab analysis={analysis} />
									)}
									{activeTab === "technical" && analysis && (
										<TechnicalTab analysis={analysis} />
									)}
									{activeTab === "performance" && (
										<PerformanceTab
											data={cwvData ?? analysis?.coreWebVitals ?? null}
											streamingPages={cwvPages}
											isAnalyzing={
												isProcessing &&
												state.components.coreWebVitals.status !== "completed"
											}
										/>
									)}
									{activeTab === "briefs" && (
										<BriefsTab briefs={briefs} auditToken={token} />
									)}
								</div>

								<div className="space-y-6">
									{analysis && tierInfo[state.tier].competitors > 0 && (
										<CompetitorAnalysis analysis={analysis} />
									)}
									{analysis && (
										<InternalLinkingSummary
											analysis={analysis}
											onViewDetails={() => setActiveTab("technical")}
										/>
									)}
									{analysis && !isFreeTier && (
										<CannibalizationSummary
											analysis={analysis}
											onViewDetails={() => setActiveTab("technical")}
										/>
									)}
								</div>
							</div>
						</>
					)}
				</div>
			</main>
		</div>
	);
}

export default function AuditPage() {
	return (
		<Suspense fallback={<LoadingScreen message="Loading audit..." />}>
			<AuditContent />
		</Suspense>
	);
}
