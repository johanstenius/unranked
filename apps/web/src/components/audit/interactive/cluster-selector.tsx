"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import { DecisionCard, SelectionCounter, SelectionItem } from "./decision-card";

export type KeywordCluster = {
	id: string;
	name: string;
	keywords: string[];
	totalVolume: number;
	avgDifficulty: number;
	opportunity: "high" | "medium" | "low";
};

type ClusterSelectorProps = {
	clusters: KeywordCluster[];
	maxSelections: number;
	tierName: string;
	onContinue: (selected: string[]) => void;
	onSkip?: () => void;
	isLoading?: boolean;
};

function formatVolume(vol: number): string {
	if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
	return vol.toString();
}

function OpportunityBadge({ level }: { level: "high" | "medium" | "low" }) {
	const config = {
		high: {
			bg: "bg-emerald-500/10",
			border: "border-emerald-500/30",
			text: "text-emerald-400",
			label: "High",
		},
		medium: {
			bg: "bg-amber-500/10",
			border: "border-amber-500/30",
			text: "text-amber-400",
			label: "Med",
		},
		low: {
			bg: "bg-zinc-500/10",
			border: "border-zinc-500/30",
			text: "text-zinc-400",
			label: "Low",
		},
	};

	const c = config[level];

	return (
		<span
			className={cn(
				"px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border",
				c.bg,
				c.border,
				c.text,
			)}
		>
			{c.label}
		</span>
	);
}

export function ClusterSelector({
	clusters,
	maxSelections,
	tierName,
	onContinue,
	onSkip,
	isLoading,
}: ClusterSelectorProps) {
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const canSelectMore = selected.size < maxSelections;

	function toggleSelection(clusterId: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(clusterId)) {
				next.delete(clusterId);
			} else if (canSelectMore) {
				next.add(clusterId);
			}
			return next;
		});
	}

	// Sort by opportunity (high first), then by volume
	const sortedClusters = [...clusters].sort((a, b) => {
		const opp = { high: 0, medium: 1, low: 2 };
		if (opp[a.opportunity] !== opp[b.opportunity]) {
			return opp[a.opportunity] - opp[b.opportunity];
		}
		return b.totalVolume - a.totalVolume;
	});

	return (
		<DecisionCard
			title="Select Topics for Content Briefs"
			subtitle="Choose keyword clusters to generate AI content briefs"
			icon={
				<svg
					className="w-5 h-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			}
			footer={
				<div className="flex items-center justify-between">
					<SelectionCounter
						selected={selected.size}
						max={maxSelections}
						label={`briefs (${tierName})`}
					/>
					<div className="flex gap-2">
						{onSkip && (
							<Button
								variant="ghost"
								size="sm"
								onClick={onSkip}
								className="text-zinc-500 hover:text-zinc-300"
							>
								Skip
							</Button>
						)}
						<Button
							onClick={() => onContinue(Array.from(selected))}
							disabled={selected.size === 0 || isLoading}
							className={cn(
								"bg-cyan-500 hover:bg-cyan-400 text-zinc-900 font-medium",
								"shadow-lg shadow-cyan-500/20",
								"transition-all duration-200",
								"disabled:opacity-50 disabled:cursor-not-allowed",
							)}
						>
							{isLoading ? (
								<span className="flex items-center gap-2">
									<motion.span
										className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full"
										animate={{ rotate: 360 }}
										transition={{
											duration: 1,
											repeat: Number.POSITIVE_INFINITY,
											ease: "linear",
										}}
									/>
									Generating...
								</span>
							) : (
								"Generate Briefs"
							)}
						</Button>
					</div>
				</div>
			}
		>
			<div className="space-y-2">
				{sortedClusters.length === 0 ? (
					<div className="text-center py-8">
						<div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
							<svg
								className="w-6 h-6 text-zinc-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
								/>
							</svg>
						</div>
						<p className="text-zinc-500 text-sm">No keyword clusters found</p>
						<p className="text-zinc-600 text-xs mt-1">
							Try adding more competitors or seed keywords
						</p>
					</div>
				) : (
					sortedClusters.map((cluster, index) => (
						<motion.div
							key={cluster.id}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: index * 0.05 }}
						>
							<SelectionItem
								selected={selected.has(cluster.id)}
								onToggle={() => toggleSelection(cluster.id)}
								disabled={!canSelectMore && !selected.has(cluster.id)}
								badge={<OpportunityBadge level={cluster.opportunity} />}
							>
								<div className="flex items-center gap-3 flex-1 min-w-0">
									{/* Cluster icon */}
									<div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
										<svg
											className="w-4 h-4 text-cyan-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											aria-hidden="true"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
											/>
										</svg>
									</div>

									{/* Content */}
									<div className="flex-1 min-w-0">
										<div className="font-medium text-white truncate">
											{cluster.name}
										</div>
										<div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
											<span className="font-mono">
												{cluster.keywords.length} keywords
											</span>
											<span className="w-1 h-1 rounded-full bg-zinc-700" />
											<span className="font-mono">
												{formatVolume(cluster.totalVolume)} vol
											</span>
											<span className="w-1 h-1 rounded-full bg-zinc-700" />
											<span className="font-mono">
												{cluster.avgDifficulty}% diff
											</span>
										</div>
									</div>
								</div>
							</SelectionItem>
						</motion.div>
					))
				)}
			</div>

			{/* Tip */}
			{clusters.length > 0 && (
				<div className="mt-4 px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
					<p className="text-xs text-zinc-400">
						<span className="text-cyan-400 font-medium">Tip:</span> Select
						high-opportunity clusters with reasonable difficulty (&lt;50%) for
						best results.
					</p>
				</div>
			)}
		</DecisionCard>
	);
}
