"use client";

import type { PrioritizedAction } from "@/lib/types";
import { useState } from "react";
import { ActionItem } from "./action-item";

type ActionPlanCardProps = {
	actions: PrioritizedAction[];
	isFreeTier?: boolean;
};

const INITIAL_VISIBLE = 5;

export function ActionPlanCard({
	actions,
	isFreeTier = false,
}: ActionPlanCardProps) {
	const [expanded, setExpanded] = useState(false);

	if (!actions || actions.length === 0) {
		return null;
	}

	const visibleActions = expanded ? actions : actions.slice(0, INITIAL_VISIBLE);
	const hasMore = actions.length > INITIAL_VISIBLE;

	// Calculate aggregate stats
	const totalSearchVolume = actions.reduce(
		(sum, a) => sum + (a.estimatedImpact.searchVolume ?? 0),
		0,
	);
	const highPriorityCount = actions.filter((a) => a.priority >= 70).length;
	const quickWinCount = actions.filter((a) => a.effort === "low").length;

	return (
		<div className="bg-surface border border-border rounded-xl overflow-hidden mb-8 animate-fade-in">
			{/* Header */}
			<div className="bg-gradient-to-r from-accent/5 to-transparent p-6 border-b border-border">
				<div className="flex items-start justify-between">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<h3 className="font-display text-xl text-text-primary font-bold">
								Action Plan
							</h3>
							<span className="px-2.5 py-1 text-xs font-medium rounded-full bg-accent text-bg-canvas">
								{actions.length} {actions.length === 1 ? "action" : "actions"}
							</span>
						</div>
						<p className="text-text-secondary text-sm">
							Prioritized recommendations based on impact, effort, and current
							performance
						</p>
					</div>

					{/* Quick stats */}
					{!isFreeTier && (
						<div className="hidden sm:flex items-center gap-6 text-sm">
							{highPriorityCount > 0 && (
								<div className="text-center">
									<div className="font-display font-bold text-status-good text-lg">
										{highPriorityCount}
									</div>
									<div className="text-text-tertiary text-xs">
										High priority
									</div>
								</div>
							)}
							{quickWinCount > 0 && (
								<div className="text-center">
									<div className="font-display font-bold text-accent-teal text-lg">
										{quickWinCount}
									</div>
									<div className="text-text-tertiary text-xs">Quick wins</div>
								</div>
							)}
							{totalSearchVolume > 0 && (
								<div className="text-center">
									<div className="font-display font-bold text-text-primary text-lg">
										{totalSearchVolume >= 1000
											? `${(totalSearchVolume / 1000).toFixed(1)}k`
											: totalSearchVolume}
									</div>
									<div className="text-text-tertiary text-xs">
										Monthly searches
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				{isFreeTier && (
					<div className="mt-4 p-3 rounded-lg bg-status-warn-bg border border-status-warn/20">
						<p className="text-sm text-status-warn">
							<span className="font-medium">Free tier:</span> Showing technical
							fixes only. Upgrade to see content and optimization opportunities.
						</p>
					</div>
				)}
			</div>

			{/* Action list */}
			<div className="p-4 space-y-3">
				{visibleActions.map((action, index) => (
					<ActionItem key={action.id} action={action} index={index} />
				))}
			</div>

			{/* Expand/collapse footer */}
			{hasMore && (
				<div className="px-6 py-4 border-t border-border bg-bg-subtle/50">
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="w-full flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
					>
						{expanded ? (
							<>
								Show less
								<span className="text-xs transition-transform rotate-180">
									↓
								</span>
							</>
						) : (
							<>
								View all {actions.length} actions
								<span className="text-xs">↓</span>
							</>
						)}
					</button>
				</div>
			)}
		</div>
	);
}
