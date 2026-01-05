"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Analysis } from "@/lib/types";
import { stripOrigin } from "@/lib/utils";
import { ActionPlanCard } from "../action-plan-card";

type OverviewTabProps = {
	analysis: Analysis;
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

export function OverviewTab({
	analysis,
	onViewAllOpportunities,
	onViewPerformance,
	isFreeTier = false,
}: OverviewTabProps) {
	return (
		<>
			{/* Action Plan - prioritized recommendations */}
			{analysis.actionPlan && analysis.actionPlan.length > 0 && (
				<ActionPlanCard actions={analysis.actionPlan} isFreeTier={isFreeTier} />
			)}

			{analysis.sectionStats.length > 0 && (
				<Card className="border-border rounded-xl">
					<CardHeader className="pb-4">
						<CardTitle className="font-display text-xl font-bold">
							Section Breakdown
						</CardTitle>
						<CardDescription>Stats per section of your website</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow className="border-border hover:bg-transparent">
									<TableHead className="text-text-tertiary font-medium">
										Section
									</TableHead>
									<TableHead className="text-text-tertiary font-medium">
										Pages
									</TableHead>
									<TableHead className="text-text-tertiary font-medium">
										Keywords
									</TableHead>
									<TableHead className="text-text-tertiary font-medium">
										Est. Traffic
									</TableHead>
									<TableHead className="text-text-tertiary font-medium">
										Issues
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{analysis.sectionStats.map((s) => (
									<TableRow
										key={s.section}
										className="border-0 hover:bg-subtle/50"
									>
										<TableCell className="font-medium text-text-primary">
											{s.section}
										</TableCell>
										<TableCell className="text-text-secondary tabular-nums">
											{s.pagesCount}
										</TableCell>
										<TableCell className="text-text-secondary tabular-nums">
											{s.rankingKeywords}
										</TableCell>
										<TableCell className="text-text-secondary tabular-nums">
											~{s.estimatedTraffic.toLocaleString()}
										</TableCell>
										<TableCell>
											<span
												className={`tabular-nums ${
													s.technicalIssues > 0
														? "text-status-warn"
														: "text-status-good"
												}`}
											>
												{s.technicalIssues}
											</span>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{analysis.opportunities.length > 0 && (
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
								{analysis.opportunities.slice(0, 5).map((opp) => (
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
						{analysis.opportunities.length > 5 && (
							<button
								type="button"
								onClick={onViewAllOpportunities}
								className="text-sm text-text-secondary hover:text-text-primary mt-4 transition-colors"
							>
								View all {analysis.opportunities.length} opportunities →
							</button>
						)}
					</CardContent>
				</Card>
			)}

			{analysis.currentRankings.length > 0 && (
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
								{analysis.currentRankings.slice(0, 10).map((ranking) => (
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
			)}

			{/* Performance Overview */}
			{analysis.coreWebVitals &&
				analysis.coreWebVitals.pages.length > 0 &&
				onViewPerformance && (
					<Card className="border-border rounded-xl">
						<CardHeader className="pb-4">
							<CardTitle className="font-display text-xl font-bold">
								Performance Overview
							</CardTitle>
							<CardDescription>
								Core Web Vitals across {analysis.coreWebVitals.pages.length}{" "}
								pages
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-3 gap-4 mb-4">
								<div className="text-center p-3 rounded-lg bg-status-good/10">
									<p className="text-2xl font-bold text-status-good tabular-nums">
										{analysis.coreWebVitals.summary.good}
									</p>
									<p className="text-xs text-text-tertiary">Good</p>
								</div>
								<div className="text-center p-3 rounded-lg bg-status-warn/10">
									<p className="text-2xl font-bold text-status-warn tabular-nums">
										{analysis.coreWebVitals.summary.needsImprovement}
									</p>
									<p className="text-xs text-text-tertiary">Needs Work</p>
								</div>
								<div className="text-center p-3 rounded-lg bg-status-crit/10">
									<p className="text-2xl font-bold text-status-crit tabular-nums">
										{analysis.coreWebVitals.summary.poor}
									</p>
									<p className="text-xs text-text-tertiary">Poor</p>
								</div>
							</div>

							{analysis.coreWebVitals.summary.avgPerformance !== null && (
								<p className="text-sm text-text-secondary text-center mb-4">
									Average score:{" "}
									<span
										className={`font-medium ${
											analysis.coreWebVitals.summary.avgPerformance >= 90
												? "text-status-good"
												: analysis.coreWebVitals.summary.avgPerformance >= 50
													? "text-status-warn"
													: "text-status-crit"
										}`}
									>
										{analysis.coreWebVitals.summary.avgPerformance.toFixed(0)}
									</span>
								</p>
							)}

							<button
								type="button"
								onClick={onViewPerformance}
								className="text-sm text-text-secondary hover:text-text-primary transition-colors"
							>
								View all {analysis.coreWebVitals.pages.length} pages →
							</button>
						</CardContent>
					</Card>
				)}
		</>
	);
}
