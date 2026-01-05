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
import {
	getAudit,
	getAuditAnalysis,
	getAuditBriefs,
	subscribeToAudit,
	tierInfo,
} from "@/lib/api";
import type {
	Analysis,
	Audit,
	AuditSSEEvent,
	Brief,
	CWVPageResult,
	CoreWebVitalsData,
	HealthScore,
} from "@/lib/types";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

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

function AuditContent() {
	const params = useParams();
	const searchParams = useSearchParams();
	const token = params.token as string;
	const success = searchParams.get("success") === "true";

	const [audit, setAudit] = useState<Audit | null>(null);
	const [briefs, setBriefs] = useState<Brief[]>([]);
	const [analysis, setAnalysis] = useState<Analysis | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<TabType>("overview");
	const [healthScoreExpanded, setHealthScoreExpanded] = useState(false);
	const [pdfExporting, setPdfExporting] = useState(false);
	const [cwvPages, setCwvPages] = useState<CWVPageResult[]>([]);
	const [cwvData, setCwvData] = useState<CoreWebVitalsData | null>(null);
	const [healthScore, setHealthScore] = useState<HealthScore | null>(null);

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

	useEffect(() => {
		let sseConnection: { close: () => void } | null = null;

		async function fetchInitialData() {
			try {
				const auditData = await getAudit(token);
				setAudit(auditData);

				if (auditData.status === "COMPLETED") {
					const [briefsData, analysisData] = await Promise.all([
						getAuditBriefs(token),
						getAuditAnalysis(token),
					]);
					setBriefs(briefsData);
					setAnalysis(analysisData);
					setHealthScore(analysisData.healthScore);
				} else if (auditData.status !== "FAILED") {
					// Subscribe to SSE for real-time updates
					sseConnection = subscribeToAudit(
						token,
						(event: AuditSSEEvent) => {
							switch (event.type) {
								case "status":
									setAudit((prev) =>
										prev ? { ...prev, status: event.status } : prev,
									);
									break;
								case "progress":
									setAudit((prev) =>
										prev ? { ...prev, progress: event.progress } : prev,
									);
									break;
								case "component":
									console.log(
										"[SSE] component event:",
										event.key,
										event.status,
									);
									setAudit((prev) => {
										if (!prev) return prev;
										const currentProgress = prev.progress ?? {
											crawl: "pending" as const,
											technicalIssues: "pending" as const,
											internalLinking: "pending" as const,
											duplicateContent: "pending" as const,
											redirectChains: "pending" as const,
											coreWebVitals: "pending" as const,
											currentRankings: "pending" as const,
											competitorAnalysis: "pending" as const,
											keywordOpportunities: "pending" as const,
											intentClassification: "pending" as const,
											keywordClustering: "pending" as const,
											quickWins: "pending" as const,
											briefs: "pending" as const,
											retryCount: 0,
										};
										return {
											...prev,
											progress: {
												...currentProgress,
												[event.key]: event.status,
											},
										};
									});
									break;
								case "cwv":
									setCwvPages((prev) => {
										const exists = prev.some((p) => p.url === event.page.url);
										if (exists) return prev;
										return [...prev, event.page];
									});
									break;
								case "cwv-complete":
									setCwvData(event.data);
									break;
								case "health":
									setHealthScore(event.score);
									break;
								case "partial-ready":
									// Fetch partial analysis + updated audit (for pagesFound)
									// Preserve SSE-updated progress to avoid race condition
									Promise.all([getAuditAnalysis(token), getAudit(token)])
										.then(([analysisData, auditData]) => {
											setAnalysis(analysisData);
											setAudit((prev) => ({
												...auditData,
												progress: prev?.progress ?? auditData.progress,
											}));
										})
										.catch((err) => {
											console.error("Failed to fetch partial data:", err);
										});
									break;
								case "complete":
									// Fetch full data on completion
									Promise.all([
										getAuditBriefs(token),
										getAuditAnalysis(token),
										getAudit(token),
									])
										.then(([briefsData, analysisData, auditData]) => {
											setBriefs(briefsData);
											setAnalysis(analysisData);
											setAudit(auditData);
											setHealthScore(analysisData.healthScore);
										})
										.catch((err) => {
											console.error(
												"Failed to fetch completed audit data:",
												err,
											);
											setError("Failed to load audit results");
										});
									sseConnection?.close();
									break;
							}
						},
						(err) => {
							console.error("SSE error:", err);
						},
					);
				}

				setLoading(false);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load audit");
				setLoading(false);
			}
		}

		fetchInitialData();

		return () => {
			sseConnection?.close();
		};
	}, [token]);

	if (loading) {
		return <LoadingScreen message="Loading audit..." />;
	}

	if (error || !audit) {
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
		audit.status !== "COMPLETED" && audit.status !== "FAILED";
	const isFreeTier = audit.tier === "FREE";
	const hostname = new URL(audit.siteUrl).hostname;

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

					{audit.status === "FAILED" && (
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

					{audit.status !== "FAILED" && (
						<>
							{/* Unified progress card during analysis */}
							{isProcessing && (
								<AnalysisProgressCard
									audit={audit}
									progress={audit.progress}
									cwvPages={cwvPages}
									cwvTotal={Math.min(
										audit.pagesFound ?? tierInfo[audit.tier].pages,
										tierInfo[audit.tier].pages,
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
											audit.completedAt || audit.createdAt,
										).toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</p>
								</div>
								<div className="flex gap-2">
									{!isProcessing && tierInfo[audit.tier].pdfExport && (
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
								isProcessing={isProcessing}
								isFreeTier={isFreeTier}
							/>

							<div className="flex gap-1 mb-10">
								{(Object.keys(TAB_LABELS) as TabType[])
									.filter((tab) => {
										// Hide briefs tab for tiers with 0 briefs
										if (tab === "briefs" && tierInfo[audit.tier].briefs === 0) {
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
												(!audit.progress?.coreWebVitals ||
													audit.progress?.coreWebVitals === "running" ||
													audit.progress?.coreWebVitals === "pending")
											}
										/>
									)}
									{activeTab === "briefs" && (
										<BriefsTab briefs={briefs} auditToken={token} />
									)}
								</div>

								<div className="space-y-6">
									{analysis && tierInfo[audit.tier].competitors > 0 && (
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
