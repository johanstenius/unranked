"use client";

import type {
	Audit,
	AuditProgress,
	CWVPageResult,
	ComponentStatus,
	HealthScore,
} from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";

type AnalysisProgressCardProps = {
	audit: Audit;
	progress: AuditProgress | null;
	cwvPages: CWVPageResult[];
	cwvTotal: number;
	healthScore: HealthScore | null;
	onComplete?: () => void;
};

// Pipeline phases - some run in parallel but shown separately
type Phase = {
	key: string;
	label: string;
	runningLabel: string;
	progressKey: keyof AuditProgress;
};

const PHASES: Phase[] = [
	{
		key: "crawl",
		label: "Crawl",
		runningLabel: "Discovering pages",
		progressKey: "crawl",
	},
	{
		key: "technical",
		label: "Technical",
		runningLabel: "Checking technical SEO",
		progressKey: "technicalIssues",
	},
	{
		key: "performance",
		label: "Performance",
		runningLabel: "Measuring page speed",
		progressKey: "coreWebVitals",
	},
	{
		key: "rankings",
		label: "Rankings",
		runningLabel: "Analyzing rankings",
		progressKey: "currentRankings",
	},
	{
		key: "opportunities",
		label: "Opportunities",
		runningLabel: "Finding opportunities",
		progressKey: "keywordOpportunities",
	},
];

const VALID_STATUSES: ComponentStatus[] = [
	"pending",
	"running",
	"completed",
	"failed",
	"retrying",
];

function getStatus(
	progress: AuditProgress | null,
	key: keyof AuditProgress,
): ComponentStatus {
	if (!progress) return "pending";
	const value = progress[key];

	if (value && typeof value === "object" && "status" in value) {
		const objStatus = (value as { status: string }).status;
		if (VALID_STATUSES.includes(objStatus as ComponentStatus)) {
			return objStatus as ComponentStatus;
		}
	}

	if (
		typeof value === "string" &&
		VALID_STATUSES.includes(value as ComponentStatus)
	) {
		return value as ComponentStatus;
	}

	return "pending";
}

function PhaseIndicator({ status }: { status: ComponentStatus }) {
	const isComplete = status === "completed";
	const isRunning = status === "running";

	if (isComplete) {
		return (
			<motion.div
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				className="w-8 h-8 rounded-full bg-status-good/15 border-2 border-status-good/40 flex items-center justify-center"
			>
				<svg
					className="w-4 h-4 text-status-good"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
					aria-hidden="true"
				>
					<path d="M5 13l4 4L19 7" />
				</svg>
			</motion.div>
		);
	}

	if (isRunning) {
		return (
			<div className="w-8 h-8 rounded-full bg-accent/15 border-2 border-accent/40 flex items-center justify-center">
				<motion.div
					className="w-3 h-3 rounded-full bg-accent"
					animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
					transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
				/>
			</div>
		);
	}

	return (
		<div className="w-8 h-8 rounded-full bg-subtle border-2 border-border flex items-center justify-center">
			<div className="w-2 h-2 rounded-full bg-text-tertiary/30" />
		</div>
	);
}

function CWVMiniPreview({ pages }: { pages: CWVPageResult[] }) {
	const recentPages = pages.slice(-3).reverse();

	if (recentPages.length === 0) return null;

	return (
		<div className="mt-2 h-[54px] overflow-hidden">
			<AnimatePresence mode="popLayout">
				{recentPages.map((page, idx) => {
					const pathname = new URL(page.url).pathname;
					const isFirst = idx === 0;

					return (
						<motion.div
							key={page.url}
							initial={{ opacity: 0, x: -8 }}
							animate={{ opacity: isFirst ? 1 : 0.4, x: 0 }}
							exit={{ opacity: 0, x: 8 }}
							transition={{ duration: 0.15 }}
							className="flex items-center gap-1.5 text-xs h-[18px]"
						>
							{page.performance !== null ? (
								<span
									className={`font-mono font-semibold w-6 text-right ${
										page.performance >= 90
											? "text-status-good"
											: page.performance >= 50
												? "text-status-warn"
												: "text-status-crit"
									}`}
								>
									{Math.round(page.performance)}
								</span>
							) : (
								<span className="font-mono text-text-tertiary w-6 text-right">
									--
								</span>
							)}
							<span
								className={`truncate ${isFirst ? "text-text-secondary" : "text-text-tertiary"}`}
								style={{ maxWidth: "140px" }}
							>
								{pathname}
							</span>
						</motion.div>
					);
				})}
			</AnimatePresence>
		</div>
	);
}

