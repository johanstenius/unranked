"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRuleInfo } from "@/lib/rule-catalog";
import type { Analysis, TechnicalIssue } from "@/lib/types";
import { cn, stripOrigin } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, ChevronRight, Info } from "lucide-react";
import { useState } from "react";

type TechnicalTabProps = {
	analysis: Analysis;
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
		<div className="flex items-center gap-6">
			{counts.high > 0 && (
				<div className="flex items-center gap-2">
					<div className="w-2.5 h-2.5 rounded-full bg-status-crit" />
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
					<div className="w-2.5 h-2.5 rounded-full bg-status-warn" />
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
					<div className="w-2.5 h-2.5 rounded-full bg-text-tertiary" />
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
			border: "border-l-status-crit",
			bg: "bg-status-crit-bg",
			text: "text-status-crit",
			icon: <AlertTriangle className="w-4 h-4" />,
		},
		medium: {
			border: "border-l-status-warn",
			bg: "bg-status-warn-bg",
			text: "text-status-warn",
			icon: <AlertTriangle className="w-4 h-4" />,
		},
		low: {
			border: "border-l-text-tertiary",
			bg: "bg-subtle",
			text: "text-text-tertiary",
			icon: <Info className="w-4 h-4" />,
		},
	};

	const style = severityStyles[group.severity];

	return (
		<div
			className={cn(
				"rounded-lg border border-border/60 overflow-hidden transition-all",
				style.border,
				"border-l-[3px]",
			)}
		>
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center gap-4 p-4 text-left hover:bg-subtle/50 transition-colors"
			>
				<div className={cn("shrink-0", style.text)}>{style.icon}</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="font-medium text-text-primary">{group.rule}</span>
						{ruleInfo && (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
										<Info className="h-3.5 w-3.5 text-text-tertiary cursor-help shrink-0" />
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
						"w-4 h-4 text-text-tertiary transition-transform shrink-0",
						expanded && "rotate-90",
					)}
				/>
			</button>

			{expanded && (
				<div className="px-4 pb-4 pt-0">
					<div className="pl-8 space-y-1 border-t border-border/40 pt-3">
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

export function TechnicalTab({ analysis }: TechnicalTabProps) {
	const groupedIssues = groupIssuesByRule(analysis.technicalIssues);
	const severityCounts = countBySeverity(groupedIssues);

	return (
		<div className="space-y-6">
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
						<div className="space-y-4">
							<SeveritySummary counts={severityCounts} />
							<div className="space-y-3">
								{groupedIssues.map((group) => (
									<IssueCard key={group.rule} group={group} />
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

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
					{analysis.internalLinkingIssues.orphanPages.length === 0 &&
					analysis.internalLinkingIssues.underlinkedPages.length === 0 ? (
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
						<div className="space-y-4">
							{analysis.internalLinkingIssues.orphanPages.length > 0 && (
								<div className="rounded-lg border border-border/60 border-l-[3px] border-l-status-crit overflow-hidden">
									<div className="p-4">
										<div className="flex items-center gap-3 mb-3">
											<AlertTriangle className="w-4 h-4 text-status-crit shrink-0" />
											<div>
												<span className="font-medium text-text-primary">
													Orphan Pages
												</span>
												<span className="text-sm text-text-tertiary ml-2">
													No incoming links
												</span>
											</div>
										</div>
										<div className="pl-7 space-y-1">
											{analysis.internalLinkingIssues.orphanPages.map((url) => (
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
							)}

							{analysis.internalLinkingIssues.underlinkedPages.length > 0 && (
								<div className="rounded-lg border border-border/60 border-l-[3px] border-l-status-warn overflow-hidden">
									<div className="p-4">
										<div className="flex items-center gap-3 mb-3">
											<AlertTriangle className="w-4 h-4 text-status-warn shrink-0" />
											<div>
												<span className="font-medium text-text-primary">
													Underlinked Pages
												</span>
												<span className="text-sm text-text-tertiary ml-2">
													Need more internal links
												</span>
											</div>
										</div>
										<div className="pl-7 space-y-1">
											{analysis.internalLinkingIssues.underlinkedPages.map(
												(p) => (
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
												),
											)}
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="border-border rounded-xl">
				<CardHeader className="pb-4">
					<CardTitle className="font-display text-xl font-bold">
						Keyword Cannibalization
					</CardTitle>
					<CardDescription>
						Multiple pages competing for the same keyword
					</CardDescription>
				</CardHeader>
				<CardContent>
					{analysis.cannibalizationIssues.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="w-12 h-12 rounded-full bg-status-good-bg flex items-center justify-center mb-4">
								<CheckCircle2 className="w-6 h-6 text-status-good" />
							</div>
							<p className="font-medium text-text-primary mb-1">No conflicts</p>
							<p className="text-sm text-text-secondary">
								No keyword cannibalization detected
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{analysis.cannibalizationIssues.map((issue) => (
								<div
									key={issue.keyword}
									className={cn(
										"rounded-lg border border-border/60 border-l-[3px] overflow-hidden",
										issue.severity === "high"
											? "border-l-status-crit"
											: "border-l-status-warn",
									)}
								>
									<div className="p-4">
										<div className="flex items-center justify-between mb-3">
											<div className="flex items-center gap-3">
												<AlertTriangle
													className={cn(
														"w-4 h-4 shrink-0",
														issue.severity === "high"
															? "text-status-crit"
															: "text-status-warn",
													)}
												/>
												<span className="font-medium text-text-primary">
													&ldquo;{issue.keyword}&rdquo;
												</span>
												<span className="text-sm text-text-tertiary">
													{issue.searchVolume.toLocaleString()} monthly searches
												</span>
											</div>
										</div>
										<div className="pl-7 space-y-2">
											{issue.pages.map((page) => (
												<div
													key={page.url}
													className="flex items-center justify-between text-sm"
												>
													<span className="text-text-secondary truncate font-mono max-w-[280px]">
														{stripOrigin(page.url)}
													</span>
													<div className="flex items-center gap-4 shrink-0 ml-4">
														<span className="text-text-tertiary tabular-nums">
															{page.position
																? `#${page.position}`
																: "Not ranking"}
														</span>
														<span className="text-2xs text-text-tertiary bg-subtle px-1.5 py-0.5 rounded">
															{page.signals.join(", ")}
														</span>
													</div>
												</div>
											))}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
