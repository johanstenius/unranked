"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRuleInfo } from "@/lib/rule-catalog";
import type { Analysis } from "@/lib/types";
import { stripOrigin } from "@/lib/utils";
import { Info } from "lucide-react";

type TechnicalTabProps = {
	analysis: Analysis;
};

export function TechnicalTab({ analysis }: TechnicalTabProps) {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="font-display text-lg">
						Technical Issues
					</CardTitle>
					<CardDescription>SEO problems to fix</CardDescription>
				</CardHeader>
				<CardContent>
					{analysis.technicalIssues.length === 0 ? (
						<p className="text-muted-foreground">No technical issues found</p>
					) : (
						<TooltipProvider>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Page</TableHead>
										<TableHead>Issue</TableHead>
										<TableHead>Severity</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{analysis.technicalIssues.map((issue) => {
										const ruleInfo = getRuleInfo(issue.issue);
										return (
											<TableRow key={`${issue.url}-${issue.issue}`}>
												<TableCell className="text-muted-foreground text-xs truncate max-w-[200px]">
													{stripOrigin(issue.url)}
												</TableCell>
												<TableCell>
													<span className="inline-flex items-center gap-1.5">
														{issue.issue}
														{ruleInfo && (
															<Tooltip>
																<TooltipTrigger asChild>
																	<Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help shrink-0" />
																</TooltipTrigger>
																<TooltipContent
																	side="top"
																	className="max-w-[280px]"
																>
																	<p className="text-sm">
																		{ruleInfo.description}
																	</p>
																	{ruleInfo.source && (
																		<a
																			href={ruleInfo.source.url}
																			target="_blank"
																			rel="noopener noreferrer"
																			className="text-xs text-primary hover:underline mt-1.5 block"
																		>
																			Source: {ruleInfo.source.label} ↗
																		</a>
																	)}
																</TooltipContent>
															</Tooltip>
														)}
													</span>
												</TableCell>
												<TableCell>
													<span
														className={
															issue.severity === "high"
																? "text-status-crit"
																: issue.severity === "medium"
																	? "text-status-warn"
																	: "text-muted-foreground"
														}
													>
														{issue.severity}
													</span>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TooltipProvider>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="font-display text-lg">
						Internal Linking Issues
					</CardTitle>
					<CardDescription>
						Pages that need better internal links
					</CardDescription>
				</CardHeader>
				<CardContent>
					{analysis.internalLinkingIssues.orphanPages.length > 0 && (
						<div className="mb-4">
							<h3 className="text-sm font-medium text-status-crit mb-2">
								Orphan Pages (no incoming links)
							</h3>
							<ul className="text-sm text-muted-foreground space-y-1">
								{analysis.internalLinkingIssues.orphanPages.map((url) => (
									<li key={url} className="truncate max-w-[400px]">
										{stripOrigin(url)}
									</li>
								))}
							</ul>
						</div>
					)}
					{analysis.internalLinkingIssues.underlinkedPages.length > 0 && (
						<div>
							<h3 className="text-sm font-medium text-status-warn mb-2">
								Underlinked Pages
							</h3>
							<ul className="text-sm text-muted-foreground space-y-1">
								{analysis.internalLinkingIssues.underlinkedPages.map((p) => (
									<li key={p.url} className="flex justify-between">
										<span className="truncate max-w-[300px]">
											{stripOrigin(p.url)}
										</span>
										<span className="text-muted-foreground">
											{p.incomingLinks} links
										</span>
									</li>
								))}
							</ul>
						</div>
					)}
					{analysis.internalLinkingIssues.orphanPages.length === 0 &&
						analysis.internalLinkingIssues.underlinkedPages.length === 0 && (
							<p className="text-muted-foreground">
								No internal linking issues found
							</p>
						)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="font-display text-lg">
						Keyword Cannibalization
					</CardTitle>
					<CardDescription>
						Multiple pages competing for the same keyword
					</CardDescription>
				</CardHeader>
				<CardContent>
					{analysis.cannibalizationIssues.length === 0 ? (
						<p className="text-muted-foreground">
							No cannibalization issues found
						</p>
					) : (
						<div className="space-y-4">
							{analysis.cannibalizationIssues.map((issue) => (
								<div
									key={issue.keyword}
									className="border-b border-border pb-4 last:border-b-0"
								>
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center gap-2">
											<span className="font-medium">
												&ldquo;{issue.keyword}&rdquo;
											</span>
											<span className="text-sm text-muted-foreground">
												{issue.searchVolume.toLocaleString()} vol
											</span>
										</div>
										<span
											className={
												issue.severity === "high"
													? "text-status-crit font-medium text-sm"
													: "text-status-warn font-medium text-sm"
											}
										>
											{issue.severity.toUpperCase()}
										</span>
									</div>
									<div className="space-y-1">
										{issue.pages.map((page) => (
											<div
												key={page.url}
												className="flex items-center justify-between text-sm"
											>
												<span className="text-muted-foreground truncate max-w-[300px]">
													{stripOrigin(page.url)}
												</span>
												<div className="flex items-center gap-3">
													<span className="text-muted-foreground">
														{page.position
															? `#${page.position}`
															: "Not ranking"}
													</span>
													<span className="text-muted-foreground text-xs">
														({page.signals.join(", ")})
													</span>
												</div>
											</div>
										))}
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
