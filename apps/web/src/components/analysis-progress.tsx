"use client";

import type { Audit, AuditStatus } from "@/lib/api";
import { tierInfo } from "@/lib/config";
import type { AuditProgress, ComponentStatus } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type AnalysisProgressProps = {
	audit: Audit;
	hostname: string;
};

type StatusStep = {
	status: AuditStatus;
	label: string;
	activeLabel: string;
	description: string;
};

const FREE_STATUS_STEPS: StatusStep[] = [
	{
		status: "PENDING",
		label: "Starting",
		activeLabel: "Initializing...",
		description: "Setting up analysis",
	},
	{
		status: "CRAWLING",
		label: "Scanning pages",
		activeLabel: "Scanning your pages",
		description: "Discovering pages on your site",
	},
	{
		status: "ANALYZING",
		label: "Technical analysis",
		activeLabel: "Analyzing technical SEO",
		description: "Checking for issues",
	},
];

const PAID_STATUS_STEPS: StatusStep[] = [
	{
		status: "PENDING",
		label: "Starting",
		activeLabel: "Initializing...",
		description: "Setting up analysis environment",
	},
	{
		status: "CRAWLING",
		label: "Crawling docs",
		activeLabel: "Crawling your docs",
		description: "Discovering and indexing pages",
	},
	{
		status: "ANALYZING",
		label: "Finding opportunities",
		activeLabel: "Analyzing SEO opportunities",
		description: "Evaluating keywords and rankings",
	},
	{
		status: "GENERATING_BRIEFS",
		label: "Generating briefs",
		activeLabel: "Creating content briefs",
		description: "AI-powered content recommendations",
	},
];

function getStatusSteps(tier: string): StatusStep[] {
	return tier === "FREE" ? FREE_STATUS_STEPS : PAID_STATUS_STEPS;
}

// Component-level progress configuration
type ProgressComponentConfig = {
	key: keyof Omit<AuditProgress, "lastRetryAt" | "retryCount">;
	label: string;
	group: "onsite" | "serp" | "ai";
};

const PROGRESS_COMPONENTS: ProgressComponentConfig[] = [
	{ key: "crawl", label: "Site crawl", group: "onsite" },
	{ key: "technicalIssues", label: "Technical analysis", group: "onsite" },
	{ key: "internalLinking", label: "Internal linking", group: "onsite" },
	{ key: "duplicateContent", label: "Duplicate content", group: "onsite" },
	{ key: "redirectChains", label: "Redirect chains", group: "onsite" },
	{ key: "coreWebVitals", label: "Core Web Vitals", group: "onsite" },
	{ key: "currentRankings", label: "Current rankings", group: "serp" },
	{ key: "competitorAnalysis", label: "Competitor analysis", group: "serp" },
	{
		key: "keywordOpportunities",
		label: "Keyword opportunities",
		group: "serp",
	},
	{ key: "intentClassification", label: "Intent classification", group: "ai" },
	{ key: "keywordClustering", label: "Keyword clustering", group: "ai" },
	{ key: "quickWins", label: "Quick wins", group: "ai" },
	{ key: "briefs", label: "Content briefs", group: "ai" },
];

function getStatusIndex(status: AuditStatus, steps: StatusStep[]): number {
	const idx = steps.findIndex((s) => s.status === status);
	return idx === -1 ? 0 : idx;
}

function ActivityPulse() {
	return (
		<div className="relative flex items-center justify-center w-3 h-3">
			<span className="absolute inline-flex h-full w-full rounded-full bg-status-good opacity-75 animate-ping" />
			<span className="relative inline-flex rounded-full h-2 w-2 bg-status-good" />
		</div>
	);
}

function LiveCounter({ value, label }: { value: number; label: string }) {
	const [displayValue, setDisplayValue] = useState(0);

	useEffect(() => {
		if (value === 0) return;

		const duration = 800;
		const steps = 20;
		const increment = value / steps;
		let current = 0;

		const timer = setInterval(() => {
			current += increment;
			if (current >= value) {
				setDisplayValue(value);
				clearInterval(timer);
			} else {
				setDisplayValue(Math.floor(current));
			}
		}, duration / steps);

		return () => clearInterval(timer);
	}, [value]);

	return (
		<div className="bg-subtle border border-border rounded-lg p-4 text-center">
			<p className="text-3xl font-bold text-text-primary font-mono tabular-nums">
				{displayValue}
			</p>
			<p className="text-xs text-text-tertiary mt-1">{label}</p>
		</div>
	);
}

