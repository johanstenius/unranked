"use client";

import type { AuditStatus, ComponentState, ComponentStates } from "@/lib/types";
import { motion } from "framer-motion";

/**
 * Phase info from API tierConfig
 */
type PhaseInfo = {
	id: string;
	label: string;
	runningLabel: string;
};

type AnalysisProgressCardProps = {
	status: AuditStatus;
	pagesFound: number | null;
	sitemapUrlCount: number | null;
	components: ComponentStates;
	/** Phases to display - from tierConfig */
	phases: PhaseInfo[];
};

type ComponentStatusValue = ComponentState<unknown>["status"];

/**
 * Get component status for a phase from component states.
 * The phase.id maps to a component key in ComponentStates.
 */
function getPhaseStatus(
	components: ComponentStates,
	phaseId: string,
): ComponentStatusValue {
	// Map phase IDs to component keys (some have different names)
	const componentKey = phaseId === "aiReadiness" ? "aiReadiness" : phaseId;
	const component = components[componentKey as keyof ComponentStates];
	return component?.status ?? "pending";
}

function PhaseIndicator({ status }: { status: ComponentStatusValue }) {
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

export function AnalysisProgressCard({
	status,
	pagesFound,
	sitemapUrlCount,
	components,
	phases,
}: AnalysisProgressCardProps) {
	const completedCount = phases.filter(
		(p) => getPhaseStatus(components, p.id) === "completed",
	).length;

	// Find all running phases (can be multiple due to parallelism)
	const runningPhases = phases.filter(
		(p) => getPhaseStatus(components, p.id) === "running",
	);

	const progressPercent =
		phases.length > 0 ? (completedCount / phases.length) * 100 : 0;

	function getStatusMessage(): string {
		if (status === "PENDING") return "Starting analysis...";
		if (status === "CRAWLING") {
			if (sitemapUrlCount && !pagesFound) {
				return `Found ${sitemapUrlCount} pages in sitemap`;
			}
			if (pagesFound) {
				return `Crawling ${pagesFound} pages...`;
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
			className="bg-surface rounded-xl shadow-card overflow-hidden mb-8"
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
								{completedCount} of {phases.length} phases complete
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

				{/* Phases - horizontal flow */}
				<div className="flex items-start gap-2">
					{phases.map((phase, idx) => {
						const phaseStatus = getPhaseStatus(components, phase.id);
						const isComplete = phaseStatus === "completed";
						const isRunning = phaseStatus === "running";
						const isLast = idx === phases.length - 1;

						return (
							<div key={phase.id} className="flex items-start flex-1">
								<div className="flex flex-col items-center flex-1">
									<PhaseIndicator status={phaseStatus} />

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
				{pagesFound && pagesFound > 0 && (
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
									{pagesFound}
								</span>{" "}
								pages crawled
							</span>
						</div>
						{sitemapUrlCount && sitemapUrlCount > 0 && (
							<div className="flex items-center gap-2 text-sm text-text-tertiary">
								<span>from</span>
								<span className="font-mono">{sitemapUrlCount}</span>
								<span>in sitemap</span>
							</div>
						)}
					</motion.div>
				)}
			</div>
		</motion.div>
	);
}
