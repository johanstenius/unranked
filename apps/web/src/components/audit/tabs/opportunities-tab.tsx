"use client";

import { OpportunitiesEmptyState } from "@/components/audit/empty-states";
import { OpportunityClusterCard } from "@/components/audit/opportunity-cluster-card";
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
import {
	getDifficultyColor,
	getDifficultyLabel,
	getIntentBadgeClass,
} from "@/lib/utils";
import { useState } from "react";

type ViewMode = "all" | "byTopic";

type OpportunitiesTabProps = {
	opportunities: ComponentState<Opportunity[]>;
	snippets: ComponentState<SnippetOpportunity[]>;
	isNewSite?: boolean;
	opportunityClusters?: OpportunityCluster[];
};

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

function ViewToggle({
	value,
	onChange,
}: { value: ViewMode; onChange: (v: ViewMode) => void }) {
	return (
		<div className="flex gap-1 p-1 bg-muted rounded-lg">
			<button
				type="button"
				onClick={() => onChange("all")}
				className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
					value === "all"
						? "bg-background text-foreground shadow-sm"
						: "text-muted-foreground hover:text-foreground"
				}`}
			>
				All Keywords
			</button>
			<button
				type="button"
				onClick={() => onChange("byTopic")}
				className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
					value === "byTopic"
						? "bg-background text-foreground shadow-sm"
						: "text-muted-foreground hover:text-foreground"
				}`}
			>
				By Topic
			</button>
		</div>
	);
}

export function OpportunitiesTab({
	opportunities,
	snippets,
	isNewSite,
	opportunityClusters,
}: OpportunitiesTabProps) {
	const [viewMode, setViewMode] = useState<ViewMode>("all");
	const hasClusters = opportunityClusters && opportunityClusters.length > 0;

	// Opportunities section
	const opportunitiesContent = (() => {
		if (
			opportunities.status === "pending" ||
			opportunities.status === "running"
		) {
			return (
				<LoadingCard
					title="Keyword Opportunities"
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

		if (opps.length === 0) {
			return (
				<Card>
					<CardHeader>
						<CardTitle className="font-display text-lg">
							{isNewSite ? "Keywords to Target" : "All Opportunities"}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<OpportunitiesEmptyState isNewSite={isNewSite} />
					</CardContent>
				</Card>
			);
		}

		return (
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="font-display text-lg">
								{isNewSite ? "Keywords to Target" : "All Opportunities"}
							</CardTitle>
							<CardDescription>
								{isNewSite
									? "High-potential keywords for your new site"
									: "Keywords ranked by potential impact"}
							</CardDescription>
						</div>
						{hasClusters && (
							<ViewToggle value={viewMode} onChange={setViewMode} />
						)}
					</div>
				</CardHeader>
				<CardContent>
					{viewMode === "byTopic" && hasClusters ? (
						<div className="space-y-4">
							{opportunityClusters.map((cluster) => (
								<OpportunityClusterCard key={cluster.topic} cluster={cluster} />
							))}
						</div>
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
													className={`text-xs px-2 py-0.5 rounded ${getIntentBadgeClass(opp.intent)}`}
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
			return null;
		}

		if (snippets.status === "failed") {
			return null;
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
