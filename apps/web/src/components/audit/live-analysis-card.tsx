"use client";

import type {
	Audit,
	AuditProgress,
	CWVPageResult,
	ComponentStatus,
} from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";

type LiveAnalysisCardProps = {
	audit: Audit;
	progress: AuditProgress | null;
	cwvPages: CWVPageResult[];
	cwvTotal: number;
};

const PHASE_CONFIG = [
	{
		key: "crawl",
		label: "Crawling",
		activeLabel: "Discovering pages",
		completeLabel: "Pages discovered",
	},
	{
		key: "technicalIssues",
		label: "Technical",
		activeLabel: "Running SEO checks",
		completeLabel: "Technical analysis complete",
	},
	{
		key: "coreWebVitals",
		label: "Performance",
		activeLabel: "Measuring page speed",
		completeLabel: "Performance measured",
	},
	{
		key: "currentRankings",
		label: "Rankings",
		activeLabel: "Checking keyword rankings",
		completeLabel: "Rankings analyzed",
	},
	{
		key: "keywordOpportunities",
		label: "Opportunities",
		activeLabel: "Finding growth opportunities",
		completeLabel: "Opportunities found",
	},
] as const;

function getPhaseStatus(
	progress: AuditProgress | null,
	key: string,
): ComponentStatus {
	if (!progress) return "pending";
	const status = progress[key as keyof AuditProgress];
	if (
		typeof status === "string" &&
		["pending", "running", "completed", "failed", "retrying"].includes(status)
	) {
		return status as ComponentStatus;
	}
	return "pending";
}

function PhaseStep({
	phase,
	status,
	index,
	isLast,
}: {
	phase: (typeof PHASE_CONFIG)[number];
	status: ComponentStatus;
	index: number;
	isLast: boolean;
}) {
	const isComplete = status === "completed";
	const isRunning = status === "running";
	const isPending = status === "pending";

	return (
		<motion.div
			initial={{ opacity: 0, x: -10 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: index * 0.05 }}
			className="flex items-center gap-3"
		>
			{/* Status indicator */}
			<div className="relative flex-shrink-0">
				{isComplete ? (
					<div className="w-6 h-6 rounded-full bg-status-good/15 border border-status-good/30 flex items-center justify-center">
						<svg
							className="w-3.5 h-3.5 text-status-good"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
							strokeLinecap="round"
							aria-hidden="true"
						>
							<path d="M5 13l4 4L19 7" />
						</svg>
					</div>
				) : isRunning ? (
					<div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
						<motion.div
							className="w-2.5 h-2.5 rounded-full bg-accent"
							animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
							transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
						/>
					</div>
				) : (
					<div className="w-6 h-6 rounded-full bg-subtle border border-border flex items-center justify-center">
						<span className="text-xs text-text-tertiary font-medium">
							{index + 1}
						</span>
					</div>
				)}
				{/* Connector line */}
				{!isLast && (
					<div
						className={`absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-4 ${
							isComplete ? "bg-status-good/30" : "bg-border"
						}`}
					/>
				)}
			</div>

			{/* Label */}
			<span
				className={`text-sm font-medium ${
					isComplete
						? "text-status-good"
						: isRunning
							? "text-accent"
							: isPending
								? "text-text-tertiary"
								: "text-text-secondary"
				}`}
			>
				{phase.label}
			</span>
		</motion.div>
	);
}

function CrawlInfo({ audit }: { audit: Audit }) {
	const { pagesFound, sitemapUrlCount, status } = audit;
	const isCrawling = status === "CRAWLING";
	const isPending = status === "PENDING";

	if (!pagesFound && !sitemapUrlCount) {
		return (
			<div className="flex items-center gap-2 text-text-secondary">
				<motion.div
					className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent"
					animate={{ rotate: 360 }}
					transition={{
						duration: 1,
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
					}}
				/>
				<span className="text-sm">
					{isPending ? "Starting..." : "Looking for sitemap..."}
				</span>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{sitemapUrlCount !== null && sitemapUrlCount > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 5 }}
					animate={{ opacity: 1, y: 0 }}
					className="flex items-center gap-2"
				>
					<svg
						className="w-4 h-4 text-status-good"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						aria-hidden="true"
					>
						<path d="M5 13l4 4L19 7" />
					</svg>
					<span className="text-sm text-text-secondary">
						Found{" "}
						<span className="font-mono font-medium text-text-primary">
							{sitemapUrlCount.toLocaleString()}
						</span>{" "}
						pages in sitemap
					</span>
				</motion.div>
			)}

			{pagesFound !== null && pagesFound > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 5 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="flex items-center gap-2"
				>
					{isCrawling ? (
						<motion.div
							className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent"
							animate={{ rotate: 360 }}
							transition={{
								duration: 1,
								repeat: Number.POSITIVE_INFINITY,
								ease: "linear",
							}}
						/>
					) : (
						<svg
							className="w-4 h-4 text-status-good"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							aria-hidden="true"
						>
							<path d="M5 13l4 4L19 7" />
						</svg>
					)}
					<span className="text-sm text-text-secondary">
						{isCrawling ? "Crawling" : "Crawled"}{" "}
						<span className="font-mono font-medium text-text-primary">
							{pagesFound.toLocaleString()}
						</span>{" "}
						pages
					</span>
				</motion.div>
			)}
		</div>
	);
}

