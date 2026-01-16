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
import type { AIReadinessData, ComponentState } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
	Bot,
	Brain,
	CheckCircle2,
	FileText,
	Shield,
	ShieldAlert,
	ShieldQuestion,
	XCircle,
} from "lucide-react";

type AITabProps = {
	aiReadiness: ComponentState<AIReadinessData>;
};

const PURPOSE_LABELS: Record<string, string> = {
	training: "AI Training",
	search: "AI Search",
	live: "Live Browsing",
	indexing: "Indexing",
};

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

function ScoreCircle({
	score,
	size = "lg",
}: { score: number; size?: "sm" | "lg" }) {
	const circumference = 2 * Math.PI * 40;
	const offset = circumference - (score / 100) * circumference;

	const getScoreColor = (s: number) => {
		if (s >= 80) return "text-status-good"; // Green: 80+
		if (s >= 60) return "text-status-warn"; // Orange: 60-79
		return "text-status-crit"; // Red: <60
	};

	const dimensions = size === "lg" ? "w-28 h-28" : "w-16 h-16";
	const textSize = size === "lg" ? "text-3xl" : "text-lg";

	return (
		<div className={cn("relative", dimensions)}>
			<svg
				className="w-full h-full -rotate-90"
				viewBox="0 0 100 100"
				role="img"
				aria-label={`Score: ${score}`}
			>
				<circle
					cx="50"
					cy="50"
					r="40"
					fill="none"
					stroke="currentColor"
					strokeWidth="8"
					className="text-border"
				/>
				<circle
					cx="50"
					cy="50"
					r="40"
					fill="none"
					stroke="currentColor"
					strokeWidth="8"
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					className={cn("transition-all duration-1000", getScoreColor(score))}
				/>
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<span
					className={cn(
						"font-display font-bold tabular-nums",
						textSize,
						getScoreColor(score),
					)}
				>
					{score}
				</span>
			</div>
		</div>
	);
}

function StatusBadge({
	status,
}: { status: "allowed" | "blocked" | "not_specified" }) {
	const styles = {
		allowed: {
			bg: "bg-status-good-bg",
			text: "text-status-good",
			icon: <Shield className="w-3 h-3" />,
			label: "Allowed",
		},
		blocked: {
			bg: "bg-status-crit-bg",
			text: "text-status-crit",
			icon: <ShieldAlert className="w-3 h-3" />,
			label: "Blocked",
		},
		not_specified: {
			bg: "bg-subtle",
			text: "text-text-tertiary",
			icon: <ShieldQuestion className="w-3 h-3" />,
			label: "Unspecified",
		},
	};

	const style = styles[status];

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
				style.bg,
				style.text,
			)}
		>
			{style.icon}
			{style.label}
		</span>
	);
}

function AIReadinessSection({ data }: { data: AIReadinessData }) {
	const { robotsTxtAnalysis, llmsTxt, score } = data;

	return (
		<Card className="border-border rounded-xl">
			<CardHeader className="pb-4">
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="font-display text-xl font-bold flex items-center gap-2">
							<Brain className="w-5 h-5 text-accent" />
							AI Readiness
						</CardTitle>
						<CardDescription>
							How well your site is optimized for AI crawlers and LLMs
						</CardDescription>
					</div>
					<ScoreCircle score={score} />
				</div>
			</CardHeader>
			<CardContent className="space-y-8">
				{/* Robots.txt Analysis */}
				<div>
					<h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
						<Bot className="w-4 h-4 text-text-tertiary" />
						AI Bot Access
					</h4>
					<div className="rounded-lg border border-border overflow-hidden">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-subtle/50">
									<th className="text-left py-2.5 px-4 font-medium text-text-secondary">
										Bot
									</th>
									<th className="text-left py-2.5 px-4 font-medium text-text-secondary">
										Provider
									</th>
									<th className="text-left py-2.5 px-4 font-medium text-text-secondary">
										Purpose
									</th>
									<th className="text-left py-2.5 px-4 font-medium text-text-secondary">
										Status
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{robotsTxtAnalysis.aiBots.map((bot) => (
									<tr
										key={bot.bot}
										className="hover:bg-subtle/30 transition-colors"
									>
										<td className="py-2.5 px-4 font-mono text-text-primary">
											{bot.bot}
										</td>
										<td className="py-2.5 px-4 text-text-secondary">
											{bot.provider}
										</td>
										<td className="py-2.5 px-4 text-text-tertiary">
											{PURPOSE_LABELS[bot.purpose] || bot.purpose}
										</td>
										<td className="py-2.5 px-4">
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger>
														<StatusBadge status={bot.status} />
													</TooltipTrigger>
													{bot.rule && (
														<TooltipContent side="left" className="max-w-xs">
															<pre className="text-xs font-mono whitespace-pre-wrap">
																{bot.rule}
															</pre>
														</TooltipContent>
													)}
												</Tooltip>
											</TooltipProvider>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="flex items-center gap-6 mt-3 text-sm">
						<span className="text-text-secondary">
							<span className="font-semibold text-status-good tabular-nums">
								{robotsTxtAnalysis.summary.allowed}
							</span>{" "}
							allowed
						</span>
						<span className="text-text-secondary">
							<span className="font-semibold text-status-crit tabular-nums">
								{robotsTxtAnalysis.summary.blocked}
							</span>{" "}
							blocked
						</span>
						<span className="text-text-secondary">
							<span className="font-semibold text-text-tertiary tabular-nums">
								{robotsTxtAnalysis.summary.unspecified}
							</span>{" "}
							unspecified
						</span>
					</div>
				</div>

				{/* llms.txt Status */}
				<div>
					<h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
						<FileText className="w-4 h-4 text-text-tertiary" />
						llms.txt
					</h4>
					<div
						className={cn(
							"p-4 rounded-lg border",
							llmsTxt.exists
								? "bg-status-good-bg/50 border-status-good/30"
								: "bg-subtle border-border",
						)}
					>
						<div className="flex items-center gap-3">
							{llmsTxt.exists ? (
								<>
									<CheckCircle2 className="w-5 h-5 text-status-good" />
									<div>
										<p className="font-medium text-text-primary">
											llms.txt found
										</p>
										<p className="text-sm text-text-secondary">
											{llmsTxt.url && (
												<a
													href={llmsTxt.url}
													target="_blank"
													rel="noopener noreferrer"
													className="hover:underline"
												>
													{llmsTxt.url}
												</a>
											)}
										</p>
									</div>
								</>
							) : (
								<>
									<XCircle className="w-5 h-5 text-text-tertiary" />
									<div>
										<p className="font-medium text-text-primary">No llms.txt</p>
										<p className="text-sm text-text-secondary">
											Consider adding llms.txt to provide context to LLMs about
											your site
										</p>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export function AITab({ aiReadiness }: AITabProps) {
	if (aiReadiness.status === "pending" || aiReadiness.status === "running") {
		return (
			<LoadingCard
				title="AI Readiness"
				description="Analyzing AI bot access and content structure..."
			/>
		);
	}
	if (aiReadiness.status === "failed") {
		return <ErrorCard title="AI Readiness" error={aiReadiness.error} />;
	}
	return <AIReadinessSection data={aiReadiness.data} />;
}
