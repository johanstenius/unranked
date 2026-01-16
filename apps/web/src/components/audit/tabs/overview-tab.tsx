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
	CurrentRanking,
	Opportunity,
	PrioritizedAction,
} from "@/lib/types";
import { stripOrigin } from "@/lib/utils";
import { ActionPlanCard } from "../action-plan-card";

type OverviewTabProps = {
	rankings: ComponentState<CurrentRanking[]>;
	opportunities: ComponentState<Opportunity[]>;
	actionPlan: PrioritizedAction[];
	onViewAllOpportunities: () => void;
	isFreeTier?: boolean;
	technicalIssueCount?: number;
	pagesFound?: number | null;
	isProcessing?: boolean;
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
	actionPlan,
	onViewAllOpportunities,
	isFreeTier = false,
	technicalIssueCount = 0,
	pagesFound,
	isProcessing = false,
}: OverviewTabProps) {
	// Opportunities section - not available for FREE tier
	const opportunitiesContent = (() => {
		if (isFreeTier) return null;

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

	// Rankings section - not available for FREE tier
	const rankingsContent = (() => {
		if (isFreeTier) return null;

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

	// Free tier loading state
	const freeTierLoading = (() => {
		if (!isFreeTier || !isProcessing) return null;

		return (
			<Card className="border-border rounded-xl">
				<CardHeader className="pb-4">
					<CardTitle className="font-display text-xl font-bold">
						Analyzing Your Site
					</CardTitle>
					<CardDescription>
						Please wait while we crawl and analyze your website...
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<Skeleton className="h-16 w-full rounded-lg" />
						<Skeleton className="h-16 w-full rounded-lg" />
					</div>
				</CardContent>
			</Card>
		);
	})();

	// Free tier summary when no action plan (only show after processing complete)
	const freeTierSummary = (() => {
		if (!isFreeTier || actionPlan.length > 0 || isProcessing) return null;

		return (
			<Card className="border-border rounded-xl">
				<CardHeader className="pb-4">
					<CardTitle className="font-display text-xl font-bold">
						Audit Summary
					</CardTitle>
					<CardDescription>
						Your free technical SEO audit is complete
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Stats */}
					<div className="grid grid-cols-2 gap-4">
						<div className="p-4 rounded-lg bg-subtle">
							<div className="text-2xl font-display font-bold text-text-primary">
								{pagesFound ?? 0}
							</div>
							<div className="text-sm text-text-secondary">Pages crawled</div>
						</div>
						<div className="p-4 rounded-lg bg-subtle">
							<div className="text-2xl font-display font-bold text-text-primary">
								{technicalIssueCount}
							</div>
							<div className="text-sm text-text-secondary">
								{technicalIssueCount === 0 ? "No issues found" : "Issues found"}
							</div>
						</div>
					</div>

					{technicalIssueCount === 0 && (
						<div className="p-4 rounded-lg bg-status-good-bg border border-status-good/20">
							<p className="text-sm text-status-good">
								<span className="font-medium">Great news!</span> No critical
								technical issues were found on your site.
							</p>
						</div>
					)}

					{/* Upgrade teaser */}
					<div className="p-4 rounded-lg bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20">
						<h4 className="font-medium text-text-primary mb-2">
							Get the full picture
						</h4>
						<p className="text-sm text-text-secondary mb-3">
							Upgrade to discover keyword rankings, content opportunities, and
							AI-powered briefs.
						</p>
						<ul className="text-sm text-text-secondary space-y-1">
							<li className="flex items-center gap-2">
								<span className="text-status-good">✓</span> Current keyword
								rankings
							</li>
							<li className="flex items-center gap-2">
								<span className="text-status-good">✓</span> Content gap analysis
							</li>
							<li className="flex items-center gap-2">
								<span className="text-status-good">✓</span> AI content briefs
							</li>
							<li className="flex items-center gap-2">
								<span className="text-status-good">✓</span> Competitor insights
							</li>
						</ul>
					</div>
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

			{freeTierLoading}
			{freeTierSummary}
			{opportunitiesContent}
			{rankingsContent}
		</>
	);
}