function SitemapDiscoveryInfo({
	sitemapUrlCount,
	maxPages,
	pagesFound,
}: {
	sitemapUrlCount: number | null;
	maxPages: number;
	pagesFound: number | null;
}) {
	if (sitemapUrlCount === null) {
		return (
			<motion.div
				initial={{ opacity: 0, height: 0 }}
				animate={{ opacity: 1, height: "auto" }}
				className="mt-2 flex items-center gap-2"
			>
				<motion.div
					className="w-1.5 h-1.5 rounded-full bg-status-good/60"
					animate={{ opacity: [0.4, 1, 0.4] }}
					transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
				/>
				<span className="text-xs text-text-tertiary">
					Checking for sitemap...
				</span>
			</motion.div>
		);
	}

	if (sitemapUrlCount === 0) {
		return (
			<motion.div
				initial={{ opacity: 0, height: 0 }}
				animate={{ opacity: 1, height: "auto" }}
				className="mt-2 space-y-1"
			>
				<div className="flex items-center gap-2">
					<span className="text-xs text-status-warn/80">○</span>
					<span className="text-xs text-text-tertiary">
						No sitemap found, discovering pages...
					</span>
				</div>
				<div className="flex items-center gap-2 pl-4">
					<span className="text-xs text-text-tertiary/70">
						Crawling up to {maxPages} pages
					</span>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: "auto" }}
			className="mt-2 space-y-1"
		>
			<div className="flex items-center gap-2">
				<motion.span
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ type: "spring", stiffness: 500, damping: 25 }}
					className="text-xs text-status-good"
				>
					✓
				</motion.span>
				<motion.span
					initial={{ opacity: 0, x: -5 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.1 }}
					className="text-xs text-text-secondary"
				>
					Found{" "}
					<span className="font-mono text-status-good font-medium">
						{sitemapUrlCount.toLocaleString()}
					</span>{" "}
					pages in sitemap
				</motion.span>
			</div>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2 }}
				className="flex items-center gap-2 pl-4"
			>
				<span className="text-xs text-text-tertiary/70">
					{pagesFound !== null && pagesFound > 0 ? (
						<>
							Crawling <span className="font-mono">{pagesFound}</span> of{" "}
							{maxPages}
						</>
					) : (
						<>Crawling up to {maxPages} pages</>
					)}
				</span>
			</motion.div>
		</motion.div>
	);
}

