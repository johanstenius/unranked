"use client";

import type {
	ActionCategory,
	ActionType,
	PrioritizedAction,
} from "@/lib/types";

type ActionItemProps = {
	action: PrioritizedAction;
	index: number;
};

const TYPE_ICONS: Record<ActionType, string> = {
	fix_technical: "⚙",
	add_internal_links: "🔗",
	optimize_existing: "✨",
	create_content: "📝",
	steal_snippet: "💎",
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
				<div className="flex-shrink-0 w-10 h-10 rounded-lg bg-bg-subtle flex items-center justify-center text-lg">
					{TYPE_ICONS[action.type]}
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
