"use client";

import { BREAKDOWN_LABELS, GRADE_CONFIG } from "@/lib/config";
import type {
	AuditProgress,
	ComponentStatus,
	HealthScore,
	HealthScoreBreakdown,
} from "@/lib/types";
import { getBarColor } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

type HealthScoreCardProps = {
	healthScore: HealthScore | null;
	progress?: AuditProgress | null;
	expanded: boolean;
	onToggle: () => void;
	isFreeTier?: boolean;
	isBuilding?: boolean;
	isNewSite?: boolean;
};

const FREE_TIER_KEYS: (keyof HealthScoreBreakdown)[] = [
	"technicalHealth",
	"internalLinking",
	"aiReadiness",
];

// Circle circumference for r=42: 2 * PI * 42 ≈ 264
const CIRCLE_CIRCUMFERENCE = 264;
const SCORE_TO_DASH_RATIO = CIRCLE_CIRCUMFERENCE / 100; // 2.64

// Components that contribute to health score
type ScoreComponent = {
	key: string;
	label: string;
	progressKey: keyof AuditProgress;
};

const SCORE_COMPONENTS: ScoreComponent[] = [
	{
		key: "technical",
		label: "Technical Health",
		progressKey: "technicalIssues",
	},
	{ key: "linking", label: "Internal Linking", progressKey: "internalLinking" },
	{ key: "aiReadiness", label: "AI Readiness", progressKey: "aiReadiness" },
	{ key: "rankings", label: "Rankings", progressKey: "currentRankings" },
	{
		key: "opportunities",
		label: "Opportunities",
		progressKey: "keywordOpportunities",
	},
	{ key: "content", label: "Content", progressKey: "quickWins" },
];

const FREE_SCORE_COMPONENTS: ScoreComponent[] = [
	{ key: "technical", label: "Technical", progressKey: "technicalIssues" },
	{ key: "linking", label: "Linking", progressKey: "internalLinking" },
	{ key: "aiReadiness", label: "AI Ready", progressKey: "aiReadiness" },
];

const VALID_STATUSES: ComponentStatus[] = [
	"pending",
	"running",
	"completed",
	"failed",
	"retrying",
];

function isComponentStatus(value: unknown): value is ComponentStatus {
	return (
		typeof value === "string" &&
		VALID_STATUSES.includes(value as ComponentStatus)
	);
}

function getComponentStatus(
	progress: AuditProgress | null | undefined,
	key: keyof AuditProgress,
): ComponentStatus {
	if (!progress) return "pending";
	const value = progress[key];

	// Handle object format from backend { status: "running", startedAt: "..." }
	if (value && typeof value === "object" && "status" in value) {
		const objStatus = (value as { status: string }).status;
		return isComponentStatus(objStatus) ? objStatus : "pending";
	}

	return isComponentStatus(value) ? value : "pending";
}

function ComponentDot({
	status,
	index,
}: {
	status: ComponentStatus;
	index: number;
}) {
	const isComplete = status === "completed";
	const isRunning = status === "running";
	const isFailed = status === "failed" || status === "retrying";

	return (
		<motion.div
			initial={{ scale: 0 }}
			animate={{ scale: 1 }}
			transition={{ delay: index * 0.1, type: "spring", stiffness: 500 }}
			className={`w-3 h-3 rounded-full transition-colors duration-300 ${
				isComplete
					? "bg-status-good"
					: isRunning
						? "bg-accent"
						: isFailed
							? "bg-status-warn"
							: "bg-border"
			}`}
		>
			{isRunning && (
				<motion.div
					className="w-full h-full rounded-full bg-accent"
					animate={{ opacity: [0.4, 1, 0.4] }}
					transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
				/>
			)}
		</motion.div>
	);
}

