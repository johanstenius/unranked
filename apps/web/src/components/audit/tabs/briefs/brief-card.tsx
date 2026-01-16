"use client";

import type { BriefData } from "@/lib/types";
import { getDifficultyColor, getDifficultyLabel } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";

type BriefCardProps = {
	brief: BriefData;
	auditToken: string;
};

export function BriefCard({ brief, auditToken }: BriefCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className="group"
		>
			<Link
				href={`/audit/${auditToken}/brief/${brief.id}`}
				className="block p-4 rounded-xl border border-border bg-surface hover:border-accent/30 hover:shadow-sm transition-all"
			>
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1 min-w-0">
						<h4 className="font-display font-semibold text-text-primary mb-1 group-hover:text-accent transition-colors">
							{brief.keyword}
						</h4>
						{brief.title && (
							<p className="text-sm text-text-secondary line-clamp-1 mb-2">
								{brief.title}
							</p>
						)}
						<div className="flex items-center gap-3 text-xs">
							<span className="text-text-tertiary">
								{brief.searchVolume.toLocaleString()} monthly searches
							</span>
							<span className="text-text-tertiary">•</span>
							<span className={getDifficultyColor(brief.difficulty)}>
								{getDifficultyLabel(brief.difficulty)} difficulty
							</span>
						</div>
					</div>
					<div className="flex-shrink-0">
						<span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-subtle text-text-secondary group-hover:bg-accent group-hover:text-white transition-colors">
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
								/>
							</svg>
						</span>
					</div>
				</div>
			</Link>
		</motion.div>
	);
}
