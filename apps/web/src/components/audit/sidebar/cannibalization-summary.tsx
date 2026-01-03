"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Analysis } from "@/lib/types";

type CannibalizationSummaryProps = {
	analysis: Analysis;
	onViewDetails: () => void;
};

export function CannibalizationSummary({
	analysis,
	onViewDetails,
}: CannibalizationSummaryProps) {
	if (analysis.cannibalizationIssues.length === 0) return null;

	const firstIssue = analysis.cannibalizationIssues[0];

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
							{analysis.cannibalizationIssues.length}
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