export function AnalysisProgressCard({
	audit,
	progress,
	cwvPages,
	cwvTotal,
}: AnalysisProgressCardProps) {
	const completedCount = PHASES.filter(
		(p) => getStatus(progress, p.progressKey) === "completed",
	).length;

	// Find all running phases (can be multiple due to parallelism)
	const runningPhases = PHASES.filter(
		(p) => getStatus(progress, p.progressKey) === "running",
	);

	const progressPercent = (completedCount / PHASES.length) * 100;

	const isCWVRunning = getStatus(progress, "coreWebVitals") === "running";

	function getStatusMessage(): string {
		if (audit.status === "PENDING") return "Starting analysis...";
		if (audit.status === "CRAWLING") {
			if (audit.sitemapUrlCount && !audit.pagesFound) {
				return `Found ${audit.sitemapUrlCount} pages in sitemap`;
			}
			if (audit.pagesFound) {
				return `Crawling ${audit.pagesFound} pages...`;
			}
			return "Looking for sitemap...";
		}
		// Show multiple running phases if parallel
		if (runningPhases.length > 1) {
			return runningPhases.map((p) => p.runningLabel).join(" & ");
		}
		const firstRunning = runningPhases[0];
		if (firstRunning) {
			return firstRunning.runningLabel;
		}
		return "Analyzing...";
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-surface border border-border rounded-xl overflow-hidden mb-8"
		>
			{/* Progress bar */}
			<div className="h-1 bg-border/50">
				<motion.div
					className="h-full bg-accent"
					initial={{ width: 0 }}
					animate={{ width: `${Math.max(progressPercent, 3)}%` }}
					transition={{ duration: 0.5, ease: "easeOut" }}
				/>
			</div>

			<div className="p-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<div className="flex items-center gap-4">
						<motion.div
							className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center"
							animate={{ scale: [1, 1.02, 1] }}
							transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
						>
							<svg
								className="w-6 h-6 text-accent"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" />
								<polyline points="12 6 12 12 16 14" />
							</svg>
						</motion.div>
						<div>
							<h2 className="font-display text-lg font-semibold text-text-primary">
								{getStatusMessage()}
							</h2>
							<p className="text-sm text-text-secondary">
								{completedCount} of {PHASES.length} phases complete
							</p>
						</div>
					</div>
					<motion.div
						className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						<motion.div
							className="w-1.5 h-1.5 rounded-full bg-accent"
							animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
							transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
						/>
						<span className="text-xs font-medium text-accent">In Progress</span>
					</motion.div>
				</div>

				{/* Phases - horizontal flow, no numbers */}
				<div className="flex items-start gap-2">
					{PHASES.map((phase, idx) => {
						const status = getStatus(progress, phase.progressKey);
						const isComplete = status === "completed";
						const isRunning = status === "running";
						const isPerformance = phase.key === "performance";
						const isLast = idx === PHASES.length - 1;

						return (
							<div key={phase.key} className="flex items-start flex-1">
								<div className="flex flex-col items-center flex-1">
									<PhaseIndicator status={status} />

									<span
										className={`mt-2 text-sm font-medium text-center ${
											isComplete
												? "text-status-good"
												: isRunning
													? "text-accent"
													: "text-text-tertiary"
										}`}
									>
										{phase.label}
									</span>

									{/* CWV streaming preview for Performance phase */}
									{isPerformance && isRunning && cwvTotal > 0 && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: "auto" }}
											className="mt-2 text-center"
										>
											<div className="text-xs text-text-secondary">
												<span className="font-mono font-medium text-text-primary">
													{cwvPages.length}
												</span>
												<span className="mx-0.5">/</span>
												<span className="font-mono">{cwvTotal}</span>
											</div>
											<CWVMiniPreview pages={cwvPages} />
										</motion.div>
									)}

									{/* Show page count when complete */}
									{isPerformance && isComplete && cwvPages.length > 0 && (
										<motion.div
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											className="mt-1 text-xs text-text-tertiary"
										>
											{cwvPages.length} pages
										</motion.div>
									)}
								</div>

								{/* Connector */}
								{!isLast && (
									<div className="flex items-center pt-4 px-1">
										<div
											className={`w-4 h-0.5 ${isComplete ? "bg-status-good/40" : "bg-border"}`}
										/>
									</div>
								)}
							</div>
						);
					})}
				</div>

				{/* Discovery stats */}
				{audit.pagesFound && audit.pagesFound > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className="mt-6 pt-6 border-t border-border flex items-center gap-6"
					>
						<div className="flex items-center gap-2">
							<svg
								className="w-4 h-4 text-status-good"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								aria-hidden="true"
							>
								<path d="M5 13l4 4L19 7" />
							</svg>
							<span className="text-sm text-text-secondary">
								<span className="font-mono font-medium text-text-primary">
									{audit.pagesFound}
								</span>{" "}
								pages crawled
							</span>
						</div>
						{audit.sitemapUrlCount && audit.sitemapUrlCount > 0 && (
							<div className="flex items-center gap-2 text-sm text-text-tertiary">
								<span>from</span>
								<span className="font-mono">{audit.sitemapUrlCount}</span>
								<span>in sitemap</span>
							</div>
						)}
					</motion.div>
				)}
			</div>
		</motion.div>
	);
}
