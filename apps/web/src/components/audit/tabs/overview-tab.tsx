"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	ComponentState,
	CoreWebVitalsData,
	CurrentRanking,
	Opportunity,
	PrioritizedAction,
} from "@/lib/types";
import { stripOrigin } from "@/lib/utils";
import { ActionPlanCard } from "../action-plan-card";

type OverviewTabProps = {
	rankings: ComponentState<CurrentRanking[]>;
	opportunities: ComponentState<Opportunity[]>;
	coreWebVitals: ComponentState<CoreWebVitalsData>;
	actionPlan: PrioritizedAction[];
	onViewAllOpportunities: () => void;
	onViewPerformance?: () => void;
	isFreeTier?: boolean;
};

function IntentBadge({ intent }: { intent: string }) {
	const styles: Record<string, string> = {
		informational:
			"bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
		transactional:
			"bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
		commercial:
			"bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
		navigational:
			"bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
	};
	return (
		<span
			className={`text-2xs px-1.5 py-0.5 rounded font-medium ${styles[intent] || styles.navigational}`}
		>
			{intent}
		</span>
	);
}

function LoadingCard({
	title,
	description,
}: { title: string; description: string }) {
	return (
		<Card className="border-border rounded-xl">
			<CardHeader className="pb-4">
				<CardTitle className="font-display text-xl font-bold">
					{title}
				</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-3/4" />
				</div>
			</CardContent>
		</Card>
	);
}

