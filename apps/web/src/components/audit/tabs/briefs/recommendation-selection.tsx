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
			{/* Action required banner */}
			<div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-accent-teal/10 to-accent-indigo/10 border border-accent-teal/20">
				<div className="relative flex-shrink-0">
					<div className="w-10 h-10 rounded-full bg-accent-teal/20 flex items-center justify-center">
						<svg
							className="w-5 h-5 text-accent-teal"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={2}
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
							/>
						</svg>
					</div>
					<span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-accent-teal rounded-full animate-pulse-soft" />
				</div>
				<div className="flex-1">
					<p className="font-display font-semibold text-text-primary text-sm">
						Select topics to generate AI content briefs
					</p>
					<p className="text-xs text-text-secondary">
						{briefsRemaining} brief{briefsRemaining !== 1 ? "s" : ""} available
						with your plan
					</p>
				</div>
			</div>

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
											<svg
												className="w-4 h-4 text-status-warn"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={2}
												stroke="currentColor"
												aria-hidden="true"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
												/>
											</svg>
											Quick Wins
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
											<svg
												className="w-4 h-4 text-accent-indigo"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={2}
												stroke="currentColor"
												aria-hidden="true"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
												/>
											</svg>
											Your Target Keywords
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
											<svg
												className="w-4 h-4 text-accent-teal"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={2}
												stroke="currentColor"
												aria-hidden="true"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
												/>
											</svg>
											Content Gaps
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
