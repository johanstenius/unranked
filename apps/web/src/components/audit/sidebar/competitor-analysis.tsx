"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CompetitorData, ComponentState } from "@/lib/types";

type CompetitorAnalysisProps = {
	competitors: ComponentState<CompetitorData>;
};

export function CompetitorAnalysis({ competitors }: CompetitorAnalysisProps) {
	if (competitors.status === "pending" || competitors.status === "running") {
		return (
			<Card className="border-border rounded-xl">
				<CardHeader className="pb-3">
					<CardTitle className="font-display text-lg font-bold">
						Competitors
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-16 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (competitors.status === "failed") {
		return null;
	}

	const { gaps, discovered } = competitors.data;
	const hasCompetitors = gaps.length > 0 || discovered.length > 0;

	if (!hasCompetitors) return null;

	return (
		<Card className="border-border rounded-xl">
			<CardHeader className="pb-3">
				<CardTitle className="font-display text-lg font-bold">
					{discovered.length > 0 ? "Competitors Found" : "Competitor Gap"}
				</CardTitle>
				{discovered.length > 0 && (
					<CardDescription className="text-sm">
						{discovered.length} domains competing for your keywords
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				{gaps.map((gap) => (
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