export function OverviewTab({
	rankings,
	opportunities,
	coreWebVitals,
	actionPlan,
	onViewAllOpportunities,
	onViewPerformance,
	isFreeTier = false,
}: OverviewTabProps) {
	// Opportunities section
	const opportunitiesContent = (() => {
		if (
			opportunities.status === "pending" ||
			opportunities.status === "running"
		) {
			return (
				<LoadingCard
					title="Top Opportunities"
					description="Analyzing keyword opportunities..."
				/>
			);
		}

		if (opportunities.status === "failed") {
			return null;
		}

		const opps = opportunities.data;
		if (opps.length === 0) return null;

		return (
			<Card className="border-border rounded-xl">
				<CardHeader className="pb-4">
					<CardTitle className="font-display text-xl font-bold">
						Top Opportunities
					</CardTitle>
					<CardDescription>
						Keywords you should rank for but don&apos;t
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow className="border-border hover:bg-transparent">
								<TableHead className="text-text-tertiary font-medium">
									Keyword
								</TableHead>
								<TableHead className="text-text-tertiary font-medium">
									Volume
								</TableHead>
								<TableHead className="text-text-tertiary font-medium">
									Impact
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{opps.slice(0, 5).map((opp) => (
								<TableRow
									key={opp.keyword}
									className="border-0 hover:bg-subtle/50"
								>
									<TableCell>
										<div className="flex items-center gap-2">
											<span className="font-medium text-text-primary">
												{opp.keyword}
											</span>
											{opp.intent && <IntentBadge intent={opp.intent} />}
										</div>
										<span className="text-xs text-text-tertiary mt-0.5 block">
											{opp.reason}
										</span>
									</TableCell>
									<TableCell className="text-text-secondary tabular-nums">
										{opp.searchVolume.toLocaleString()}
									</TableCell>
									<TableCell>
										<span
											className={`tabular-nums font-medium ${
												opp.impactScore > 70
													? "text-status-good"
													: opp.impactScore > 40
														? "text-status-warn"
														: "text-text-tertiary"
											}`}
										>
											{opp.impactScore.toFixed(0)}
										</span>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					{opps.length > 5 && (
						<button
							type="button"
							onClick={onViewAllOpportunities}
							className="text-sm text-text-secondary hover:text-text-primary mt-4 transition-colors"
						>
							View all {opps.length} opportunities →
						</button>
					)}
				</CardContent>
			</Card>
		);
	})();

	// Rankings section
	const rankingsContent = (() => {
		if (rankings.status === "pending" || rankings.status === "running") {
			return (
				<LoadingCard
					title="Current Rankings"
					description="Fetching ranking data..."
				/>
			);
		}

		if (rankings.status === "failed") {
			return null;
		}

		const data = rankings.data;
		if (data.length === 0) return null;

		return (
			<Card className="border-border rounded-xl">
				<CardHeader className="pb-4">
					<CardTitle className="font-display text-xl font-bold">
						Current Rankings
					</CardTitle>
					<CardDescription>
						Pages already ranking with estimated traffic
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow className="border-border hover:bg-transparent">
								<TableHead className="text-text-tertiary font-medium">
									Keyword
								</TableHead>
								<TableHead className="text-text-tertiary font-medium">
									Position
								</TableHead>
								<TableHead className="text-text-tertiary font-medium">
									Est. Traffic
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.slice(0, 10).map((ranking) => (
								<TableRow
									key={`${ranking.keyword}-${ranking.url}`}
									className="border-0 hover:bg-subtle/50"
								>
									<TableCell>
										<span className="font-medium text-text-primary block">
											{ranking.keyword}
										</span>
										<span className="text-xs text-text-tertiary truncate block max-w-[300px]">
											{stripOrigin(ranking.url)}
										</span>
									</TableCell>
									<TableCell>
										<span
											className={`tabular-nums ${
												ranking.position <= 3
													? "text-status-good font-medium"
													: ranking.position <= 10
														? "text-text-primary"
														: "text-text-tertiary"
											}`}
										>
											#{ranking.position}
										</span>
									</TableCell>
									<TableCell className="text-text-secondary tabular-nums">
										~{ranking.estimatedTraffic.toLocaleString()}/mo
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		);
	})();

	// CWV section
	const cwvContent = (() => {
		if (
			coreWebVitals.status === "pending" ||
			coreWebVitals.status === "running"
		) {
			return null; // Don't show loading for CWV in overview
		}

		if (coreWebVitals.status === "failed") {
			return null;
		}

		const data = coreWebVitals.data;
		if (data.pages.length === 0 || !onViewPerformance) return null;

		return (
			<Card className="border-border rounded-xl">
				<CardHeader className="pb-4">
					<CardTitle className="font-display text-xl font-bold">
						Performance Overview
					</CardTitle>
					<CardDescription>
						Core Web Vitals across {data.pages.length} pages
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-3 gap-4 mb-4">
						<div className="text-center p-3 rounded-lg bg-status-good/10">
							<p className="text-2xl font-bold text-status-good tabular-nums">
								{data.summary.good}
							</p>
							<p className="text-xs text-text-tertiary">Good</p>
						</div>
						<div className="text-center p-3 rounded-lg bg-status-warn/10">
							<p className="text-2xl font-bold text-status-warn tabular-nums">
								{data.summary.needsImprovement}
							</p>
							<p className="text-xs text-text-tertiary">Needs Work</p>
						</div>
						<div className="text-center p-3 rounded-lg bg-status-crit/10">
							<p className="text-2xl font-bold text-status-crit tabular-nums">
								{data.summary.poor}
							</p>
							<p className="text-xs text-text-tertiary">Poor</p>
						</div>
					</div>

					{data.summary.avgPerformance !== null && (
						<p className="text-sm text-text-secondary text-center mb-4">
							Average score:{" "}
							<span
								className={`font-medium ${
									data.summary.avgPerformance >= 90
										? "text-status-good"
										: data.summary.avgPerformance >= 50
											? "text-status-warn"
											: "text-status-crit"
								}`}
							>
								{data.summary.avgPerformance.toFixed(0)}
							</span>
						</p>
					)}

					<button
						type="button"
						onClick={onViewPerformance}
						className="text-sm text-text-secondary hover:text-text-primary transition-colors"
					>
						View all {data.pages.length} pages →
					</button>
				</CardContent>
			</Card>
		);
	})();

	return (
		<>
			{/* Action Plan - prioritized recommendations */}
			{actionPlan.length > 0 && (
				<ActionPlanCard actions={actionPlan} isFreeTier={isFreeTier} />
			)}

			{opportunitiesContent}
			{rankingsContent}
			{cwvContent}
		</>
	);
}
