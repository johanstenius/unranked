"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Analysis } from "@/lib/types";

type CompetitorAnalysisProps = {
	analysis: Analysis;
};

export function CompetitorAnalysis({ analysis }: CompetitorAnalysisProps) {
	const hasCompetitors =
		analysis.competitorGaps.length > 0 ||
		(analysis.discoveredCompetitors?.length ?? 0) > 0;

	if (!hasCompetitors) return null;

	return (
		<Card className="border-border rounded-xl">
			<CardHeader className="pb-3">
				<CardTitle className="font-display text-lg font-bold">
					{(analysis.discoveredCompetitors?.length ?? 0) > 0
						? "Competitors Found"
						: "Competitor Gap"}
				</CardTitle>
				{(analysis.discoveredCompetitors?.length ?? 0) > 0 && (
					<CardDescription className="text-sm">
						{analysis.discoveredCompetitors?.length} domains competing for your
						keywords
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				{analysis.competitorGaps.map((gap) => (
					<div key={gap.competitor}>
						<div className="flex justify-between text-sm mb-1.5">
							<span className="text-text-primary font-medium">
								{gap.competitor}
							</span>
							<span className="text-text-secondary tabular-nums">
								{gap.gapKeywords.length} gaps
							</span>
						</div>
						<div className="h-1.5 bg-subtle rounded-full overflow-hidden">
							<div
								className="h-full bg-status-crit/80 rounded-full transition-all"
								style={{
									width: `${Math.min((gap.gapKeywords.length / 50) * 100, 100)}%`,
								}}
							/>
						</div>
						{gap.gapKeywords[0] && (
							<p className="text-xs text-text-tertiary mt-1.5">
								Top: {gap.gapKeywords[0].keyword}
							</p>
						)}
					</div>
				))}
				<p className="text-xs text-text-tertiary pt-1">
					Keywords they rank for that you don&apos;t
				</p>
			</CardContent>
		</Card>
	);
}
