"use client";

import { motion } from "@/components/motion";
import type { AuditTier } from "@/lib/api";
import { tierInfo } from "@/lib/api";
import { billingEnabled } from "@/lib/config";
import Link from "next/link";

type PricingCardProps = {
	tier: AuditTier;
	featured?: boolean;
};

export function PricingCard({ tier, featured }: PricingCardProps) {
	const info = tierInfo[tier];
	const isPaidTier = tier !== "FREE";
	const isDisabled = isPaidTier && !billingEnabled;

	return (
		<motion.div
			whileHover={{
				y: -6,
			}}
			transition={{ duration: 0.2 }}
			className={`relative p-8 rounded-xl transition-shadow ${
				featured
					? "bg-accent text-canvas shadow-lg hover:shadow-xl scale-[1.02] z-10"
					: "bg-surface border border-border shadow-sm hover:shadow-md"
			}`}
		>
			{featured && (
				<motion.div
					initial={{ scale: 0, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{
						delay: 0.2,
						type: "spring",
						stiffness: 400,
						damping: 20,
					}}
					className="absolute -top-3 left-6 px-3 py-1 bg-canvas text-accent text-2xs font-semibold rounded-full shadow-sm"
				>
					Most popular
				</motion.div>
			)}

			<h3
				className={`font-sans font-semibold text-lg mb-2 ${featured ? "text-canvas" : "text-text-primary"}`}
			>
				{info.name}
			</h3>
			<div className="flex items-baseline gap-1.5 mb-8">
				{info.price === 0 ? (
					<span
						className={`text-4xl font-bold ${featured ? "text-canvas" : "text-text-primary"}`}
					>
						Free
					</span>
				) : (
					<>
						<span
							className={`text-4xl font-bold tracking-tight ${featured ? "text-canvas" : "text-text-primary"}`}
						>
							${info.price}
						</span>
						<span
							className={`text-sm ${featured ? "text-canvas/70" : "text-text-tertiary"}`}
						>
							one-time
						</span>
					</>
				)}
			</div>

			<ul className="space-y-3 mb-8">
				{info.features.map((feature) => (
					<li
						key={feature}
						className={`flex items-start gap-3 text-sm ${featured ? "text-canvas/90" : "text-text-secondary"}`}
					>
						<svg
							className={`w-5 h-5 mt-0.5 flex-shrink-0 ${featured ? "text-canvas" : "text-status-good"}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						{feature}
					</li>
				))}
			</ul>

			{isDisabled ? (
				<>
					<div className="relative mb-4">
						<span
							className={`inline-block px-2 py-0.5 text-2xs font-medium rounded ${
								featured
									? "bg-canvas/20 text-canvas"
									: "bg-accent/10 text-accent"
							}`}
						>
							Coming Soon
						</span>
					</div>
					<div
						className={`block w-full text-center py-3 px-4 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed ${
							featured ? "bg-canvas text-accent" : "bg-accent text-canvas"
						}`}
					>
						Coming Soon
					</div>
				</>
			) : (
				<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
					<Link
						href={`/analyze?tier=${tier}`}
						className={`block w-full text-center py-3 px-4 rounded-lg text-sm font-medium transition-all ${
							featured
								? "bg-canvas text-accent hover:bg-canvas/90 shadow-sm"
								: "bg-accent text-canvas hover:bg-accent-hover"
						}`}
					>
						Get Started
					</Link>
				</motion.div>
			)}
		</motion.div>
	);
}
