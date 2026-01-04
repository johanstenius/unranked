"use client";

import { AnalysisProgress } from "@/components/analysis-progress";
import {
	BriefsTab,
	CannibalizationSummary,
	CompetitorAnalysis,
	HealthScoreCard,
	InternalLinkingSummary,
	OpportunitiesTab,
	OverviewTab,
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
	resendReportEmail,
	tierInfo,
} from "@/lib/api";
import type { Analysis, Audit, Brief } from "@/lib/types";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

type TabType =
	| "overview"
	| "opportunities"
	| "quickwins"
	| "technical"
	| "briefs";

const TAB_LABELS: Record<TabType, string> = {
	overview: "Overview",
	opportunities: "Opportunities",
	quickwins: "Quick Wins",
	technical: "Technical Issues",
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
	const [emailResending, setEmailResending] = useState(false);
	const [emailResent, setEmailResent] = useState(false);

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

	const handleResendEmail = useCallback(async () => {
		if (!token) return;
		setEmailResending(true);
		try {
			await resendReportEmail(token);
			setEmailResent(true);
			setTimeout(() => setEmailResent(false), 3000);
		} catch (err) {
			console.error("Resend email failed:", err);
		} finally {
			setEmailResending(false);
		}
	}, [token]);

	useEffect(() => {
		let interval: NodeJS.Timeout | null = null;

		async function fetchData() {
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
					if (interval) clearInterval(interval);
				} else if (auditData.status === "FAILED") {
					if (interval) clearInterval(interval);
				}

				setLoading(false);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load audit");
				setLoading(false);
				if (interval) clearInterval(interval);
			}
		}

		fetchData();
		interval = setInterval(fetchData, 3000);

		return () => {
			if (interval) clearInterval(interval);
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
	const totalOpportunityVolume =
		analysis?.opportunities.reduce((sum, o) => sum + o.searchVolume, 0) ?? 0;
	const totalEstTraffic =
		analysis?.currentRankings.reduce((sum, r) => sum + r.estimatedTraffic, 0) ??
		0;
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

					{isProcessing && (
						<AnalysisProgress audit={audit} hostname={hostname} />
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

					{audit.status === "COMPLETED" && (
						<>
							<div className="flex items-start justify-between mb-10">
								<div>
									<div className="text-sm text-text-tertiary mb-2">
										Analysis completed
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
									{tierInfo[audit.tier].pdfExport && (
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
									<button
										type="button"
										onClick={handleResendEmail}
										disabled={emailResending || emailResent}
										className="h-10 px-5 bg-surface border border-border text-sm font-medium text-text-primary rounded-lg hover:border-border-active hover:bg-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
									>
										{emailResending && <Spinner className="w-4 h-4" />}
										{emailResent
											? "Email sent!"
											: emailResending
												? "Sending..."
												: "Resend Email"}
									</button>
								</div>
							</div>

							{analysis?.healthScore && (
								<HealthScoreCard
									healthScore={analysis.healthScore}
									expanded={healthScoreExpanded}
									onToggle={() => setHealthScoreExpanded(!healthScoreExpanded)}
									isFreeTier={isFreeTier}
								/>
							)}

							{isFreeTier && (
								<UpgradeBanner auditToken={token} analysis={analysis} />
							)}

							{isFreeTier ? (
								<div className="grid grid-cols-2 gap-4 mb-10">
									<div className="bg-surface border border-border rounded-xl p-6">
										<p className="font-display text-4xl tracking-tight text-text-primary font-bold">
											{audit.pagesFound ?? 0}
										</p>
										<p className="text-sm text-text-secondary mt-2">
											Pages crawled
										</p>
									</div>
									<div className="bg-surface border border-border rounded-xl p-6">
										<p className="font-display text-4xl tracking-tight text-text-primary font-bold">
											{analysis?.technicalIssues.length ?? 0}
										</p>
										<p className="text-sm text-text-secondary mt-2">
											Technical issues
										</p>
									</div>
								</div>
							) : (
								<div className="grid grid-cols-5 gap-4 mb-10">
									<div className="bg-surface border border-border rounded-xl p-5">
										<p className="font-display text-3xl tracking-tight text-text-primary font-bold">
											{audit.pagesFound ?? 0}
										</p>
										<p className="text-sm text-text-secondary mt-2">
											Pages crawled
										</p>
									</div>
									<div className="bg-surface border border-border rounded-xl p-5">
										<p className="font-display text-3xl tracking-tight text-text-primary font-bold">
											{analysis?.currentRankings.length ?? 0}
										</p>
										<p className="text-sm text-text-secondary mt-2">
											Keywords ranking
										</p>
									</div>
									<div className="bg-surface border border-border rounded-xl p-5">
										<p className="font-display text-3xl tracking-tight text-accent-teal font-bold">
											~{totalEstTraffic.toLocaleString()}
										</p>
										<p className="text-sm text-text-secondary mt-2">
											Est. monthly traffic
										</p>
									</div>
									<div className="bg-surface border border-border rounded-xl p-5">
										<p className="font-display text-3xl tracking-tight text-accent-indigo font-bold">
											{analysis?.opportunities.length ?? 0}
										</p>
										<p className="text-sm text-text-secondary mt-2">
											Opportunities
										</p>
									</div>
									<div className="bg-surface border border-border rounded-xl p-5">
										<p className="font-display text-3xl tracking-tight text-text-primary font-bold">
											~{totalOpportunityVolume.toLocaleString()}
										</p>
										<p className="text-sm text-text-secondary mt-2">
											Potential traffic
										</p>
									</div>
								</div>
							)}

							<div className="flex gap-1 mb-10">
								{(Object.keys(TAB_LABELS) as TabType[])
									.filter((tab) => {
										// Hide briefs tab for tiers with 0 briefs
										if (tab === "briefs" && tierInfo[audit.tier].briefs === 0) {
											return false;
										}
										// Hide opportunities and quickwins for FREE tier (no DataForSEO/AI)
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
									{activeTab === "overview" && analysis && (
										<OverviewTab
											analysis={analysis}
											onViewAllOpportunities={() =>
												setActiveTab("opportunities")
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
