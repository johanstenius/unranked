"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComponentState, QuickWin } from "@/lib/types";
import { stripOrigin } from "@/lib/utils";

type QuickWinsTabProps = {
	quickWins: ComponentState<QuickWin[]>;
};

export function QuickWinsTab({ quickWins }: QuickWinsTabProps) {
	if (quickWins.status === "pending" || quickWins.status === "running") {
		return (
			<div className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle className="font-display text-lg">Quick Wins</CardTitle>
						<CardDescription>
							Analyzing pages ranking 10-30 for improvement opportunities...
						</CardDescription>
					</CardHeader>
				</Card>
				<Card>
					<CardContent className="pt-6 space-y-3">
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-24 w-3/4" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (quickWins.status === "failed") {
		return (
			<div className="space-y-4">
				<Card className="border-status-crit/30">
					<CardHeader>
						<CardTitle className="font-display text-lg text-status-crit">
							Quick Wins
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-status-crit">{quickWins.error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const wins = quickWins.data;

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="font-display text-lg">Quick Wins</CardTitle>
					<CardDescription>
						Pages ranking 10-30 that could move up with small improvements
					</CardDescription>
				</CardHeader>
			</Card>
			{wins.length === 0 ? (
				<Card>
					<CardContent className="pt-6 text-center text-muted-foreground">
						No quick wins identified
					</CardContent>
				</Card>
			) : (
				wins.map((qw) => (
					<Card key={qw.url}>
						<CardContent className="pt-6">
							<div className="flex items-start justify-between mb-3">
								<div>
									<span className="font-medium">{qw.keyword}</span>
									<span className="text-xs text-muted-foreground block truncate max-w-[400px]">
										{stripOrigin(qw.url)}
									</span>
								</div>
								<span className="text-sm bg-muted px-2 py-1 rounded">
									#{qw.currentPosition}
								</span>
							</div>
							<div className="space-y-2">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
									Suggestions
								</p>
								<ul className="text-sm text-muted-foreground space-y-1">
									{qw.suggestions.map((s, i) => (
										<li key={`${qw.url}-${i}`}>• {s}</li>
									))}
								</ul>
							</div>
							{qw.aiSuggestions && (
								<div className="mt-4 pt-4 border-t border-border">
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
										AI Analysis
									</p>
									{qw.aiSuggestions.contentGaps.length > 0 && (
										<div className="mb-3">
											<p className="text-xs text-muted-foreground mb-1">
												Content gaps:
											</p>
											<ul className="text-sm space-y-1">
												{qw.aiSuggestions.contentGaps.map((gap) => (
													<li key={gap}>+ {gap}</li>
												))}
											</ul>
										</div>
									)}
									{qw.aiSuggestions.questionsToAnswer.length > 0 && (
										<div className="mb-3">
											<p className="text-xs text-muted-foreground mb-1">
												Questions to answer:
											</p>
											<ul className="text-sm space-y-1">
												{qw.aiSuggestions.questionsToAnswer.map((q) => (
													<li key={q}>? {q}</li>
												))}
											</ul>
										</div>
									)}
									<p className="text-sm text-status-good">
										Estimated new position: #
										{qw.aiSuggestions.estimatedNewPosition}
									</p>
								</div>
							)}
						</CardContent>
					</Card>
				))
			)}
		</div>
	);
}
