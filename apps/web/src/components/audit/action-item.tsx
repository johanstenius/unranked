"use client";

import type {
	ActionCategory,
	ActionType,
	PrioritizedAction,
} from "@/lib/types";
import type { ReactNode } from "react";

type ActionItemProps = {
	action: PrioritizedAction;
	index: number;
};

function IconTechnical() {
	return (
		<svg
			className="w-5 h-5 text-text-secondary"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
			/>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
			/>
		</svg>
	);
}

function IconLink() {
	return (
		<svg
			className="w-5 h-5 text-text-secondary"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
			/>
		</svg>
	);
}

function IconOptimize() {
	return (
		<svg
			className="w-5 h-5 text-text-secondary"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
			/>
		</svg>
	);
}

function IconContent() {
	return (
		<svg
			className="w-5 h-5 text-text-secondary"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
			/>
		</svg>
	);
}

function IconSnippet() {
	return (
		<svg
			className="w-5 h-5 text-text-secondary"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
			/>
		</svg>
	);
}

const TYPE_ICONS: Record<ActionType, () => ReactNode> = {
	fix_technical: IconTechnical,
	add_internal_links: IconLink,
	optimize_existing: IconOptimize,
	create_content: IconContent,
	steal_snippet: IconSnippet,
};

const TYPE_LABELS: Record<ActionType, string> = {
	fix_technical: "Technical Fix",
	add_internal_links: "Internal Links",
	optimize_existing: "Optimize",
	create_content: "New Content",
	steal_snippet: "Capture Snippet",
};

const CATEGORY_STYLES: Record<ActionCategory, { bg: string; text: string }> = {
	technical: { bg: "bg-[#f0f4f8]", text: "text-[#475569]" },
	content: { bg: "bg-[#fef3c7]", text: "text-[#92400e]" },
	linking: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]" },
	optimization: { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]" },
};

const EFFORT_STYLES: Record<
	"low" | "medium" | "high",
	{ bg: string; text: string; label: string }
> = {
	low: {
		bg: "bg-status-good-bg",
		text: "text-status-good",
		label: "Quick win",
	},
	medium: {
		bg: "bg-status-warn-bg",
		text: "text-status-warn",
		label: "Medium effort",
	},
	high: {
		bg: "bg-status-crit-bg",
		text: "text-status-crit",
		label: "High effort",
	},
};

function getPriorityColor(priority: number): string {
	if (priority >= 70) return "bg-status-good";
	if (priority >= 40) return "bg-status-warn";
	return "bg-status-crit";
}

function getPriorityGradient(priority: number): string {
	if (priority >= 70) return "from-emerald-400 to-emerald-600";
	if (priority >= 40) return "from-amber-400 to-amber-600";
	return "from-rose-400 to-rose-600";
}

export function ActionItem({ action, index }: ActionItemProps) {
	const categoryStyle = CATEGORY_STYLES[action.category];
	const effortStyle = EFFORT_STYLES[action.effort];
	const priorityGradient = getPriorityGradient(action.priority);

	const hasImpact =
		action.estimatedImpact.searchVolume || action.estimatedImpact.trafficGain;

	return (
		<div
			className="group relative border border-border rounded-lg p-4 hover:border-border-active transition-all duration-200 animate-slide-up bg-bg-surface"
			style={{ animationDelay: `${index * 50}ms` }}
		>
			{/* Priority indicator line */}
			<div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg overflow-hidden">
				<div
					className={`h-full bg-gradient-to-b ${priorityGradient}`}
					style={{ opacity: action.priority / 100 }}
				/>
			</div>

			<div className="flex items-start gap-4 pl-2">
				{/* Type icon */}
				<div className="flex-shrink-0 w-10 h-10 rounded-lg bg-bg-subtle flex items-center justify-center">
					{TYPE_ICONS[action.type]()}
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap mb-1">
						<h4 className="font-display font-semibold text-text-primary truncate">
							{action.title}
						</h4>
						<span
							className={`px-2 py-0.5 text-[10px] font-medium rounded-full uppercase tracking-wider ${categoryStyle.bg} ${categoryStyle.text}`}
						>
							{action.category}
						</span>
					</div>

					<p className="text-sm text-text-secondary line-clamp-2 mb-3">
						{action.description}
					</p>

					{/* Meta row */}
					<div className="flex items-center gap-3 flex-wrap">
						{/* Priority score */}
						<div className="flex items-center gap-2">
							<div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
								<div
									className={`h-full bg-gradient-to-r ${priorityGradient} transition-all duration-500`}
									style={{ width: `${action.priority}%` }}
								/>
							</div>
							<span className="text-xs font-mono text-text-tertiary tabular-nums">
								{action.priority}
							</span>
						</div>

						{/* Effort badge */}
						<span
							className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${effortStyle.bg} ${effortStyle.text}`}
						>
							{effortStyle.label}
						</span>

						{/* Impact estimate */}
						{hasImpact && (
							<span className="text-xs text-text-tertiary">
								{action.estimatedImpact.searchVolume && (
									<>
										<span className="font-medium text-text-secondary">
											{action.estimatedImpact.searchVolume.toLocaleString()}
										</span>{" "}
										searches/mo
									</>
								)}
								{action.estimatedImpact.trafficGain && (
									<>
										{action.estimatedImpact.searchVolume && " · "}
										<span className="font-medium text-status-good">
											+{action.estimatedImpact.trafficGain.toLocaleString()}
										</span>{" "}
										visits
									</>
								)}
							</span>
						)}

						{/* URL if present */}
						{action.url && (
							<a
								href={action.url}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-accent-teal hover:underline truncate max-w-[200px]"
							>
								{new URL(action.url).pathname}
							</a>
						)}
					</div>
				</div>

				{/* Rank number */}
				<div className="flex-shrink-0 w-7 h-7 rounded-full bg-bg-subtle flex items-center justify-center">
					<span className="text-xs font-mono font-medium text-text-tertiary">
						{index + 1}
					</span>
				</div>
			</div>
		</div>
	);
}
