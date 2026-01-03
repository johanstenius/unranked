"use client";

import { BREAKDOWN_LABELS, GRADE_CONFIG } from "@/lib/config";
import type { HealthScore, HealthScoreBreakdown } from "@/lib/types";
import { getBarColor } from "@/lib/utils";

type HealthScoreCardProps = {
	healthScore: HealthScore;
	expanded: boolean;
	onToggle: () => void;
	isFreeTier?: boolean;
};

const FREE_TIER_KEYS: (keyof HealthScoreBreakdown)[] = [
	"technicalHealth",
	"internalLinking",
];

export function HealthScoreCard({
	healthScore,
	expanded,
	onToggle,
	isFreeTier = false,
}: HealthScoreCardProps) {
	const grade = GRADE_CONFIG[healthScore.grade];

	const breakdownEntries = (
		Object.entries(healthScore.breakdown) as [
			keyof HealthScoreBreakdown,
			HealthScoreBreakdown[keyof HealthScoreBreakdown],
		][]
	).filter(([key]) => !isFreeTier || FREE_TIER_KEYS.includes(key));

	const factorCount = isFreeTier ? 2 : 6;

	return (
		<div className="bg-surface border border-border rounded-xl p-8 mb-8">
			<div className="flex items-center gap-10">
				<div className="relative w-32 h-32 flex-shrink-0">
					{/* Glow effect */}
					<div
						className={`absolute inset-2 rounded-full blur-xl opacity-20 ${grade.barColor}`}
					/>
					<svg
						className="w-full h-full -rotate-90 relative"
						viewBox="0 0 100 100"
						aria-hidden="true"
					>
						<circle
							cx="50"
							cy="50"
							r="42"
							fill="none"
							stroke="currentColor"
							strokeWidth="6"
							className="text-border"
						/>
						<circle
							cx="50"
							cy="50"
							r="42"
							fill="none"
							stroke="currentColor"
							strokeWidth="6"
							strokeLinecap="round"
							strokeDasharray={`${healthScore.score * 2.64} 264`}
							className={grade.color}
						/>
					</svg>
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<span
							className={`font-display text-4xl tracking-tight font-bold ${grade.color}`}
						>
							{healthScore.score}
						</span>
						<span className="text-xs text-text-tertiary mt-0.5">/ 100</span>
					</div>
				</div>

				<div className="flex-1">
					<div className="flex items-center gap-3 mb-2">
						<h3 className="font-display text-xl text-text-primary font-bold">
							SEO Health Score
						</h3>
						<span
							className={`px-3 py-1 text-xs font-medium rounded-full ${grade.bgColor} ${grade.color}`}
						>
							{grade.label}
						</span>
					</div>
					<p className="text-text-secondary mb-4">
						Based on {factorCount} key factors affecting your SEO performance
					</p>
					<button
						type="button"
						onClick={onToggle}
						className="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
					>
						{expanded ? "Hide" : "Show"} breakdown
						<span
							className={`transition-transform text-xs ${expanded ? "rotate-180" : ""}`}
						>
							↓
						</span>
					</button>
				</div>
			</div>

			{expanded && (
				<div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-x-8 gap-y-4">
					{breakdownEntries.map(([key, component]) => {
						const percentage = (component.score / component.max) * 100;
						const barColor = getBarColor(percentage);

						return (
							<div key={key}>
								<div className="flex justify-between text-sm mb-1.5">
									<span className="text-text-primary font-medium">
										{BREAKDOWN_LABELS[key]}
									</span>
									<span className="text-text-secondary tabular-nums">
										{component.score}/{component.max}
									</span>
								</div>
								<div className="h-2 bg-border/50 rounded-full overflow-hidden">
									<div
										className={`h-full ${barColor} rounded-full transition-all duration-500`}
										style={{ width: `${percentage}%` }}
									/>
								</div>
								<p className="text-xs text-text-tertiary mt-1">
									{component.detail}
								</p>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
