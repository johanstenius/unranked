"use client";

import { selectClusters } from "@/lib/api";
import type { ClusterSuggestion } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

type ClusterSelectionCardProps = {
	clusters: ClusterSuggestion[];
	maxSelections: number;
	accessToken: string;
	onComplete?: () => void;
};

function AnalyzingState() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-surface border border-border rounded-xl p-8 mb-8"
		>
			<div className="flex items-center gap-6">
				<div className="relative w-16 h-16 flex-shrink-0">
					<motion.div
						className="absolute inset-0 rounded-full bg-accent/10"
						animate={{ scale: [1, 1.1, 1] }}
						transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
					/>
					<div className="absolute inset-0 flex items-center justify-center">
						<motion.div
							className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent"
							animate={{ rotate: 360 }}
							transition={{
								duration: 1,
								repeat: Number.POSITIVE_INFINITY,
								ease: "linear",
							}}
						/>
					</div>
				</div>
				<div>
					<h3 className="font-display text-lg font-semibold text-text-primary mb-1">
						Analyzing keywords...
					</h3>
					<p className="text-text-secondary text-sm">
						Fetching competitor keywords and clustering them by topic
					</p>
				</div>
			</div>
		</motion.div>
	);
}

function formatVolume(volume: number): string {
	if (volume >= 1000) {
		return `${(volume / 1000).toFixed(1)}k`;
	}
	return volume.toString();
}

function ClusterCheckbox({
	cluster,
	selected,
	disabled,
	onToggle,
}: {
	cluster: ClusterSuggestion;
	selected: boolean;
	disabled: boolean;
	onToggle: () => void;
}) {
	const [expanded, setExpanded] = useState(false);

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className={`
				rounded-xl border-2 transition-all overflow-hidden
				${
					selected
						? "border-accent bg-accent/5"
						: disabled
							? "border-border/50 bg-subtle/50 opacity-50"
							: "border-border hover:border-accent/50 hover:bg-subtle/50"
				}
			`}
		>
			<button
				type="button"
				onClick={onToggle}
				disabled={disabled && !selected}
				className="w-full p-4 text-left"
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
							<span className="font-medium text-text-primary">
								{cluster.name}
							</span>
							<span className="text-xs px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
								{cluster.keywords.length} keywords
							</span>
						</div>
						<div className="flex items-center gap-4 text-sm text-text-secondary">
							<span className="flex items-center gap-1">
								<svg
									className="w-4 h-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									aria-hidden="true"
								>
									<path d="M3 3v18h18" />
									<path d="M18 17V9" />
									<path d="M13 17V5" />
									<path d="M8 17v-3" />
								</svg>
								{formatVolume(cluster.totalVolume)} monthly searches
							</span>
						</div>
					</div>
				</div>
			</button>

			{/* Expandable keywords list */}
			<div className="px-4 pb-2">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setExpanded(!expanded);
					}}
					className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
				>
					{expanded ? "Hide keywords ↑" : "Show keywords ↓"}
				</button>
				<AnimatePresence>
					{expanded && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							className="overflow-hidden"
						>
							<div className="pt-2 flex flex-wrap gap-1.5">
								{cluster.keywords.slice(0, 10).map((kw) => (
									<span
										key={kw.keyword}
										className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-subtle text-xs"
									>
										<span className="text-text-primary">{kw.keyword}</span>
										<span className="text-text-tertiary">
											{formatVolume(kw.volume)}
										</span>
									</span>
								))}
								{cluster.keywords.length > 10 && (
									<span className="text-xs text-text-tertiary px-2 py-0.5">
										+{cluster.keywords.length - 10} more
									</span>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}

function SelectionState({
	clusters,
	maxSelections,
	accessToken,
	onComplete,
}: ClusterSelectionCardProps) {
	const [selected, setSelected] = useState<string[]>([]);
	const [submitting, setSubmitting] = useState(false);

	const canSelectMore = selected.length < maxSelections;

	function toggleCluster(id: string) {
		setSelected((prev) =>
			prev.includes(id)
				? prev.filter((c) => c !== id)
				: canSelectMore
					? [...prev, id]
					: prev,
		);
	}

	async function handleSubmit() {
		if (selected.length === 0) return;

		setSubmitting(true);
		try {
			await selectClusters(accessToken, selected);
			onComplete?.();
		} catch (error) {
			console.error("Failed to submit clusters:", error);
		} finally {
			setSubmitting(false);
		}
	}

	const totalVolume = clusters
		.filter((c) => selected.includes(c.id))
		.reduce((sum, c) => sum + c.totalVolume, 0);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-surface border border-border rounded-2xl overflow-hidden shadow-lg"
		>
			{/* Header */}
			<div className="p-6 border-b border-border">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="font-display text-xl font-bold text-text-primary mb-1">
							What topics should we cover?
						</h3>
						<p className="text-sm text-text-secondary">
							We'll create detailed content briefs for each topic you select
						</p>
					</div>
					<motion.div
						initial={{ scale: 0.9 }}
						animate={{ scale: 1 }}
						className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-subtle border border-border"
					>
						<span className="text-lg font-display font-bold text-text-primary">
							{selected.length}
						</span>
						<span className="text-sm text-text-tertiary">
							/ {maxSelections}
						</span>
					</motion.div>
				</div>
			</div>

			{/* Clusters grid */}
			<div className="p-6">
				<div className="grid gap-3">
					{clusters.map((cluster) => (
						<ClusterCheckbox
							key={cluster.id}
							cluster={cluster}
							selected={selected.includes(cluster.id)}
							disabled={!canSelectMore}
							onToggle={() => toggleCluster(cluster.id)}
						/>
					))}
				</div>
			</div>

			{/* Footer */}
			<div className="px-6 py-4 bg-subtle border-t border-border flex items-center justify-between">
				<div className="text-sm text-text-tertiary">
					{selected.length === 0 ? (
						"Select at least 1 topic to generate briefs"
					) : (
						<span>
							{selected.length} topic{selected.length !== 1 ? "s" : ""} selected
							•{" "}
							<span className="text-text-secondary font-medium">
								{formatVolume(totalVolume)}
							</span>{" "}
							total monthly searches
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={handleSubmit}
					disabled={selected.length === 0 || submitting}
					className="px-6 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					{submitting ? (
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
							Saving...
						</>
					) : (
						<>
							Generate Briefs
							<span className="text-white/70">→</span>
						</>
					)}
				</button>
			</div>
		</motion.div>
	);
}

export function ClusterSelectionCard({
	clusters,
	maxSelections,
	accessToken,
	onComplete,
}: ClusterSelectionCardProps) {
	// Show analyzing state if no clusters yet
	if (!clusters || clusters.length === 0) {
		return <AnalyzingState />;
	}

	return (
		<SelectionState
			clusters={clusters}
			maxSelections={maxSelections}
			accessToken={accessToken}
			onComplete={onComplete}
		/>
	);
}
