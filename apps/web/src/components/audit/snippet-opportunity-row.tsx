"use client";

import { AnimatePresence, motion } from "@/components/motion";
import { SNIPPET_TYPE_CONFIG } from "@/lib/config";
import type { SnippetOpportunity } from "@/lib/types";
import { getHostname } from "@/lib/utils";
import { useState } from "react";

type SnippetOpportunityRowProps = {
	snippet: SnippetOpportunity;
};

export function SnippetOpportunityRow({ snippet }: SnippetOpportunityRowProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const config = SNIPPET_TYPE_CONFIG[snippet.snippetType];
	const hostname = getHostname(snippet.currentHolder);

	return (
		<div
			className={`group rounded-lg border transition-all duration-200 ${
				isExpanded
					? `${config.border} ${config.bg}`
					: "border-border hover:border-border-active bg-subtle/50 hover:bg-subtle"
			}`}
		>
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-full text-left"
			>
				<div className="flex items-center gap-4 px-4 py-3">
					<motion.div
						animate={{ rotate: isExpanded ? 90 : 0 }}
						transition={{ duration: 0.15 }}
						className="text-text-tertiary"
					>
						<svg
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
							className="opacity-60"
							aria-hidden="true"
						>
							<path
								d="M4.5 2.5L8 6L4.5 9.5"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</motion.div>

					<div className="flex-1 min-w-0">
						<span className="font-medium text-text-primary text-sm">
							{snippet.keyword}
						</span>
					</div>

					<div
						className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}
					>
						<span className="text-[10px]">{config.icon}</span>
						<span>{config.label}</span>
					</div>

					<div className="w-20 text-right text-sm text-text-secondary tabular-nums">
						{snippet.searchVolume.toLocaleString()}
					</div>

					<div className="w-16 text-center text-sm">
						{snippet.yourPosition ? (
							<span className="text-text-primary font-medium">
								#{snippet.yourPosition}
							</span>
						) : (
							<span className="text-text-tertiary">—</span>
						)}
					</div>

					<div className="w-16 text-right">
						<span
							className={`text-xs font-medium ${
								snippet.difficulty === "easy"
									? "text-status-good"
									: snippet.difficulty === "medium"
										? "text-status-warn"
										: "text-status-crit"
							}`}
						>
							{snippet.difficulty.charAt(0).toUpperCase() +
								snippet.difficulty.slice(1)}
						</span>
					</div>
				</div>
			</button>

			<AnimatePresence>
				{isExpanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
						className="overflow-hidden"
					>
						<div className="px-4 pb-4 pt-1">
							<div className="ml-7 p-4 rounded-lg bg-canvas border border-border">
								<div className="flex items-start gap-3">
									<div
										className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm ${config.bg} ${config.text}`}
									>
										{config.icon}
									</div>

									<div className="flex-1 min-w-0">
										<h4 className="font-display font-semibold text-text-primary text-[15px] leading-snug mb-1.5">
											{snippet.snippetTitle || "No title available"}
										</h4>

										<p className="text-sm text-text-secondary leading-relaxed">
											{snippet.snippetContent || "No content available"}
										</p>

										<div className="mt-3 flex items-center gap-2">
											<div className="w-4 h-4 rounded-full bg-border flex items-center justify-center">
												<span className="text-[8px] text-text-tertiary font-medium">
													{hostname.charAt(0).toUpperCase()}
												</span>
											</div>
											<a
												href={snippet.currentHolder}
												target="_blank"
												rel="noopener noreferrer"
												className="text-xs text-accent hover:underline truncate max-w-[300px]"
												onClick={(e) => e.stopPropagation()}
											>
												{hostname}
											</a>
										</div>
									</div>
								</div>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
