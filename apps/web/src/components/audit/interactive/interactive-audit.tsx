"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { type AuditPhase, AuditStepper } from "./audit-stepper";
import { ClusterSelector, type KeywordCluster } from "./cluster-selector";
import {
	CompetitorSelector,
	type SuggestedCompetitor,
} from "./competitor-selector";
import { CrawlProgress, WaitingForCrawl } from "./crawl-progress";

export type InteractiveAuditState = {
	phase: AuditPhase;
	completedPhases: AuditPhase[];

	// Crawl progress (runs in background)
	crawl: {
		pagesFound: number;
		totalPages?: number;
		isComplete: boolean;
	};

	// Competitor selection
	competitors?: {
		suggestions: SuggestedCompetitor[];
		selected: string[];
	};

	// Keyword analysis
	keywords?: {
		clusters: KeywordCluster[];
		selected: string[];
	};

	// Tier info
	tier: {
		name: string;
		maxCompetitors: number;
		maxBriefs: number;
	};

	// Loading states
	isLoading: boolean;
	loadingMessage?: string;
};

type InteractiveAuditProps = {
	state: InteractiveAuditState;
	onSelectCompetitors: (selected: string[]) => void;
	onSkipCompetitors?: () => void;
	onSelectClusters: (selected: string[]) => void;
	onSkipClusters?: () => void;
	className?: string;
};

function PhaseLoadingIndicator({ message }: { message: string }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			className="flex flex-col items-center justify-center py-12"
		>
			{/* Animated scanner */}
			<div className="relative w-16 h-16 mb-6">
				{/* Outer ring */}
				<motion.div
					className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
					animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
					transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
				/>
				{/* Inner spinning ring */}
				<motion.div
					className="absolute inset-2 rounded-full border-2 border-transparent border-t-cyan-500"
					animate={{ rotate: 360 }}
					transition={{
						duration: 1.5,
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
					}}
				/>
				{/* Center dot */}
				<div className="absolute inset-0 flex items-center justify-center">
					<motion.div
						className="w-3 h-3 rounded-full bg-cyan-500"
						animate={{ scale: [1, 1.3, 1] }}
						transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
					/>
				</div>
			</div>

			<p className="text-zinc-400 font-medium">{message}</p>
			<p className="text-zinc-600 text-sm mt-1">This may take a few seconds</p>
		</motion.div>
	);
}

export function InteractiveAudit({
	state,
	onSelectCompetitors,
	onSkipCompetitors,
	onSelectClusters,
	onSkipClusters,
	className,
}: InteractiveAuditProps) {
	const {
		phase,
		completedPhases,
		crawl,
		competitors,
		keywords,
		tier,
		isLoading,
		loadingMessage,
	} = state;

	// Determine if we need to wait for crawl
	const needsCrawlForBriefs = phase === "generating" && !crawl.isComplete;

	return (
		<div className={cn("space-y-6", className)}>
			{/* Stepper */}
			<AuditStepper currentPhase={phase} completedPhases={completedPhases} />

			{/* Background crawl progress (always visible during discovery/early phases) */}
			{!crawl.isComplete && phase !== "complete" && (
				<CrawlProgress
					pagesFound={crawl.pagesFound}
					totalPages={crawl.totalPages}
					isComplete={crawl.isComplete}
					className="mx-auto max-w-md"
				/>
			)}

			{/* Phase content */}
			<AnimatePresence mode="wait">
				{/* Discovery phase - just loading */}
				{phase === "discovery" && (
					<PhaseLoadingIndicator
						key="discovery"
						message={loadingMessage || "Discovering your site..."}
					/>
				)}

				{/* Competitor selection */}
				{phase === "competitors" && (
					<motion.div
						key="competitors"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						{isLoading ? (
							<PhaseLoadingIndicator
								message={loadingMessage || "Finding competitors..."}
							/>
						) : competitors?.suggestions ? (
							<CompetitorSelector
								suggestions={competitors.suggestions}
								maxSelections={tier.maxCompetitors}
								tierName={tier.name}
								onContinue={onSelectCompetitors}
								onSkip={
									tier.maxCompetitors === 0 ? undefined : onSkipCompetitors
								}
								isLoading={isLoading}
							/>
						) : (
							<PhaseLoadingIndicator message="Loading competitor suggestions..." />
						)}
					</motion.div>
				)}

				{/* Keyword analysis loading */}
				{phase === "keywords" && (
					<PhaseLoadingIndicator
						key="keywords"
						message={loadingMessage || "Analyzing keywords..."}
					/>
				)}

				{/* Cluster selection */}
				{phase === "clusters" && (
					<motion.div
						key="clusters"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						{isLoading ? (
							<PhaseLoadingIndicator
								message={loadingMessage || "Clustering keywords..."}
							/>
						) : keywords?.clusters ? (
							<ClusterSelector
								clusters={keywords.clusters}
								maxSelections={tier.maxBriefs}
								tierName={tier.name}
								onContinue={onSelectClusters}
								onSkip={tier.maxBriefs === 0 ? undefined : onSkipClusters}
								isLoading={isLoading}
							/>
						) : (
							<PhaseLoadingIndicator message="Loading keyword clusters..." />
						)}
					</motion.div>
				)}

				{/* Generating phase - wait for crawl if needed */}
				{phase === "generating" && (
					<motion.div
						key="generating"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						{needsCrawlForBriefs ? (
							<WaitingForCrawl
								pagesFound={crawl.pagesFound}
								totalPages={crawl.totalPages}
							/>
						) : (
							<PhaseLoadingIndicator
								message={loadingMessage || "Generating your report..."}
							/>
						)}
					</motion.div>
				)}

				{/* Complete phase */}
				{phase === "complete" && (
					<motion.div
						key="complete"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						className="text-center py-12"
					>
						{/* Success animation */}
						<motion.div
							className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6"
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ type: "spring", delay: 0.2 }}
						>
							<motion.svg
								className="w-10 h-10 text-emerald-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
								initial={{ pathLength: 0 }}
								animate={{ pathLength: 1 }}
								transition={{ duration: 0.5, delay: 0.4 }}
							>
								<motion.path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</motion.svg>
						</motion.div>

						<h3 className="text-xl font-semibold text-white mb-2">
							Analysis Complete
						</h3>
						<p className="text-zinc-500 text-sm">
							Your SEO report is ready. Scroll down to explore.
						</p>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
