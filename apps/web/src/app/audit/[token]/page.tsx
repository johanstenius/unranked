"use client";

import {
	AITab,
	AnalysisProgressCard,
	BriefsTab,
	CompetitorAnalysis,
	CompetitorSelectionCard,
	HealthScoreCard,
	InternalLinkingSummary,
	NewSiteBanner,
	OpportunitiesTab,
	OverviewTab,
	ProgressiveStats,
	QuickWinsTab,
	SelectionLayout,
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
import { type BriefGenerationEvent, TIERS, generateBriefs } from "@/lib/api";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

type TabType =
	| "overview"
	| "opportunities"
	| "quickwins"
	| "technical"
	| "ai"
	| "briefs";

const TAB_LABELS: Record<TabType, string> = {
	overview: "Overview",
	opportunities: "Opportunities",
	quickwins: "Quick Wins",
	technical: "Technical Issues",
	ai: "AI",
	briefs: "Content Briefs",
};

function AuditContent() {
	const params = useParams();
	const searchParams = useSearchParams();
	const token = params.token as string;
	const success = searchParams.get("success") === "true";

	// Use unified state hook
	const { state, loading, error, refetch } = useAuditState(token);

	// Local UI state
	const [activeTab, setActiveTab] = useState<TabType>("overview");
	const [healthScoreExpanded, setHealthScoreExpanded] = useState(false);
	const [pdfExporting, setPdfExporting] = useState(false);
	const [isGeneratingBriefs, setIsGeneratingBriefs] = useState(false);

	const handleExportPdf = useCallback(async () => {
		if (!state) return;
		setPdfExporting(true);
		try {
			await downloadAuditPdf(state);
		} catch (err) {
			console.error("PDF export failed:", err);
		} finally {
			setPdfExporting(false);
		}
	}, [state]);

	const handleGenerateBriefs = useCallback(
		async (clusterTopics: string[]) => {
			if (!state || isGeneratingBriefs) return;
			setIsGeneratingBriefs(true);

			try {
				await generateBriefs(
					token,
					clusterTopics,
					(_event: BriefGenerationEvent) => {
						// Could show progress here in future
					},
				);
				// Refetch to get updated briefs from server
				await refetch();
			} catch (err) {
				console.error("Brief generation failed:", err);
			} finally {
				setIsGeneratingBriefs(false);
			}
		},
		[state, token, isGeneratingBriefs, refetch],
	);

	if (loading) {
		return <LoadingScreen message="Loading audit..." />;
	}

	if (error || !state) {
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

	const { components } = state;
	const isProcessing =
		state.status !== "COMPLETED" && state.status !== "FAILED";
	const isFreeTier = state.tier === "FREE";
	const hostname = new URL(state.siteUrl).hostname;

	const healthScore = state.healthScore;

	// Selection phases: focused layout without dashboard elements
	if (state.status === "SELECTING_COMPETITORS") {
		return (
			<SelectionLayout
				hostname={hostname}
				currentStep={1}
				crawlProgress={{
					pagesFound: state.pagesFound ?? 0,
					complete: state.crawlComplete ?? false,
				}}
			>
				<CompetitorSelectionCard
					suggestions={state.suggestedCompetitors ?? []}
					maxSelections={state.tierConfig.limits.competitors}
					accessToken={token}
					onComplete={refetch}
				/>
			</SelectionLayout>
		);
	}

	// Full dashboard layout for non-selection phases
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
							{/* Show progress card for CRAWLING and ANALYZING states */}
							{(state.status === "CRAWLING" ||
								state.status === "ANALYZING") && (
								<AnalysisProgressCard
									status={state.status}
									pagesFound={state.pagesFound}
									sitemapUrlCount={state.sitemapUrlCount}
									components={components}
									phases={state.tierConfig.phases}
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
									{!isProcessing && TIERS[state.tier].limits.pdfExport && (
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

							{/* New site banner - show when completed and is new site */}
							{!isProcessing && state.isNewSite && (
								<NewSiteBanner hostname={hostname} />
							)}

							{/* Health score - only show when completed */}
							{!isProcessing && (
								<HealthScoreCard
									healthScore={healthScore}
									expanded={healthScoreExpanded}
									onToggle={() => setHealthScoreExpanded(!healthScoreExpanded)}
									isFreeTier={isFreeTier}
									isNewSite={state.isNewSite}
								/>
							)}

							{isFreeTier && (
								<UpgradeBanner
									auditToken={token}
									opportunities={components.opportunities}
								/>
							)}

							<ProgressiveStats
								pagesFound={state.pagesFound}
								rankings={components.rankings}
								opportunities={components.opportunities}
								technical={components.technical}
								isProcessing={isProcessing}
								isFreeTier={isFreeTier}
							/>

							<div className="flex gap-1 mb-10">
								{(Object.keys(TAB_LABELS) as TabType[])
									.filter((tab) => {
										// Hide briefs tab for tiers with 0 briefs
										if (
											tab === "briefs" &&
											TIERS[state.tier].limits.briefs === 0
										) {
											return false;
										}
										// Hide opportunities and quickwins for FREE tier
										if (
											isFreeTier &&
											(tab === "opportunities" || tab === "quickwins")
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
									{activeTab === "overview" && (
										<OverviewTab
											rankings={components.rankings}
											opportunities={components.opportunities}
											actionPlan={state.actionPlan ?? []}
											onViewAllOpportunities={() =>
												setActiveTab("opportunities")
											}
											isFreeTier={isFreeTier}
											technicalIssueCount={
												components.technical.status === "completed"
													? components.technical.data.length
													: 0
											}
											pagesFound={state.pagesFound}
											isProcessing={isProcessing}
										/>
									)}
									{activeTab === "opportunities" && (
										<OpportunitiesTab
											opportunities={components.opportunities}
											snippets={components.snippets}
											isNewSite={state.isNewSite}
										/>
									)}
									{activeTab === "quickwins" && (
										<QuickWinsTab
											quickWins={components.quickWins}
											isNewSite={state.isNewSite}
										/>
									)}
									{activeTab === "technical" && (
										<TechnicalTab
											technical={components.technical}
											internalLinking={components.internalLinking}
										/>
									)}
									{activeTab === "ai" && (
										<AITab aiReadiness={components.aiReadiness} />
									)}
									{activeTab === "briefs" && (
										<BriefsTab
											briefs={components.briefs}
											auditToken={token}
											briefsLimit={TIERS[state.tier].limits.briefs}
											recommendations={state.briefRecommendations ?? []}
											onGenerateBriefs={handleGenerateBriefs}
											isGenerating={isGeneratingBriefs}
										/>
									)}
								</div>

								<div className="space-y-6">
									{TIERS[state.tier].limits.competitors > 0 && (
										<CompetitorAnalysis competitors={components.competitors} />
									)}
									<InternalLinkingSummary
										internalLinking={components.internalLinking}
										onViewDetails={() => setActiveTab("technical")}
									/>
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