function CWVStreamingPreview({ pages }: { pages: CWVPageResult[] }) {
	const recentPages = pages.slice(-3).reverse();

	return (
		<div className="space-y-1.5">
			<AnimatePresence mode="popLayout">
				{recentPages.map((page, idx) => {
					const pathname = new URL(page.url).pathname;
					const isFirst = idx === 0;

					return (
						<motion.div
							key={page.url}
							initial={{ opacity: 0, x: -10, height: 0 }}
							animate={{
								opacity: isFirst ? 1 : 0.5,
								x: 0,
								height: "auto",
							}}
							exit={{ opacity: 0, x: 10, height: 0 }}
							transition={{ duration: 0.2 }}
							className="flex items-center gap-2 text-xs"
						>
							{page.performance !== null ? (
								<span
									className={`font-mono font-medium w-6 ${
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
								<span className="font-mono text-text-tertiary w-6">--</span>
							)}
							<span
								className={`truncate max-w-[180px] ${isFirst ? "text-text-primary" : "text-text-tertiary"}`}
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

export function LiveAnalysisCard({
	audit,
	progress,
	cwvPages,
	cwvTotal,
}: LiveAnalysisCardProps) {
	const completedPhases = PHASE_CONFIG.filter(
		(p) => getPhaseStatus(progress, p.key) === "completed",
	).length;
	const currentPhase = PHASE_CONFIG.find(
		(p) => getPhaseStatus(progress, p.key) === "running",
	);
	const isCWVRunning = getPhaseStatus(progress, "coreWebVitals") === "running";
	const progressPercent = (completedPhases / PHASE_CONFIG.length) * 100;

	// Determine the main status message
	function getStatusMessage(): string {
		if (audit.status === "PENDING") return "Starting analysis...";
		if (audit.status === "CRAWLING") return "Discovering your content...";
		if (currentPhase) return currentPhase.activeLabel;
		return "Analyzing your website...";
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-surface border border-accent/20 rounded-xl overflow-hidden mb-10"
		>
			{/* Progress bar */}
			<div className="h-1.5 bg-accent/10">
				<motion.div
					className="h-full bg-accent"
					initial={{ width: 0 }}
					animate={{ width: `${Math.max(progressPercent, 5)}%` }}
					transition={{ duration: 0.5, ease: "easeOut" }}
				/>
			</div>

			<div className="p-8">
				{/* Header */}
				<div className="flex items-start gap-4 mb-8">
					<motion.div
						className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0"
						animate={{ scale: [1, 1.03, 1] }}
						transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
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
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-1">
							<h2 className="font-display text-xl font-semibold text-text-primary">
								Analyzing your website
							</h2>
							<span className="px-2.5 py-1 text-xs font-medium rounded-full bg-accent/10 text-accent border border-accent/20">
								In Progress
							</span>
						</div>
						<p className="text-text-secondary">{getStatusMessage()}</p>
					</div>
				</div>

				<div className="grid grid-cols-3 gap-8">
					{/* Left: Phase steps */}
					<div className="space-y-5">
						<h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-4">
							Progress
						</h3>
						{PHASE_CONFIG.map((phase, idx) => (
							<PhaseStep
								key={phase.key}
								phase={phase}
								status={getPhaseStatus(progress, phase.key)}
								index={idx}
								isLast={idx === PHASE_CONFIG.length - 1}
							/>
						))}
					</div>

					{/* Middle: Crawl info */}
					<div>
						<h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-4">
							Discovery
						</h3>
						<CrawlInfo audit={audit} />
					</div>

					{/* Right: CWV streaming preview */}
					<div>
						<h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-4">
							Performance Testing
						</h3>
						{isCWVRunning ? (
							<div>
								<div className="flex items-center gap-2 mb-3">
									<motion.div
										className="w-2 h-2 rounded-full bg-accent"
										animate={{ opacity: [0.4, 1, 0.4] }}
										transition={{
											duration: 1,
											repeat: Number.POSITIVE_INFINITY,
										}}
									/>
									<span className="text-sm text-text-secondary">
										Testing{" "}
										<span className="font-mono font-medium text-text-primary">
											{cwvPages.length}
										</span>{" "}
										of{" "}
										<span className="font-mono text-text-tertiary">
											{cwvTotal}
										</span>{" "}
										pages
									</span>
								</div>
								<CWVStreamingPreview pages={cwvPages} />
							</div>
						) : getPhaseStatus(progress, "coreWebVitals") === "completed" ? (
							<div className="flex items-center gap-2 text-status-good">
								<svg
									className="w-4 h-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									aria-hidden="true"
								>
									<path d="M5 13l4 4L19 7" />
								</svg>
								<span className="text-sm">Tested {cwvPages.length} pages</span>
							</div>
						) : (
							<div className="text-sm text-text-tertiary">
								Waiting to start...
							</div>
						)}
					</div>
				</div>
			</div>
		</motion.div>
	);
}