function ProgressStep({
	step,
	index,
	currentIndex,
	audit,
}: {
	step: StatusStep;
	index: number;
	currentIndex: number;
	audit: Audit;
}) {
	const isComplete = index < currentIndex;
	const isCurrent = index === currentIndex;
	const isPending = index > currentIndex;
	const maxPages = tierInfo[audit.tier].pages;

	function getDetail(): string | null {
		if (isComplete && step.status === "CRAWLING" && audit.pagesFound) {
			return `${audit.pagesFound} pages`;
		}
		return null;
	}

	const detail = getDetail();
	const showSitemapInfo =
		step.status === "CRAWLING" && (isCurrent || isComplete);

	return (
		<motion.div
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: index * 0.1, duration: 0.4 }}
			className={`flex items-start gap-4 p-4 rounded-lg transition-all duration-500 ${
				isCurrent
					? "bg-status-good-bg border border-status-good/30"
					: "bg-transparent border border-transparent"
			}`}
		>
			{/* Status indicator */}
			<div className="flex-shrink-0 mt-0.5">
				{isComplete ? (
					<div className="w-6 h-6 rounded-full bg-status-good/10 border border-status-good/30 flex items-center justify-center">
						<svg
							className="w-3.5 h-3.5 text-status-good"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M5 13l4 4L19 7" />
						</svg>
					</div>
				) : isCurrent ? (
					<div className="w-6 h-6 rounded-full bg-status-good/10 border border-status-good/30 flex items-center justify-center">
						<ActivityPulse />
					</div>
				) : (
					<div className="w-6 h-6 rounded-full bg-subtle border border-border flex items-center justify-center">
						<span className="text-xs text-text-tertiary">{index + 1}</span>
					</div>
				)}
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span
						className={`font-medium ${
							isPending ? "text-text-tertiary" : "text-text-primary"
						}`}
					>
						{isCurrent ? step.activeLabel : step.label}
					</span>
					{detail && (
						<motion.span
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							className="text-sm text-status-good font-mono"
						>
							{detail}
						</motion.span>
					)}
				</div>
				<p
					className={`text-sm mt-0.5 ${
						isPending ? "text-text-tertiary/50" : "text-text-secondary"
					}`}
				>
					{step.description}
				</p>

				{/* Sitemap discovery info for CRAWLING step */}
				{showSitemapInfo && (
					<SitemapDiscoveryInfo
						sitemapUrlCount={audit.sitemapUrlCount}
						maxPages={maxPages}
						pagesFound={audit.pagesFound}
					/>
				)}
			</div>

			{/* Progress spinner for current step */}
			{isCurrent && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex-shrink-0"
				>
					<svg
						className="w-5 h-5 text-status-good animate-spin"
						viewBox="0 0 24 24"
						fill="none"
						aria-hidden="true"
					>
						<circle
							className="opacity-20"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="2"
						/>
						<path
							className="opacity-80"
							d="M12 2a10 10 0 0 1 10 10"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
						/>
					</svg>
				</motion.div>
			)}
		</motion.div>
	);
}

function ElapsedTime({ startTime }: { startTime: Date }) {
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
		}, 1000);
		return () => clearInterval(interval);
	}, [startTime]);

	const minutes = Math.floor(elapsed / 60);
	const seconds = elapsed % 60;

	return (
		<span className="font-mono tabular-nums">
			{minutes}:{seconds.toString().padStart(2, "0")}
		</span>
	);
}

function ComponentStatusIcon({ status }: { status: ComponentStatus }) {
	switch (status) {
		case "completed":
			return (
				<div className="w-5 h-5 rounded-full bg-status-good/15 border border-status-good/30 flex items-center justify-center">
					<svg
						className="w-3 h-3 text-status-good"
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
			);
		case "retrying":
			return (
				<div className="w-5 h-5 rounded-full bg-status-warn/15 border border-status-warn/30 flex items-center justify-center">
					<motion.svg
						className="w-3 h-3 text-status-warn"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						animate={{ rotate: 360 }}
						transition={{
							duration: 2,
							repeat: Number.POSITIVE_INFINITY,
							ease: "linear",
						}}
						aria-hidden="true"
					>
						<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
						<path d="M3 3v5h5" />
						<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
						<path d="M16 16h5v5" />
					</motion.svg>
				</div>
			);
		case "running":
			return (
				<div className="w-5 h-5 rounded-full bg-status-good/15 border border-status-good/30 flex items-center justify-center">
					<motion.div
						className="w-2 h-2 rounded-full bg-status-good"
						animate={{ opacity: [0.4, 1, 0.4] }}
						transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
					/>
				</div>
			);
		case "failed":
			return (
				<div className="w-5 h-5 rounded-full bg-status-crit/15 border border-status-crit/30 flex items-center justify-center">
					<svg
						className="w-3 h-3 text-status-crit"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						aria-hidden="true"
					>
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</div>
			);
		default:
			return (
				<div className="w-5 h-5 rounded-full bg-subtle border border-border flex items-center justify-center">
					<div className="w-1.5 h-1.5 rounded-full bg-text-tertiary/50" />
				</div>
			);
	}
}

