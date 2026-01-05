"use client";

import { SnippetOpportunityRow } from "@/components/audit/snippet-opportunity-row";
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
	Opportunity,
	OpportunityCluster,
	SnippetOpportunity,
} from "@/lib/types";
import { getDifficultyColor, getDifficultyLabel } from "@/lib/utils";
import { useState } from "react";

type OpportunitiesTabProps = {
	opportunities: ComponentState<Opportunity[]>;
	clusters: OpportunityCluster[];
	snippets: ComponentState<SnippetOpportunity[]>;
};

const ACTION_CONFIG = {
	create: {
		label: "Create new page",
		bg: "bg-green-100 dark:bg-green-900/30",
		text: "text-green-700 dark:text-green-400",
		icon: "+",
	},
	optimize: {
		label: "Optimize existing",
		bg: "bg-amber-100 dark:bg-amber-900/30",
		text: "text-amber-700 dark:text-amber-400",
		icon: "↑",
	},
	expand: {
		label: "Expand content",
		bg: "bg-blue-100 dark:bg-blue-900/30",
		text: "text-blue-700 dark:text-blue-400",
		icon: "→",
	},
};

function ClusterCard({ cluster }: { cluster: OpportunityCluster }) {
	const [expanded, setExpanded] = useState(false);
	const config = ACTION_CONFIG[cluster.suggestedAction];

	return (
		<Card className="overflow-hidden">
			<button
				type="button"
				className="w-full p-4 flex items-start gap-4 text-left hover:bg-muted transition-colors"
				onClick={() => setExpanded(!expanded)}
			>
				<span
					className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center text-sm font-bold ${config.bg} ${config.text}`}
				>
					{config.icon}
				</span>

				<div className="flex-1 min-w-0">
					<h3 className="font-medium mb-1">{cluster.topic}</h3>
					<div className="flex items-center gap-3 text-xs text-muted-foreground">
						<span>{cluster.opportunities.length} keywords</span>
						<span>•</span>
						<span>{cluster.totalVolume.toLocaleString()} total volume</span>
						<span>•</span>
						<span className={getDifficultyColor(cluster.avgDifficulty)}>
							{getDifficultyLabel(cluster.avgDifficulty)} difficulty
						</span>
					</div>
					{cluster.existingPage && (
						<div className="mt-2 text-xs text-muted-foreground truncate">
							Existing: {new URL(cluster.existingPage).pathname}
						</div>
					)}
				</div>

				<div className="flex items-center gap-3">
					<span
						className={`text-xs px-2 py-1 rounded ${config.bg} ${config.text}`}
					>
						{config.label}
					</span>
					<span className="text-muted-foreground">{expanded ? "▲" : "▼"}</span>
				</div>
			</button>

			{expanded && (
				<div className="border-t border-border bg-muted/50 p-4">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Keyword</TableHead>
								<TableHead>Intent</TableHead>
								<TableHead className="text-right">Volume</TableHead>
								<TableHead className="text-right">Difficulty</TableHead>
								<TableHead className="text-right">Impact</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{cluster.opportunities.map((opp) => (
								<TableRow key={opp.keyword}>
									<TableCell>
										<span>{opp.keyword}</span>
										{opp.source && (
											<span className="ml-2 text-xs text-muted-foreground">
												{opp.source === "seed_expansion" && "🌱"}
												{opp.source === "competitor_gap" && "🎯"}
												{opp.source === "content_extraction" && "📝"}
											</span>
										)}
									</TableCell>
									<TableCell>
										{opp.intent && (
											<span
												className={`text-xs px-2 py-0.5 rounded ${
													opp.intent === "informational"
														? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
														: opp.intent === "transactional"
															? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
															: opp.intent === "commercial"
																? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
																: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
												}`}
											>
												{opp.intent}
											</span>
										)}
									</TableCell>
									<TableCell className="text-right text-muted-foreground">
										{opp.searchVolume.toLocaleString()}
									</TableCell>
									<TableCell className="text-right">
										<span className={getDifficultyColor(opp.difficulty)}>
											{opp.difficulty}
										</span>
									</TableCell>
									<TableCell className="text-right font-medium">
										{opp.impactScore.toFixed(0)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</Card>
	);
}

function LoadingCard({
	title,
	description,
}: { title: string; description: string }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-3/4" />
				</div>
			</CardContent>
		</Card>
	);
}

export function OpportunitiesTab({
	opportunities,
	clusters,
	snippets,
}: OpportunitiesTabProps) {
	// Opportunities / Clusters section
	const opportunitiesContent = (() => {
		if (
			opportunities.status === "pending" ||
			opportunities.status === "running"
		) {
			return (
				<LoadingCard
					title="Topic Clusters"
					description="Analyzing keyword opportunities..."
				/>
			);
		}

		if (opportunities.status === "failed") {
			return (
				<Card className="border-status-crit/30">
					<CardHeader>
						<CardTitle className="font-display text-lg text-status-crit">
							Opportunities
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-status-crit">{opportunities.error}</p>
					</CardContent>
				</Card>
			);
		}

		const opps = opportunities.data;
		const hasClusters = clusters.length > 0;

		if (hasClusters) {
			return (
				<div>
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="font-display font-semibold text-lg text-text-primary">
								Topic Clusters
							</h2>
							<p className="text-sm text-text-secondary">
								{clusters.length} content opportunities grouped by topic
							</p>
						</div>
						<div className="flex items-center gap-2 text-xs text-text-tertiary">
							<span className="flex items-center gap-1">
								<span className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-[10px] font-bold">
									+
								</span>
								Create
							</span>
							<span className="flex items-center gap-1">
								<span className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 text-[10px] font-bold">
									↑
								</span>
								Optimize
							</span>
							<span className="flex items-center gap-1">
								<span className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 text-[10px] font-bold">
									→
								</span>
								Expand
							</span>
						</div>
					</div>

					<div className="space-y-3">
						{clusters.map((cluster) => (
							<ClusterCard key={cluster.topic} cluster={cluster} />
						))}
					</div>
				</div>
			);
		}

		return (
			<Card>
				<CardHeader>
					<CardTitle className="font-display text-lg">
						All Opportunities
					</CardTitle>
					<CardDescription>Keywords ranked by potential impact</CardDescription>
				</CardHeader>
				<CardContent>
					{opps.length === 0 ? (
						<p className="text-center text-muted-foreground py-6">
							No opportunities found
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Keyword</TableHead>
									<TableHead>Intent</TableHead>
									<TableHead>Volume</TableHead>
									<TableHead>Difficulty</TableHead>
									<TableHead>Impact</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{opps.map((opp) => (
									<TableRow key={opp.keyword}>
										<TableCell>
											<span className="font-medium block">{opp.keyword}</span>
											<span className="text-xs text-muted-foreground">
												{opp.reason}
											</span>
										</TableCell>
										<TableCell>
											{opp.intent && (
												<span
													className={`text-xs px-2 py-0.5 rounded ${
														opp.intent === "informational"
															? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
															: opp.intent === "transactional"
																? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
																: opp.intent === "commercial"
																	? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
																	: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
													}`}
												>
													{opp.intent}
												</span>
											)}
										</TableCell>
										<TableCell className="text-muted-foreground">
											{opp.searchVolume.toLocaleString()}
										</TableCell>
										<TableCell>
											<span className={getDifficultyColor(opp.difficulty)}>
												{getDifficultyLabel(opp.difficulty)}
											</span>
										</TableCell>
										<TableCell className="font-medium">
											{opp.impactScore.toFixed(0)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		);
	})();

	// Snippets section
	const snippetsContent = (() => {
		if (snippets.status === "pending" || snippets.status === "running") {
			return null; // Don't show loading for snippets, it's secondary
		}

		if (snippets.status === "failed") {
			return null; // Silently skip failed snippets
		}

		if (snippets.data.length === 0) {
			return null;
		}

		return (
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="font-display text-lg">
							Featured Snippet Opportunities
						</CardTitle>
						<span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
							Click to preview
						</span>
					</div>
					<CardDescription>
						Keywords with featured snippets you can target
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
						<div className="w-3" />
						<div className="flex-1">Keyword</div>
						<div className="w-[88px] text-center">Type</div>
						<div className="w-20 text-right">Volume</div>
						<div className="w-16 text-center">Position</div>
						<div className="w-16 text-right">Difficulty</div>
					</div>

					<div className="space-y-2">
						{snippets.data.map((snip) => (
							<SnippetOpportunityRow key={snip.keyword} snippet={snip} />
						))}
					</div>
				</CardContent>
			</Card>
		);
	})();

	return (
		<div className="space-y-6">
			{opportunitiesContent}
			{snippetsContent}
		</div>
	);
}
