"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { DecisionCard, SelectionCounter, SelectionItem } from "./decision-card";

export type SuggestedCompetitor = {
	domain: string;
	reason: string;
	source: "ai" | "serp";
	sharedKeywords?: number;
};

type CompetitorSelectorProps = {
	suggestions: SuggestedCompetitor[];
	maxSelections: number;
	tierName: string;
	onContinue: (selected: string[]) => void;
	onSkip?: () => void;
	isLoading?: boolean;
};

export function CompetitorSelector({
	suggestions,
	maxSelections,
	tierName,
	onContinue,
	onSkip,
	isLoading,
}: CompetitorSelectorProps) {
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [customInput, setCustomInput] = useState("");
	const [showCustom, setShowCustom] = useState(false);
	const [customCompetitors, setCustomCompetitors] = useState<string[]>([]);

	const allCompetitors = [
		...suggestions,
		...customCompetitors.map((domain) => ({
			domain,
			reason: "Added by you",
			source: "ai" as const,
		})),
	];

	const canSelectMore = selected.size < maxSelections;

	function toggleSelection(domain: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(domain)) {
				next.delete(domain);
			} else if (canSelectMore) {
				next.add(domain);
			}
			return next;
		});
	}

	function addCustomCompetitor() {
		const domain = customInput
			.trim()
			.toLowerCase()
			.replace(/^https?:\/\//, "")
			.replace(/\/.*$/, "");

		if (domain && !customCompetitors.includes(domain)) {
			setCustomCompetitors((prev) => [...prev, domain]);
			if (canSelectMore) {
				setSelected((prev) => new Set([...prev, domain]));
			}
		}
		setCustomInput("");
		setShowCustom(false);
	}

	const aiSuggestions = suggestions.filter((s) => s.source === "ai");
	const serpSuggestions = suggestions.filter((s) => s.source === "serp");

	return (
		<DecisionCard
			title="Select Your Competitors"
			subtitle="Choose who you want to benchmark against"
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
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
					/>
				</svg>
			}
			footer={
				<div className="flex items-center justify-between">
					<SelectionCounter
						selected={selected.size}
						max={maxSelections}
						label={`competitors (${tierName})`}
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
							disabled={isLoading}
							className={cn(
								"bg-cyan-500 hover:bg-cyan-400 text-zinc-900 font-medium",
								"shadow-lg shadow-cyan-500/20",
								"transition-all duration-200",
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
									Analyzing...
								</span>
							) : (
								"Continue →"
							)}
						</Button>
					</div>
				</div>
			}
		>
			<div className="space-y-4">
				{/* AI Suggestions */}
				{aiSuggestions.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
								AI Suggested
							</span>
							<div className="flex-1 h-px bg-zinc-800" />
						</div>
						<div className="space-y-2">
							{aiSuggestions.map((competitor) => (
								<SelectionItem
									key={competitor.domain}
									selected={selected.has(competitor.domain)}
									onToggle={() => toggleSelection(competitor.domain)}
									disabled={!canSelectMore && !selected.has(competitor.domain)}
								>
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-400 uppercase">
											{competitor.domain.slice(0, 2)}
										</div>
										<div>
											<div className="font-medium text-white">
												{competitor.domain}
											</div>
											<div className="text-xs text-zinc-500">
												{competitor.reason}
											</div>
										</div>
									</div>
								</SelectionItem>
							))}
						</div>
					</div>
				)}

				{/* SERP Competitors */}
				{serpSuggestions.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
								Ranking for Similar Keywords
							</span>
							<div className="flex-1 h-px bg-zinc-800" />
						</div>
						<div className="space-y-2">
							{serpSuggestions.map((competitor) => (
								<SelectionItem
									key={competitor.domain}
									selected={selected.has(competitor.domain)}
									onToggle={() => toggleSelection(competitor.domain)}
									disabled={!canSelectMore && !selected.has(competitor.domain)}
									badge={
										competitor.sharedKeywords ? (
											<span className="text-xs font-mono text-zinc-500">
												{competitor.sharedKeywords} keywords
											</span>
										) : undefined
									}
								>
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-400 uppercase">
											{competitor.domain.slice(0, 2)}
										</div>
										<div>
											<div className="font-medium text-white">
												{competitor.domain}
											</div>
											<div className="text-xs text-zinc-500">
												{competitor.reason}
											</div>
										</div>
									</div>
								</SelectionItem>
							))}
						</div>
					</div>
				)}

				{/* Custom competitors */}
				{customCompetitors.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
								Custom
							</span>
							<div className="flex-1 h-px bg-zinc-800" />
						</div>
						<div className="space-y-2">
							{customCompetitors.map((domain) => (
								<SelectionItem
									key={domain}
									selected={selected.has(domain)}
									onToggle={() => toggleSelection(domain)}
									disabled={!canSelectMore && !selected.has(domain)}
								>
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-400 uppercase">
											{domain.slice(0, 2)}
										</div>
										<div className="font-medium text-white">{domain}</div>
									</div>
								</SelectionItem>
							))}
						</div>
					</div>
				)}

				{/* Add custom competitor */}
				<AnimatePresence mode="wait">
					{showCustom ? (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							className="flex gap-2"
						>
							<Input
								value={customInput}
								onChange={(e) => setCustomInput(e.target.value)}
								placeholder="competitor.com"
								className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600"
								onKeyDown={(e) => {
									if (e.key === "Enter") addCustomCompetitor();
									if (e.key === "Escape") setShowCustom(false);
								}}
								autoFocus
							/>
							<Button
								onClick={addCustomCompetitor}
								size="sm"
								className="bg-zinc-800 hover:bg-zinc-700 text-white"
							>
								Add
							</Button>
							<Button
								onClick={() => setShowCustom(false)}
								size="sm"
								variant="ghost"
								className="text-zinc-500"
							>
								Cancel
							</Button>
						</motion.div>
					) : (
						<motion.button
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							type="button"
							onClick={() => setShowCustom(true)}
							className={cn(
								"w-full p-3 rounded-xl border border-dashed border-zinc-700 text-zinc-500",
								"hover:border-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/30",
								"transition-all duration-200 text-sm",
							)}
						>
							+ Add custom competitor
						</motion.button>
					)}
				</AnimatePresence>

				{/* Empty state */}
				{allCompetitors.length === 0 && !showCustom && (
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
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
						<p className="text-zinc-500 text-sm mb-2">
							No competitors found automatically
						</p>
						<button
							type="button"
							onClick={() => setShowCustom(true)}
							className="text-cyan-400 text-sm hover:underline"
						>
							Add your competitors manually
						</button>
					</div>
				)}
			</div>
		</DecisionCard>
	);
}