function ComponentProgressItem({
	config,
	status,
	index,
}: {
	config: ProgressComponentConfig;
	status: ComponentStatus;
	index: number;
}) {
	const statusLabel: Record<ComponentStatus, string> = {
		pending: "Waiting",
		running: "Processing...",
		completed: "Complete",
		retrying: "Retrying...",
		failed: "Failed",
	};

	return (
		<motion.div
			initial={{ opacity: 0, x: -10 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: index * 0.03 }}
			className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
				status === "retrying"
					? "bg-status-warn-bg border border-status-warn/20"
					: status === "running"
						? "bg-status-good-bg border border-status-good/20"
						: "border border-transparent"
			}`}
		>
			<div className="flex items-center gap-3">
				<ComponentStatusIcon status={status} />
				<span
					className={`text-sm ${
						status === "pending"
							? "text-text-tertiary"
							: status === "failed"
								? "text-status-crit"
								: "text-text-primary"
					}`}
				>
					{config.label}
				</span>
			</div>
			<span
				className={`text-xs font-medium ${
					status === "completed"
						? "text-status-good"
						: status === "retrying"
							? "text-status-warn"
							: status === "running"
								? "text-status-good"
								: status === "failed"
									? "text-status-crit"
									: "text-text-tertiary"
				}`}
			>
				{statusLabel[status]}
			</span>
		</motion.div>
	);
}

function ComponentProgressView({ progress }: { progress: AuditProgress }) {
	const completedCount = PROGRESS_COMPONENTS.filter(
		(c) => progress[c.key] === "completed",
	).length;
	const retryingCount = PROGRESS_COMPONENTS.filter(
		(c) => progress[c.key] === "retrying",
	).length;
	const progressPercent = (completedCount / PROGRESS_COMPONENTS.length) * 100;

	return (
		<div className="space-y-4">
			{/* Progress summary */}
			<div className="flex items-center justify-between text-sm">
				<span className="text-text-secondary">
					{completedCount} of {PROGRESS_COMPONENTS.length} complete
				</span>
				{retryingCount > 0 && (
					<span className="text-status-warn flex items-center gap-1.5">
						<motion.span
							animate={{ opacity: [0.5, 1, 0.5] }}
							transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
						>
							●
						</motion.span>
						{retryingCount} retrying
					</span>
				)}
			</div>

			{/* Progress bar */}
			<div className="h-1.5 bg-subtle rounded-full overflow-hidden">
				<motion.div
					className="h-full bg-status-good rounded-full"
					initial={{ width: 0 }}
					animate={{ width: `${progressPercent}%` }}
					transition={{ duration: 0.5 }}
				/>
			</div>

			{/* Component list */}
			<div className="space-y-1">
				{PROGRESS_COMPONENTS.map((config, idx) => (
					<ComponentProgressItem
						key={config.key}
						config={config}
						status={progress[config.key]}
						index={idx}
					/>
				))}
			</div>
		</div>
	);
}

export function AnalysisProgress({ audit, hostname }: AnalysisProgressProps) {
	const isFreeTier = audit.tier === "FREE";
	const steps = getStatusSteps(audit.tier);
	const statusIndex = getStatusIndex(audit.status, steps);
	const progressPercent = ((statusIndex + 0.5) / steps.length) * 100;
	const [startTime] = useState(
		() => new Date(audit.startedAt ?? audit.createdAt),
	);
	const isRetrying = audit.status === "RETRYING";

	return (
		<div className="max-w-[680px] mx-auto">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="text-center mb-10"
			>
				<div
					className={`inline-flex items-center gap-2 px-3 py-1.5 rounded mb-4 ${
						isRetrying
							? "bg-status-warn-bg border border-status-warn"
							: "bg-status-good-bg border border-status-good"
					}`}
				>
					{isRetrying ? (
						<motion.div
							className="w-1.5 h-1.5 rounded-full bg-status-warn"
							animate={{ opacity: [0.5, 1, 0.5] }}
							transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
						/>
					) : (
						<motion.div
							className="w-1.5 h-1.5 rounded-full bg-status-good"
							animate={{ opacity: [0.5, 1, 0.5] }}
							transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
						/>
					)}
					<span
						className={`text-2xs font-semibold uppercase tracking-wider ${isRetrying ? "text-status-warn" : "text-status-good"}`}
					>
						{isRetrying ? "Retrying" : "In Progress"}
					</span>
				</div>
				<h1 className="font-display text-3xl font-semibold text-text-primary mb-2">
					Analyzing {hostname}
				</h1>
				<p className="text-text-secondary">
					<span className="uppercase text-xs tracking-wider text-text-tertiary">
						{audit.tier} tier
					</span>
				</p>
			</motion.div>

			{/* Retrying notice */}
			{isRetrying && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="mb-6 p-4 bg-status-warn-bg border border-status-warn rounded-lg"
				>
					<p className="text-sm text-status-warn">
						Some components are taking longer than expected. We&apos;re
						automatically retrying
						{!isFreeTier && " and will email you when complete"}.
					</p>
				</motion.div>
			)}

			{/* Main progress card */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="relative border border-border rounded-xl overflow-hidden bg-canvas"
			>
				{/* Subtle ambient background */}
				<div
					className={`absolute inset-0 bg-gradient-to-b ${
						isRetrying
							? "from-status-warn/[0.02] to-transparent"
							: "from-status-good/[0.02] to-transparent"
					}`}
				/>

				{/* Progress bar - only for non-retrying status */}
				{!isRetrying && (
					<div className="relative h-1 bg-subtle">
						<motion.div
							className="absolute inset-y-0 left-0 bg-status-good"
							initial={{ width: 0 }}
							animate={{ width: `${progressPercent}%` }}
							transition={{ duration: 0.8, ease: "easeOut" }}
						/>
					</div>
				)}

				{/* Steps or Component progress */}
				<div className="relative p-6">
					{isRetrying && audit.progress ? (
						<ComponentProgressView progress={audit.progress} />
					) : (
						<div className="space-y-2">
							{steps.map((step, idx) => (
								<ProgressStep
									key={step.status}
									step={step}
									index={idx}
									currentIndex={statusIndex}
									audit={audit}
								/>
							))}
						</div>
					)}
				</div>

				{/* Footer status bar */}
				<div className="relative border-t border-border bg-subtle/30 px-6 py-4">
					<div className="flex items-center justify-between text-sm">
						<div className="flex items-center gap-3">
							{isRetrying ? (
								<motion.div
									className="flex items-center gap-1.5"
									animate={{ opacity: [0.7, 1, 0.7] }}
									transition={{
										duration: 2,
										repeat: Number.POSITIVE_INFINITY,
									}}
								>
									<svg
										className="w-4 h-4 text-status-warn"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										aria-hidden="true"
									>
										<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
										<path d="M3 3v5h5" />
									</svg>
									<span className="text-status-warn">Auto-retrying</span>
								</motion.div>
							) : (
								<>
									<motion.div
										className="w-2 h-2 rounded-full bg-status-good"
										animate={{ opacity: [0.4, 1, 0.4] }}
										transition={{
											duration: 1.5,
											repeat: Number.POSITIVE_INFINITY,
										}}
									/>
									<span className="text-text-secondary">Processing...</span>
								</>
							)}
						</div>
						<div className="flex items-center gap-4 text-text-tertiary">
							<span>
								Elapsed: <ElapsedTime startTime={startTime} />
							</span>
						</div>
					</div>
				</div>
			</motion.div>

			{/* Live stats */}
			<AnimatePresence>
				{audit.pagesFound && audit.pagesFound > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="mt-6"
					>
						<p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-3 text-center">
							Live results
						</p>
						{isFreeTier ? (
							<div className="flex justify-center">
								<LiveCounter
									value={audit.pagesFound}
									label="Pages discovered"
								/>
							</div>
						) : (
							<div className="grid grid-cols-3 gap-3">
								<LiveCounter
									value={audit.pagesFound}
									label="Pages discovered"
								/>
								<div className="bg-subtle/50 border border-border/50 rounded-lg p-4 text-center backdrop-blur-sm">
									<p className="text-3xl font-bold text-text-tertiary">—</p>
									<p className="text-xs text-text-tertiary mt-1">
										Opportunities
									</p>
								</div>
								<div className="bg-subtle/50 border border-border/50 rounded-lg p-4 text-center backdrop-blur-sm">
									<p className="text-3xl font-bold text-text-tertiary">—</p>
									<p className="text-xs text-text-tertiary mt-1">Briefs</p>
								</div>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>

			{/* Email notice - only for paid tiers */}
			{!isFreeTier && (
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4 }}
					className="text-sm text-text-tertiary mt-8 text-center"
				>
					We&apos;ll email you the full report when it&apos;s ready.
				</motion.p>
			)}
		</div>
	);
}
