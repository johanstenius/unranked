"use client";

import { selectCompetitors } from "@/lib/api";
import type { CompetitorSuggestion } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

type CompetitorSelectionCardProps = {
	suggestions: CompetitorSuggestion[];
	maxSelections: number;
	accessToken: string;
	onComplete?: () => void;
};

function DiscoveryState() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-surface rounded-xl shadow-card p-8 mb-8"
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
						Finding your competitors...
					</h3>
					<p className="text-text-secondary text-sm">
						Analyzing your product and market to suggest relevant competitors
					</p>
				</div>
			</div>
		</motion.div>
	);
}

function CompetitorCheckbox({
	suggestion,
	selected,
	disabled,
	onToggle,
}: {
	suggestion: CompetitorSuggestion;
	selected: boolean;
	disabled: boolean;
	onToggle: () => void;
}) {
	const confidencePercent = Math.round(suggestion.confidence * 100);

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
						<span className="font-mono text-sm font-medium text-text-primary truncate">
							{suggestion.domain}
						</span>
						<span
							className={`
							text-xs px-1.5 py-0.5 rounded-full font-medium
							${
								confidencePercent >= 90
									? "bg-status-good/15 text-status-good"
									: confidencePercent >= 70
										? "bg-accent/15 text-accent"
										: "bg-border text-text-tertiary"
							}
						`}
						>
							{confidencePercent}% match
						</span>
					</div>
					<p className="text-sm text-text-secondary truncate">
						{suggestion.reason}
					</p>
				</div>
			</div>
		</motion.button>
	);
}

function SelectionState({
	suggestions,
	maxSelections,
	accessToken,
	onComplete,
}: CompetitorSelectionCardProps) {
	const [selected, setSelected] = useState<string[]>([]);
	const [customDomain, setCustomDomain] = useState("");
	const [showCustomInput, setShowCustomInput] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const canSelectMore = selected.length < maxSelections;

	function toggleCompetitor(domain: string) {
		setSelected((prev) =>
			prev.includes(domain)
				? prev.filter((d) => d !== domain)
				: canSelectMore
					? [...prev, domain]
					: prev,
		);
	}

	function addCustomCompetitor() {
		const domain = customDomain
			.trim()
			.toLowerCase()
			.replace(/^https?:\/\//, "")
			.replace(/\/.*$/, "");

		if (domain && !selected.includes(domain) && canSelectMore) {
			setSelected((prev) => [...prev, domain]);
			setCustomDomain("");
			setShowCustomInput(false);
		}
	}

	async function handleSubmit() {
		if (selected.length === 0) return;

		setSubmitting(true);
		try {
			await selectCompetitors(accessToken, selected);
			onComplete?.();
		} catch (error) {
			console.error("Failed to submit competitors:", error);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-surface rounded-2xl shadow-card overflow-hidden shadow-lg"
		>
			{/* Header */}
			<div className="p-6 border-b border-border">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="font-display text-xl font-bold text-text-primary mb-1">
							Who are your competitors?
						</h3>
						<p className="text-sm text-text-secondary">
							We'll analyze their rankings to find keyword opportunities
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

			{/* Suggestions grid */}
			<div className="p-6">
				<div className="grid gap-3">
					{suggestions.map((suggestion) => (
						<CompetitorCheckbox
							key={suggestion.domain}
							suggestion={suggestion}
							selected={selected.includes(suggestion.domain)}
							disabled={!canSelectMore}
							onToggle={() => toggleCompetitor(suggestion.domain)}
						/>
					))}
				</div>

				{/* Custom competitor input */}
				<AnimatePresence>
					{showCustomInput ? (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							className="mt-4 overflow-hidden"
						>
							<div className="flex gap-2">
								<input
									type="text"
									value={customDomain}
									onChange={(e) => setCustomDomain(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && addCustomCompetitor()}
									placeholder="competitor.com"
									className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent font-mono text-sm"
									disabled={!canSelectMore}
								/>
								<button
									type="button"
									onClick={addCustomCompetitor}
									disabled={!customDomain.trim() || !canSelectMore}
									className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Add
								</button>
								<button
									type="button"
									onClick={() => setShowCustomInput(false)}
									className="px-4 py-2 rounded-lg border border-border text-text-secondary text-sm font-medium hover:bg-subtle transition-colors"
								>
									Cancel
								</button>
							</div>
						</motion.div>
					) : (
						<motion.button
							type="button"
							onClick={() => setShowCustomInput(true)}
							disabled={!canSelectMore}
							className="mt-4 w-full p-3 rounded-xl border-2 border-dashed border-border text-text-secondary text-sm hover:border-accent/50 hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							+ Add custom competitor
						</motion.button>
					)}
				</AnimatePresence>

				{/* Custom selections display */}
				{selected.filter((s) => !suggestions.some((sug) => sug.domain === s))
					.length > 0 && (
					<div className="mt-4 pt-4 border-t border-border">
						<p className="text-xs text-text-tertiary mb-2">Custom additions:</p>
						<div className="flex flex-wrap gap-2">
							{selected
								.filter((s) => !suggestions.some((sug) => sug.domain === s))
								.map((domain) => (
									<span
										key={domain}
										className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-mono"
									>
										{domain}
										<button
											type="button"
											onClick={() => toggleCompetitor(domain)}
											className="w-4 h-4 rounded-full hover:bg-accent/20 flex items-center justify-center"
										>
											×
										</button>
									</span>
								))}
						</div>
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="px-6 py-4 bg-subtle border-t border-border flex items-center justify-between">
				<p className="text-sm text-text-tertiary">
					{selected.length === 0
						? "Select at least 1 competitor to continue"
						: `${selected.length} competitor${selected.length !== 1 ? "s" : ""} selected`}
				</p>
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
							Continue
							<span className="text-white/70">→</span>
						</>
					)}
				</button>
			</div>
		</motion.div>
	);
}

export function CompetitorSelectionCard({
	suggestions,
	maxSelections,
	accessToken,
	onComplete,
}: CompetitorSelectionCardProps) {
	// Show discovery state if no suggestions yet
	if (!suggestions || suggestions.length === 0) {
		return <DiscoveryState />;
	}

	return (
		<SelectionState
			suggestions={suggestions}
			maxSelections={maxSelections}
			accessToken={accessToken}
			onComplete={onComplete}
		/>
	);
}
