"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { OpportunityCluster } from "@/lib/types";
import {
	getDifficultyColor,
	getDifficultyLabel,
	getIntentBadgeClass,
} from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

type OpportunityClusterCardProps = {
	cluster: OpportunityCluster;
};

const ACTION_BADGES: Record<
	OpportunityCluster["suggestedAction"],
	{ label: string; className: string }
> = {
	create: {
		label: "Create",
		className:
			"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
	},
	optimize: {
		label: "Optimize",
		className:
			"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
	},
	expand: {
		label: "Expand",
		className:
			"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
	},
};

export function OpportunityClusterCard({
	cluster,
}: OpportunityClusterCardProps) {
	const [expanded, setExpanded] = useState(false);
	const badge = ACTION_BADGES[cluster.suggestedAction];

	return (
		<Card className="overflow-hidden">
			<button
				type="button"
				className="w-full text-left"
				onClick={() => setExpanded(!expanded)}
			>
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1 min-w-0">
							<CardTitle className="font-display text-base flex items-center gap-2">
								<span className="truncate">{cluster.topic}</span>
								<span
									className={`text-xs px-2 py-0.5 rounded ${badge.className}`}
								>
									{badge.label}
								</span>
							</CardTitle>
							<CardDescription className="mt-1">
								{cluster.opportunities.length} keywords &middot;{" "}
								{cluster.totalVolume.toLocaleString()} total volume &middot;{" "}
								<span className={getDifficultyColor(cluster.avgDifficulty)}>
									{getDifficultyLabel(cluster.avgDifficulty)} difficulty
								</span>
							</CardDescription>
						</div>
						<ChevronDown
							className={`w-5 h-5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
						/>
					</div>
				</CardHeader>
			</button>

			{expanded && (
				<CardContent className="pt-0 border-t border-border">
					<div className="divide-y divide-border">
						{cluster.opportunities.map((opp) => (
							<div
								key={opp.keyword}
								className="py-3 flex items-center justify-between gap-4"
							>
								<div className="flex-1 min-w-0">
									<span className="font-medium text-sm">{opp.keyword}</span>
									{opp.intent && (
										<span
											className={`ml-2 text-xs px-1.5 py-0.5 rounded ${getIntentBadgeClass(opp.intent)}`}
										>
											{opp.intent}
										</span>
									)}
									<p className="text-xs text-muted-foreground mt-0.5">
										{opp.reason}
									</p>
								</div>
								<div className="flex items-center gap-4 text-sm shrink-0">
									<span className="text-muted-foreground w-16 text-right">
										{opp.searchVolume.toLocaleString()}
									</span>
									<span
										className={`w-16 text-right ${getDifficultyColor(opp.difficulty)}`}
									>
										{opp.difficulty}
									</span>
								</div>
							</div>
						))}
					</div>

					{cluster.existingPage && (
						<div className="mt-3 pt-3 border-t border-border">
							<p className="text-xs text-muted-foreground">
								Existing page:{" "}
								<a
									href={cluster.existingPage}
									target="_blank"
									rel="noopener noreferrer"
									className="text-accent hover:underline"
								>
									{cluster.existingPage}
								</a>
							</p>
						</div>
					)}
				</CardContent>
			)}
		</Card>
	);
}
