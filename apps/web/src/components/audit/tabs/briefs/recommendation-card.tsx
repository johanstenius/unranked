"use client";

import type {
	BriefRecommendation,
	BriefRecommendationSource,
} from "@/lib/types";
import { motion } from "framer-motion";

export const SOURCE_CONFIG: Record<
	BriefRecommendationSource,
	{ icon: string; label: string; color: string }
> = {
	quick_win: {
		icon: "⚡",
		label: "Quick Win",
		color:
			"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
	},
	target: {
		icon: "🎯",
		label: "Your Target",
		color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
	},
	gap: {
		icon: "🔍",
		label: "Content Gap",
		color:
			"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
	},
};

export function formatVolume(volume: number): string {
	if (volume >= 1000) {
		return `${(volume / 1000).toFixed(1)}k`;
	}
	return volume.toString();
}

type RecommendationCardProps = {
	rec: BriefRecommendation;
	selected: boolean;
	onToggle: () => void;
	disabled: boolean;
};

export function RecommendationCard({
	rec,
	selected,
	onToggle,
	disabled,
}: RecommendationCardProps) {
	const config = SOURCE_CONFIG[rec.source];

	return (
		<motion.button
			type="button"
			onClick={onToggle}
			disabled={disabled && !selected}
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className={`
				w-full p-4 rounded-xl border-2 text-left transition-all
				${
					selected
						? "border-accent bg-accent/5"
						: disabled
							? "border-border/50 bg-subtle/50 opacity-50 cursor-not-allowed"
							: "border-border hover:border-accent/50 hover:bg-subtle/50"
				}
			`}
		>
			<div className="flex items-start gap-3">
				<div
					className={`
						w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
						${selected ? "border-accent bg-accent" : "border-border"}
					`}
				>
					{selected && (
						<motion.svg
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							className="w-3 h-3 text-white"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
							strokeLinecap="round"
							aria-hidden="true"
						>
							<path d="M5 13l4 4L19 7" />
						</motion.svg>
					)}
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<span className="font-medium text-text-primary">{rec.keyword}</span>
						<span className={`text-xs px-1.5 py-0.5 rounded ${config.color}`}>
							{config.icon} {config.label}
						</span>
					</div>
					<div className="flex items-center gap-3 text-sm text-text-secondary">
						{rec.searchVolume && (
							<span>{formatVolume(rec.searchVolume)} monthly searches</span>
						)}
						{rec.currentPosition && (
							<span>Position #{rec.currentPosition}</span>
						)}
						{!rec.searchVolume && !rec.currentPosition && (
							<span className="text-text-tertiary">{rec.reason}</span>
						)}
					</div>
				</div>
			</div>
		</motion.button>
	);
}
