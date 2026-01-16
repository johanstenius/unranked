"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRuleInfo } from "@/lib/rule-catalog";
import type {
	ComponentState,
	InternalLinkingIssues,
	TechnicalIssue,
} from "@/lib/types";
import { cn, stripOrigin } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, ChevronRight, Info } from "lucide-react";
import { useState } from "react";

type TechnicalTabProps = {
	technical: ComponentState<TechnicalIssue[]>;
	internalLinking: ComponentState<InternalLinkingIssues>;
};

type PageWithDetail = {
	url: string;
	detail?: string;
};

type GroupedIssue = {
	rule: string;
	severity: "low" | "medium" | "high";
	pages: PageWithDetail[];
};

type SeverityCounts = {
	high: number;
	medium: number;
	low: number;
};

// Extract grade from "Content too complex (grade 14.7, aim for 10-12)"
const COMPLEXITY_REGEX = /^Content too complex \(grade ([\d.]+),/;

function normalizeRule(issue: string): { rule: string; detail?: string } {
	const match = issue.match(COMPLEXITY_REGEX);
	if (match) {
		return { rule: "Content too complex", detail: `Grade ${match[1]}` };
	}
	return { rule: issue };
}

function groupIssuesByRule(issues: TechnicalIssue[]): GroupedIssue[] {
	const groups = new Map<
		string,
		{
			severity: "low" | "medium" | "high";
			pages: Map<string, string | undefined>;
		}
	>();

	for (const issue of issues) {
		const { rule, detail } = normalizeRule(issue.issue);
		const existing = groups.get(rule);
		if (existing) {
			existing.pages.set(issue.url, detail);
			if (
				issue.severity === "high" ||
				(issue.severity === "medium" && existing.severity === "low")
			) {
				existing.severity = issue.severity;
			}
		} else {
			const pages = new Map<string, string | undefined>();
			pages.set(issue.url, detail);
			groups.set(rule, { severity: issue.severity, pages });
		}
	}

	return Array.from(groups.entries())
		.map(([rule, data]) => ({
			rule,
			severity: data.severity,
			pages: Array.from(data.pages.entries()).map(([url, detail]) => ({
				url,
				detail,
			})),
		}))
		.sort((a, b) => {
			const severityOrder = { high: 0, medium: 1, low: 2 };
			const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
			return sevDiff !== 0 ? sevDiff : b.pages.length - a.pages.length;
		});
}

function countBySeverity(groups: GroupedIssue[]): SeverityCounts {
	return groups.reduce(
		(acc, g) => {
			acc[g.severity]++;
			return acc;
		},
		{ high: 0, medium: 0, low: 0 },
	);
}

function SeveritySummary({ counts }: { counts: SeverityCounts }) {
	const total = counts.high + counts.medium + counts.low;

	return (
		<div className="flex items-center gap-6 pb-4 mb-4 border-b border-border">
			{counts.high > 0 && (
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-status-crit ring-[3px] ring-status-crit-bg" />
					<span className="text-sm text-text-secondary">
						<span className="font-semibold text-text-primary tabular-nums">
							{counts.high}
						</span>{" "}
						critical
					</span>
				</div>
			)}
			{counts.medium > 0 && (
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-status-warn ring-[3px] ring-status-warn-bg" />
					<span className="text-sm text-text-secondary">
						<span className="font-semibold text-text-primary tabular-nums">
							{counts.medium}
						</span>{" "}
						warning
					</span>
				</div>
			)}
			{counts.low > 0 && (
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-text-tertiary ring-[3px] ring-subtle" />
					<span className="text-sm text-text-secondary">
						<span className="font-semibold text-text-primary tabular-nums">
							{counts.low}
						</span>{" "}
						minor
					</span>
				</div>
			)}
			<span className="text-sm text-text-tertiary ml-auto">
				{total} {total === 1 ? "issue" : "issues"} found
			</span>
		</div>
	);
}

function IssueCard({ group }: { group: GroupedIssue }) {
	const [expanded, setExpanded] = useState(false);
	const ruleInfo = getRuleInfo(group.rule);

	const severityStyles = {
		high: {
			accent: "bg-status-crit",
			text: "text-status-crit",
			icon: <AlertTriangle className="w-5 h-5" />,
		},
		medium: {
			accent: "bg-status-warn",
			text: "text-status-warn",
			icon: <AlertTriangle className="w-5 h-5" />,
		},
		low: {
			accent: "bg-text-tertiary",
			text: "text-text-tertiary",
			icon: <Info className="w-5 h-5" />,
		},
	};

	const style = severityStyles[group.severity];

	return (
		<div className="border-t border-border first:border-t-0">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-start gap-4 py-4 px-1 text-left hover:bg-hover transition-colors group"
			>
				<div
					className={cn(
						"w-[3px] min-h-[44px] rounded-full shrink-0",
						style.accent,
					)}
				/>
				<div className={cn("shrink-0 mt-0.5", style.text)}>{style.icon}</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="font-semibold text-text-primary">
							{group.rule}
						</span>
						{ruleInfo && (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
										<Info className="h-3.5 w-3.5 text-text-tertiary/60 cursor-help shrink-0" />
									</TooltipTrigger>
									<TooltipContent side="top" className="max-w-[300px]">
										<p className="text-sm">{ruleInfo.description}</p>
										{ruleInfo.source && (
											<a
												href={ruleInfo.source.url}
												target="_blank"
												rel="noopener noreferrer"
												className="text-xs text-accent-indigo hover:underline mt-2 block"
											>
												{ruleInfo.source.label} ↗
											</a>
										)}
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
					</div>
					<span className="text-sm text-text-tertiary">
						Affects {group.pages.length}{" "}
						{group.pages.length === 1 ? "page" : "pages"}
					</span>
				</div>

				<ChevronRight
					className={cn(
						"w-4 h-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-1",
						expanded && "rotate-90 opacity-100",
					)}
				/>
			</button>

			{expanded && (
				<div className="pb-4 pl-14 pr-4">
					<div className="space-y-1 border-t border-border pt-3">
						{group.pages.map((page) => (
							<div
								key={page.url}
								className="flex items-center justify-between text-sm py-1"
							>
								<span className="text-text-secondary truncate font-mono">
									{stripOrigin(page.url)}
								</span>
								{page.detail && (
									<span className="text-text-tertiary text-xs tabular-nums shrink-0 ml-4">
										{page.detail}
									</span>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<div className="w-12 h-12 rounded-full bg-status-good-bg flex items-center justify-center mb-4">
				<CheckCircle2 className="w-6 h-6 text-status-good" />
			</div>
			<p className="font-medium text-text-primary mb-1">All clear</p>
			<p className="text-sm text-text-secondary">
				No technical SEO issues detected
			</p>
		</div>
	);
}

function LoadingCard({
	title,
	description,
}: { title: string; description: string }) {
	return (
		<Card className="border-border rounded-xl">
			<CardHeader className="pb-4">
				<CardTitle className="font-display text-xl font-bold">
					{title}
				</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-3/4" />
				</div>
			</CardContent>
		</Card>
	);
}

function ErrorCard({ title, error }: { title: string; error: string }) {
	return (
		<Card className="border-border rounded-xl border-status-crit/30">
			<CardHeader className="pb-4">
				<CardTitle className="font-display text-xl font-bold text-status-crit">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-status-crit">{error}</p>
			</CardContent>
		</Card>
	);
}

export function TechnicalTab({
	technical,
	internalLinking,
}: TechnicalTabProps) {
	// Technical issues section
	const technicalContent = (() => {
		if (technical.status === "pending" || technical.status === "running") {
			return (
				<LoadingCard
					title="Technical Audit"
					description="Analyzing SEO issues..."
				/>
			);
		}
		if (technical.status === "failed") {
			return <ErrorCard title="Technical Audit" error={technical.error} />;
		}
		const groupedIssues = groupIssuesByRule(technical.data);
		const severityCounts = countBySeverity(groupedIssues);
		return (
			<Card className="border-border rounded-xl">
				<CardHeader className="pb-4">
					<CardTitle className="font-display text-xl font-bold">
						Technical Audit
					</CardTitle>
					<CardDescription>
						SEO issues detected across your pages
					</CardDescription>
				</CardHeader>
				<CardContent>
					{groupedIssues.length === 0 ? (
						<EmptyState />
					) : (
						<div>
							<SeveritySummary counts={severityCounts} />
							<div>
								{groupedIssues.map((group) => (
									<IssueCard key={group.rule} group={group} />
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		);
	})();

	// Internal linking section
	const linkingContent = (() => {
		if (
			internalLinking.status === "pending" ||
			internalLinking.status === "running"
		) {
			return (
				<LoadingCard
					title="Internal Linking"
					description="Analyzing link structure..."
				/>
			);
		}
		if (internalLinking.status === "failed") {
			return (
				<ErrorCard title="Internal Linking" error={internalLinking.error} />
			);
		}
		const issues = internalLinking.data;
		return (
			<Card className="border-border rounded-xl">
				<CardHeader className="pb-4">
					<CardTitle className="font-display text-xl font-bold">
						Internal Linking
					</CardTitle>
					<CardDescription>
						Pages that need better internal links
					</CardDescription>
				</CardHeader>
				<CardContent>
					{issues.orphanPages.length === 0 &&
					issues.underlinkedPages.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="w-12 h-12 rounded-full bg-status-good-bg flex items-center justify-center mb-4">
								<CheckCircle2 className="w-6 h-6 text-status-good" />
							</div>
							<p className="font-medium text-text-primary mb-1">
								Links look good
							</p>
							<p className="text-sm text-text-secondary">
								No internal linking issues found
							</p>
						</div>
					) : (
						<div>
							{issues.orphanPages.length > 0 && (
								<div className="border-t border-border py-4 px-1">
									<div className="flex items-start gap-4">
										<div className="w-[3px] min-h-[44px] rounded-full bg-status-crit shrink-0" />
										<AlertTriangle className="w-5 h-5 text-status-crit shrink-0" />
										<div className="flex-1">
											<div className="mb-2">
												<span className="font-semibold text-text-primary">
													Orphan Pages
												</span>
												<span className="text-sm text-text-tertiary ml-2">
													No incoming links
												</span>
											</div>
											<div className="space-y-1">
												{issues.orphanPages.map((url) => (
													<div
														key={url}
														className="text-sm text-text-secondary py-1 truncate font-mono"
													>
														{stripOrigin(url)}
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							)}

							{issues.underlinkedPages.length > 0 && (
								<div className="border-t border-border py-4 px-1">
									<div className="flex items-start gap-4">
										<div className="w-[3px] min-h-[44px] rounded-full bg-status-warn shrink-0" />
										<AlertTriangle className="w-5 h-5 text-status-warn shrink-0" />
										<div className="flex-1">
											<div className="mb-2">
												<span className="font-semibold text-text-primary">
													Underlinked Pages
												</span>
												<span className="text-sm text-text-tertiary ml-2">
													Need more internal links
												</span>
											</div>
											<div className="space-y-1">
												{issues.underlinkedPages.map((p) => (
													<div
														key={p.url}
														className="flex items-center justify-between text-sm py-1"
													>
														<span className="text-text-secondary truncate font-mono max-w-[300px]">
															{stripOrigin(p.url)}
														</span>
														<span className="text-text-tertiary tabular-nums shrink-0 ml-4">
															{p.incomingLinks}{" "}
															{p.incomingLinks === 1 ? "link" : "links"}
														</span>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		);
	})();

	return (
		<div className="space-y-6">
			{technicalContent}
			{linkingContent}
		</div>
	);
}
