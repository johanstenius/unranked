"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CannibalizationIssue, ComponentState } from "@/lib/types";

type CannibalizationSummaryProps = {
	cannibalization: ComponentState<CannibalizationIssue[]>;
	onViewDetails: () => void;
};

export function CannibalizationSummary({
	cannibalization,
	onViewDetails,
}: CannibalizationSummaryProps) {
	if (
		cannibalization.status === "pending" ||
		cannibalization.status === "running"
	) {
		return (
			<Card className="border-border rounded-xl">
				<CardHeader className="pb-3">
					<CardTitle className="font-display text-lg font-bold">
						Cannibalization
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-16 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (cannibalization.status === "failed") {
		return null;
	}

	const issues = cannibalization.data;
	if (issues.length === 0) return null;

	const firstIssue = issues[0];

	return (
		<Card className="border-border rounded-xl">
			<CardHeader className="pb-3">
				<CardTitle className="font-display text-lg font-bold">
					Cannibalization
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<div className="flex justify-between items-center">
						<span className="text-text-secondary">Competing keywords</span>
						<span className="text-status-warn font-medium tabular-nums">
							{issues.length}
						</span>
					</div>
					{firstIssue && (
						<div className="text-sm text-text-tertiary space-y-1 pt-1">
							<p className="text-xs">Highest impact:</p>
							<p className="text-text-secondary">
								&ldquo;{firstIssue.keyword}&rdquo;
							</p>
							<p className="text-xs tabular-nums">
								{firstIssue.searchVolume.toLocaleString()} monthly searches
							</p>
						</div>
					)}
				</div>
				<button
					type="button"
					onClick={onViewDetails}
					className="text-sm text-text-secondary hover:text-text-primary mt-4 transition-colors"
				>
					View details →
				</button>
			</CardContent>
		</Card>
	);
}
