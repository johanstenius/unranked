"use client";

import type { BriefRecommendation } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { RecommendationCard } from "./recommendation-card";

type RecommendationSelectionProps = {
	recommendations: BriefRecommendation[];
	briefsRemaining: number;
	onGenerateBriefs: (keywords: string[]) => void;
	isGenerating: boolean;
};

export function RecommendationSelection({
	recommendations,
	briefsRemaining,
	onGenerateBriefs,
	isGenerating,
}: RecommendationSelectionProps) {
	// Pre-select top recommendations (up to briefsRemaining)
	const topCount = Math.min(5, briefsRemaining);
	const topRecommendations = recommendations.slice(0, topCount);
	const [selected, setSelected] = useState<Set<string>>(() => {
		return new Set(topRecommendations.map((r) => r.keyword));
	});
	const [showAll, setShowAll] = useState(false);

	// Reset selection when recommendations change
	useEffect(() => {
		const newTop = recommendations
			.slice(0, Math.min(5, briefsRemaining))
			.map((r) => r.keyword);
		setSelected(new Set(newTop));
	}, [recommendations, briefsRemaining]);

	const canSelectMore = selected.size < briefsRemaining;

	function toggleKeyword(keyword: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(keyword)) {
				next.delete(keyword);
			} else if (canSelectMore) {
				next.add(keyword);
			}
			return next;
		});
	}

	function handleGenerate() {
		if (selected.size > 0) {
			onGenerateBriefs(Array.from(selected));
		}
	}

	// Group recommendations by source for "All Topics" view
	const bySource = {
		quick_win: recommendations.filter((r) => r.source === "quick_win"),
		target: recommendations.filter((r) => r.source === "target"),
		gap: recommendations.filter((r) => r.source === "gap"),
	};

	return (
		<div className="space-y-6">
			{/* Recommended section */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="font-display text-lg font-semibold text-text-primary">
							Recommended
						</h3>
						<p className="text-sm text-text-secondary">
							Top picks based on potential impact
						</p>
					</div>
					<div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-subtle border border-border">
						<span className="text-lg font-display font-bold text-text-primary">
							{selected.size}
						</span>
						<span className="text-sm text-text-tertiary">
							/ {briefsRemaining}
						</span>
					</div>
				</div>

				<div className="space-y-2">
					{topRecommendations.map((rec) => (
						<RecommendationCard
							key={rec.id}
							rec={rec}
							selected={selected.has(rec.keyword)}
							onToggle={() => toggleKeyword(rec.keyword)}
							disabled={!canSelectMore}
						/>
					))}
				</div>

				{/* Generate button */}
				<div className="flex items-center justify-between p-4 bg-subtle rounded-xl border border-border">
					<div className="text-sm text-text-tertiary">
						{selected.size === 0
							? "Select topics to generate briefs"
							: `${selected.size} topic${selected.size !== 1 ? "s" : ""} selected`}
					</div>
					<button
						type="button"
						onClick={handleGenerate}
						disabled={selected.size === 0 || isGenerating}
						className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{isGenerating ? (
							<>
								<motion.div
									className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
									animate={{ rotate: 360 }}
									transition={{
										duration: 1,
										repeat: Number.POSITIVE_INFINITY,
										ease: "linear",
									}}
								/>
								Generating...
							</>
						) : (
							<>
								Generate {selected.size || ""} Brief
								{selected.size !== 1 ? "s" : ""}
								<span className="text-white/70">→</span>
							</>
						)}
					</button>
				</div>
			</div>

			{/* All Topics section */}
			{recommendations.length > topCount && (
				<div className="border-t border-border pt-6">
					<button
						type="button"
						onClick={() => setShowAll(!showAll)}
						className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4"
					>
						<span>{showAll ? "▼" : "▶"}</span>
						<span>All Topics ({recommendations.length - topCount} more)</span>
					</button>

					<AnimatePresence>
						{showAll && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								className="overflow-hidden space-y-6"
							>
								{/* Quick Wins */}
								{bySource.quick_win.length > 0 && (
									<div>
										<h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
											<span>⚡</span> Quick Wins
											<span className="text-text-tertiary">
												(optimize existing pages)
											</span>
										</h4>
										<div className="space-y-2">
											{bySource.quick_win.map((rec) => (
												<RecommendationCard
													key={rec.id}
													rec={rec}
													selected={selected.has(rec.keyword)}
													onToggle={() => toggleKeyword(rec.keyword)}
													disabled={!canSelectMore}
												/>
											))}
										</div>
									</div>
								)}

								{/* Target Keywords */}
								{bySource.target.length > 0 && (
									<div>
										<h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
											<span>🎯</span> Your Target Keywords
										</h4>
										<div className="space-y-2">
											{bySource.target.map((rec) => (
												<RecommendationCard
													key={rec.id}
													rec={rec}
													selected={selected.has(rec.keyword)}
													onToggle={() => toggleKeyword(rec.keyword)}
													disabled={!canSelectMore}
												/>
											))}
										</div>
									</div>
								)}

								{/* Content Gaps */}
								{bySource.gap.length > 0 && (
									<div>
										<h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
											<span>🔍</span> Content Gaps
											<span className="text-text-tertiary">
												(competitors rank, you don't)
											</span>
										</h4>
										<div className="space-y-2">
											{bySource.gap.map((rec) => (
												<RecommendationCard
													key={rec.id}
													rec={rec}
													selected={selected.has(rec.keyword)}
													onToggle={() => toggleKeyword(rec.keyword)}
													disabled={!canSelectMore}
												/>
											))}
										</div>
									</div>
								)}
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			)}
		</div>
	);
}
