"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Circle circumference for SVG progress ring (2πr where r=10)
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 10;

type CrawlProgressProps = {
	pagesFound: number;
	totalPages?: number;
	isComplete: boolean;
	className?: string;
};

export function CrawlProgress({
	pagesFound,
	totalPages,
	isComplete,
	className,
}: CrawlProgressProps) {
	const progress = totalPages
		? Math.min((pagesFound / totalPages) * 100, 100)
		: 0;

	return (
		<div
			className={cn(
				"flex items-center gap-3 px-4 py-2 rounded-xl",
				"bg-zinc-900/80 border border-zinc-800/50 backdrop-blur-sm",
				className,
			)}
		>
			{/* Status icon */}
			{isComplete ? (
				<div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
					<svg
						className="w-4 h-4 text-emerald-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
			) : (
				<div className="relative w-6 h-6">
					{/* Outer ring */}
					<svg
						className="w-6 h-6 -rotate-90"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<circle
							cx="12"
							cy="12"
							r="10"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							className="text-zinc-800"
						/>
						<motion.circle
							cx="12"
							cy="12"
							r="10"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							className="text-cyan-500"
							strokeDasharray={CIRCLE_CIRCUMFERENCE}
							initial={{ strokeDashoffset: CIRCLE_CIRCUMFERENCE }}
							animate={{
								strokeDashoffset:
									CIRCLE_CIRCUMFERENCE -
									(CIRCLE_CIRCUMFERENCE * progress) / 100,
							}}
							transition={{ duration: 0.5, ease: "easeOut" }}
						/>
					</svg>
					{/* Scanning animation */}
					<motion.div
						className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
						animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
						transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
					/>
				</div>
			)}

			{/* Text */}
			<div className="flex flex-col">
				<span
					className={cn(
						"text-xs font-mono uppercase tracking-wider",
						isComplete ? "text-emerald-400" : "text-zinc-400",
					)}
				>
					{isComplete ? "Scan Complete" : "Scanning Site"}
				</span>
				<span className="text-sm font-medium text-white">
					{pagesFound.toLocaleString()} pages
					{totalPages && !isComplete && (
						<span className="text-zinc-500">
							{" "}
							/ {totalPages.toLocaleString()}
						</span>
					)}
				</span>
			</div>

			{/* Progress bar (only when scanning) */}
			{!isComplete && totalPages && (
				<div className="flex-1 max-w-24">
					<div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
						<motion.div
							className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
							initial={{ width: 0 }}
							animate={{ width: `${progress}%` }}
							transition={{ duration: 0.5, ease: "easeOut" }}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

// Waiting state when user is faster than crawl
type WaitingForCrawlProps = {
	pagesFound: number;
	totalPages?: number;
};

export function WaitingForCrawl({
	pagesFound,
	totalPages,
}: WaitingForCrawlProps) {
	const progress = totalPages
		? Math.min((pagesFound / totalPages) * 100, 100)
		: 0;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="text-center py-12"
		>
			{/* Animated radar */}
			<div className="relative w-32 h-32 mx-auto mb-6">
				{/* Background circles */}
				<div className="absolute inset-0 rounded-full border border-zinc-800" />
				<div className="absolute inset-4 rounded-full border border-zinc-800" />
				<div className="absolute inset-8 rounded-full border border-zinc-800" />

				{/* Scanning beam */}
				<motion.div
					className="absolute inset-0 origin-center"
					animate={{ rotate: 360 }}
					transition={{
						duration: 3,
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
					}}
				>
					<div
						className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left"
						style={{
							background:
								"linear-gradient(90deg, rgba(34, 211, 238, 0.8) 0%, transparent 100%)",
						}}
					/>
				</motion.div>

				{/* Center dot */}
				<div className="absolute inset-0 flex items-center justify-center">
					<motion.div
						className="w-3 h-3 bg-cyan-500 rounded-full"
						animate={{ scale: [1, 1.2, 1] }}
						transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
					/>
				</div>

				{/* Blips - fixed positions to avoid re-render flicker */}
				{[
					{ id: "blip-a", top: "35%", left: "55%" },
					{ id: "blip-b", top: "60%", left: "40%" },
					{ id: "blip-c", top: "45%", left: "65%" },
				].map((blip, i) => (
					<motion.div
						key={blip.id}
						className="absolute w-2 h-2 bg-cyan-400 rounded-full"
						style={{ top: blip.top, left: blip.left }}
						animate={{ opacity: [0, 1, 0] }}
						transition={{
							duration: 2,
							repeat: Number.POSITIVE_INFINITY,
							delay: i * 0.5,
						}}
					/>
				))}
			</div>

			<h3 className="text-lg font-medium text-white mb-2">
				Finishing site scan...
			</h3>
			<p className="text-zinc-500 text-sm mb-4">
				{pagesFound} pages discovered
				{totalPages && ` of ~${totalPages}`}
			</p>

			{/* Progress bar */}
			{totalPages && (
				<div className="max-w-xs mx-auto">
					<div className="flex justify-between text-xs font-mono text-zinc-500 mb-1">
						<span>Progress</span>
						<span>{Math.round(progress)}%</span>
					</div>
					<div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
						<motion.div
							className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
							initial={{ width: 0 }}
							animate={{ width: `${progress}%` }}
							transition={{ duration: 0.5, ease: "easeOut" }}
						/>
					</div>
				</div>
			)}
		</motion.div>
	);
}