function BuildingState({
	progress,
	isFreeTier,
}: {
	progress: AuditProgress | null | undefined;
	isFreeTier: boolean;
}) {
	const components = isFreeTier ? FREE_SCORE_COMPONENTS : SCORE_COMPONENTS;
	const completedCount = components.filter(
		(c) => getComponentStatus(progress, c.progressKey) === "completed",
	).length;
	const runningCount = components.filter(
		(c) => getComponentStatus(progress, c.progressKey) === "running",
	).length;
	const totalCount = components.length;
	const progressPercent = (completedCount / totalCount) * 100;
	const hasStarted = completedCount > 0 || runningCount > 0;

	return (
		<div className="bg-surface rounded-xl shadow-card p-8 mb-8">
			<div className="flex items-center gap-10">
				{/* Building visualization */}
				<div className="relative w-32 h-32 flex-shrink-0">
					{/* Subtle pulse background */}
					<motion.div
						className="absolute inset-2 rounded-full bg-accent/5"
						animate={{ scale: [1, 1.03, 1] }}
						transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
					/>

					{/* Progress ring */}
					<svg
						className="w-full h-full -rotate-90 relative"
						viewBox="0 0 100 100"
						aria-hidden="true"
					>
						<circle
							cx="50"
							cy="50"
							r="42"
							fill="none"
							stroke="currentColor"
							strokeWidth="6"
							className="text-border"
						/>
						<motion.circle
							cx="50"
							cy="50"
							r="42"
							fill="none"
							stroke="currentColor"
							strokeWidth="6"
							strokeLinecap="round"
							className="text-accent"
							initial={{ strokeDasharray: `0 ${CIRCLE_CIRCUMFERENCE}` }}
							animate={{
								strokeDasharray: `${progressPercent * SCORE_TO_DASH_RATIO} ${CIRCLE_CIRCUMFERENCE}`,
							}}
							transition={{ duration: 0.8, ease: "easeOut" }}
						/>
					</svg>

					{/* Center content */}
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						{hasStarted ? (
							<>
								{/* Component dots in a circle */}
								<div className="flex gap-1.5 mb-2">
									{components.map((component, idx) => (
										<ComponentDot
											key={component.key}
											status={getComponentStatus(
												progress,
												component.progressKey,
											)}
											index={idx}
										/>
									))}
								</div>
								<motion.span
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="text-xs text-text-tertiary font-medium"
								>
									{completedCount}/{totalCount}
								</motion.span>
							</>
						) : (
							<motion.div
								className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent"
								animate={{ rotate: 360 }}
								transition={{
									duration: 1,
									repeat: Number.POSITIVE_INFINITY,
									ease: "linear",
								}}
							/>
						)}
					</div>
				</div>

				{/* Building info */}
				<div className="flex-1">
					<div className="flex items-center gap-3 mb-2">
						<h3 className="font-display text-xl text-text-primary font-bold">
							{hasStarted ? "Building Score" : "SEO Health Score"}
						</h3>
						<motion.div
							className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20"
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
						>
							<motion.div
								className="w-1.5 h-1.5 rounded-full bg-accent"
								animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
								transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
							/>
							<span className="text-xs font-medium text-accent">
								{hasStarted ? "Analyzing" : "Starting"}
							</span>
						</motion.div>
					</div>
					<p className="text-text-secondary mb-4">
						{hasStarted
							? `Calculating your SEO health score based on ${totalCount} factors...`
							: "Preparing to analyze your website..."}
					</p>

					{/* Component checklist */}
					<div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
						{components.map((component) => {
							const status = getComponentStatus(
								progress,
								component.progressKey,
							);
							const isComplete = status === "completed";
							const isRunning = status === "running";

							return (
								<div
									key={component.key}
									className="flex items-center gap-2 text-sm"
								>
									{isComplete ? (
										<svg
											className="w-4 h-4 text-status-good"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2.5"
											strokeLinecap="round"
											aria-hidden="true"
										>
											<path d="M5 13l4 4L19 7" />
										</svg>
									) : isRunning ? (
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
										<div className="w-4 h-4 rounded-full border-2 border-border" />
									)}
									<span
										className={
											isComplete
												? "text-text-primary"
												: isRunning
													? "text-accent"
													: "text-text-tertiary"
										}
									>
										{component.label}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}

function CompletedState({
	healthScore,
	expanded,
	onToggle,
	isFreeTier,
	isNewSite,
}: {
	healthScore: HealthScore;
	expanded: boolean;
	onToggle: () => void;
	isFreeTier: boolean;
	isNewSite: boolean;
}) {
	const grade = GRADE_CONFIG[healthScore.grade];

	const breakdownEntries = (
		Object.entries(healthScore.breakdown) as [
			keyof HealthScoreBreakdown,
			HealthScoreBreakdown[keyof HealthScoreBreakdown],
		][]
	).filter(([key]) => !isFreeTier || FREE_TIER_KEYS.includes(key));

	const factorCount = isFreeTier ? 3 : isNewSite ? 5 : 7;
	const scoreLabel = isNewSite ? "Foundation Score" : "SEO Health Score";
	const scoreDescription = isNewSite
		? "Based on technical foundation, AI readiness, and opportunity discovery (ranking metrics excluded for new sites)"
		: `Based on ${factorCount} key factors affecting your SEO performance`;

	return (
		<div className="bg-surface rounded-xl shadow-card p-8 mb-8">
			<div className="flex items-center gap-10">
				<div className="relative w-32 h-32 flex-shrink-0">
					{/* Glow effect */}
					<div
						className={`absolute inset-2 rounded-full blur-xl opacity-20 ${grade.barColor}`}
					/>
					<svg
						className="w-full h-full -rotate-90 relative"
						viewBox="0 0 100 100"
						aria-hidden="true"
					>
						<circle
							cx="50"
							cy="50"
							r="42"
							fill="none"
							stroke="currentColor"
							strokeWidth="6"
							className="text-border"
						/>
						<circle
							cx="50"
							cy="50"
							r="42"
							fill="none"
							stroke="currentColor"
							strokeWidth="6"
							strokeLinecap="round"
							className={grade.color}
							strokeDasharray={`${healthScore.score * SCORE_TO_DASH_RATIO} ${CIRCLE_CIRCUMFERENCE}`}
						/>
					</svg>
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<span
							className={`font-display text-4xl tracking-tight font-bold ${grade.color}`}
						>
							{healthScore.score}
						</span>
						<span className="text-xs text-text-tertiary mt-0.5">/ 100</span>
					</div>
				</div>

				<div className="flex-1">
					<div className="flex items-center gap-3 mb-2">
						<h3 className="font-display text-xl text-text-primary font-bold">
							{scoreLabel}
						</h3>
						<span
							className={`px-3 py-1 text-xs font-medium rounded-full ${grade.bgColor} ${grade.color}`}
						>
							{grade.label}
						</span>
						{isNewSite && (
							<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent/10 text-accent">
								New Site
							</span>
						)}
					</div>
					<p className="text-text-secondary mb-4">{scoreDescription}</p>
					<button
						type="button"
						onClick={onToggle}
						className="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
					>
						{expanded ? "Hide" : "Show"} breakdown
						<span
							className={`transition-transform text-xs ${expanded ? "rotate-180" : ""}`}
						>
							↓
						</span>
					</button>
				</div>
			</div>

			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3 }}
						className="overflow-hidden"
					>
						<div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-x-8 gap-y-4">
							{breakdownEntries.map(([key, component], idx) => {
								const percentage = (component.score / component.max) * 100;
								const barColor = getBarColor(percentage);

								return (
									<motion.div
										key={key}
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: idx * 0.05 }}
									>
										<div className="flex justify-between text-sm mb-1.5">
											<span className="text-text-primary font-medium">
												{BREAKDOWN_LABELS[key]}
											</span>
											<span className="text-text-secondary tabular-nums">
												{component.score}/{component.max}
											</span>
										</div>
										<div className="h-2 bg-border/50 rounded-full overflow-hidden">
											<motion.div
												className={`h-full ${barColor} rounded-full`}
												initial={{ width: 0 }}
												animate={{ width: `${percentage}%` }}
												transition={{ duration: 0.5, delay: idx * 0.05 }}
											/>
										</div>
										<p className="text-xs text-text-tertiary mt-1">
											{component.detail}
										</p>
									</motion.div>
								);
							})}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export function HealthScoreCard({
	healthScore,
	progress,
	expanded,
	onToggle,
	isFreeTier = false,
	isBuilding = false,
	isNewSite = false,
}: HealthScoreCardProps) {
	// Show building state if explicitly building or if no health score yet
	if (isBuilding || !healthScore) {
		return <BuildingState progress={progress} isFreeTier={isFreeTier} />;
	}

	return (
		<CompletedState
			healthScore={healthScore}
			expanded={expanded}
			onToggle={onToggle}
			isFreeTier={isFreeTier}
			isNewSite={isNewSite}
		/>
	);
}
