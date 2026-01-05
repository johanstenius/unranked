"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComponentState, InternalLinkingIssues } from "@/lib/types";

type InternalLinkingSummaryProps = {
	internalLinking: ComponentState<InternalLinkingIssues>;
	onViewDetails: () => void;
};

export function InternalLinkingSummary({
	internalLinking,
	onViewDetails,
}: InternalLinkingSummaryProps) {
	if (
		internalLinking.status === "pending" ||
		internalLinking.status === "running"
	) {
		return (
			<Card className="border-border rounded-xl">
				<CardHeader className="pb-3">
					<CardTitle className="font-display text-lg font-bold">
						Internal Linking
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-16 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (internalLinking.status === "failed") {
		return null;
	}

	const issues = internalLinking.data;
	const orphanCount = issues.orphanPages.length;
	const underlinkedCount = issues.underlinkedPages.length;
	const hasIssues = orphanCount > 0 || underlinkedCount > 0;

	return (
		<Card className="border-border rounded-xl">
			<CardHeader className="pb-3">
				<CardTitle className="font-display text-lg font-bold">
					Internal Linking
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<div className="flex justify-between items-center">
						<span className="text-text-secondary">Orphan pages</span>
						<span
							className={`tabular-nums font-medium ${
								orphanCount > 0 ? "text-status-crit" : "text-status-good"
							}`}
						>
							{orphanCount}
						</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-text-secondary">Underlinked pages</span>
						<span
							className={`tabular-nums font-medium ${
								underlinkedCount > 0 ? "text-status-warn" : "text-status-good"
							}`}
						>
							{underlinkedCount}
						</span>
					</div>
				</div>
				{hasIssues && (
					<button
						type="button"
						onClick={onViewDetails}
						className="text-sm text-text-secondary hover:text-text-primary mt-4 transition-colors"
					>
						View details →
					</button>
				)}
			</CardContent>
		</Card>
	);
}
