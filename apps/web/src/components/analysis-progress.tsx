"use client";

import type { Audit, AuditStatus } from "@/lib/api";
import { tierInfo } from "@/lib/config";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type AnalysisProgressProps = {
	audit: Audit;
	hostname: string;
};

const STATUS_STEPS: {
	status: AuditStatus;
	label: string;
	activeLabel: string;
	description: string;
}[] = [
	{
		status: "PENDING",
		label: "Starting",
		activeLabel: "Initializing...",
		description: "Setting up analysis environment",
	},
	{
		status: "CRAWLING",
		label: "Crawling docs",
		activeLabel: "Crawling your docs",
		description: "Discovering and indexing pages",
	},
	{
		status: "ANALYZING",
		label: "Finding opportunities",
		activeLabel: "Analyzing SEO opportunities",
		description: "Evaluating keywords and rankings",
	},
	{
		status: "GENERATING_BRIEFS",
		label: "Generating briefs",
		activeLabel: "Creating content briefs",
		description: "AI-powered content recommendations",
	},
];

function getStatusIndex(status: AuditStatus): number {
	const idx = STATUS_STEPS.findIndex((s) => s.status === status);
	return idx === -1 ? 0 : idx;
}

function ActivityPulse() {
	return (
		<div className="relative flex items-center justify-center w-3 h-3">
			<span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
			<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
		</div>
	);
}

function LiveCounter({ value, label }: { value: number; label: string }) {
	const [displayValue, setDisplayValue] = useState(0);

	useEffect(() => {
		if (value === 0) return;

		const duration = 800;
		const steps = 20;
		const increment = value / steps;
		let current = 0;

		const timer = setInterval(() => {
			current += increment;
			if (current >= value) {
				setDisplayValue(value);
				clearInterval(timer);
			} else {
				setDisplayValue(Math.floor(current));
			}
		}, duration / steps);

		return () => clearInterval(timer);
	}, [value]);

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			className="bg-subtle/50 border border-border/50 rounded-lg p-4 text-center backdrop-blur-sm"
		>
			<motion.p
				key={displayValue}
				initial={{ y: 10, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				className="text-3xl font-bold text-text-primary font-mono tabular-nums"
			>
				{displayValue}
			</motion.p>
			<p className="text-xs text-text-tertiary mt-1">{label}</p>
		</motion.div>
	);
}

function SitemapDiscoveryInfo({
	sitemapUrlCount,
	maxPages,
	pagesFound,
}: {
	sitemapUrlCount: number | null;
	maxPages: number;
	pagesFound: number | null;
}) {
	if (sitemapUrlCount === null) {
		return (
			<motion.div
				initial={{ opacity: 0, height: 0 }}
				animate={{ opacity: 1, height: "auto" }}
				className="mt-2 flex items-center gap-2"
			>
				<motion.div
					className="w-1.5 h-1.5 rounded-full bg-emerald-500/60"
					animate={{ opacity: [0.4, 1, 0.4] }}
					transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
				/>
				<span className="text-xs text-text-tertiary">
					Checking for sitemap...
				</span>
			</motion.div>
		);
	}

	if (sitemapUrlCount === 0) {
		return (
			<motion.div
				initial={{ opacity: 0, height: 0 }}
				animate={{ opacity: 1, height: "auto" }}
				className="mt-2 space-y-1"
			>
				<div className="flex items-center gap-2">
					<span className="text-xs text-amber-500/80">○</span>
					<span className="text-xs text-text-tertiary">
						No sitemap found, discovering pages...
					</span>
				</div>
				<div className="flex items-center gap-2 pl-4">
					<span className="text-xs text-text-tertiary/70">
						Crawling up to {maxPages} pages
					</span>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: "auto" }}
			className="mt-2 space-y-1"
		>
			<div className="flex items-center gap-2">
				<motion.span
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ type: "spring", stiffness: 500, damping: 25 }}
					className="text-xs text-emerald-500"
				>
					✓
				</motion.span>
				<motion.span
					initial={{ opacity: 0, x: -5 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.1 }}
					className="text-xs text-text-secondary"
				>
					Found{" "}
					<span className="font-mono text-emerald-500 font-medium">
						{sitemapUrlCount.toLocaleString()}
					</span>{" "}
					pages in sitemap
				</motion.span>
			</div>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2 }}
				className="flex items-center gap-2 pl-4"
			>
				<span className="text-xs text-text-tertiary/70">
					{pagesFound !== null && pagesFound > 0 ? (
						<>
							Crawling <span className="font-mono">{pagesFound}</span> of{" "}
							{maxPages}
						</>
					) : (
						<>Crawling up to {maxPages} pages</>
					)}
				</span>
			</motion.div>
		</motion.div>
	);
}

function ProgressStep({
	step,
	index,
	currentIndex,
	audit,
}: {
	step: (typeof STATUS_STEPS)[0];
	index: number;
	currentIndex: number;
	audit: Audit;
}) {
	const isComplete = index < currentIndex;
	const isCurrent = index === currentIndex;
	const isPending = index > currentIndex;
	const maxPages = tierInfo[audit.tier].pages;

	function getDetail(): string | null {
		if (isComplete && step.status === "CRAWLING" && audit.pagesFound) {
			return `${audit.pagesFound} pages`;
		}
		return null;
	}

	const detail = getDetail();
	const showSitemapInfo =
		step.status === "CRAWLING" && (isCurrent || isComplete);

	return (
		<motion.div
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: index * 0.1, duration: 0.4 }}
			className={`flex items-start gap-4 p-4 rounded-lg transition-all duration-500 ${
				isCurrent
					? "bg-emerald-500/5 border border-emerald-500/20"
					: "bg-transparent border border-transparent"
			}`}
		>
			{/* Status indicator */}
			<div className="flex-shrink-0 mt-0.5">
				{isComplete ? (
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ type: "spring", stiffness: 400, damping: 15 }}
						className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center"
					>
						<motion.svg
							initial={{ pathLength: 0 }}
							animate={{ pathLength: 1 }}
							transition={{ duration: 0.3, delay: 0.1 }}
							className="w-3.5 h-3.5 text-emerald-500"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<motion.path d="M5 13l4 4L19 7" />
						</motion.svg>
					</motion.div>
				) : isCurrent ? (
					<div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
						<ActivityPulse />
					</div>
				) : (
					<div className="w-6 h-6 rounded-full bg-subtle border border-border flex items-center justify-center">
						<span className="text-xs text-text-tertiary">{index + 1}</span>
					</div>
				)}
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span
						className={`font-medium ${
							isPending ? "text-text-tertiary" : "text-text-primary"
						}`}
					>
						{isCurrent ? step.activeLabel : step.label}
					</span>
					{detail && (
						<motion.span
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							className="text-sm text-emerald-500 font-mono"
						>
							{detail}
						</motion.span>
					)}
				</div>
				<p
					className={`text-sm mt-0.5 ${
						isPending ? "text-text-tertiary/50" : "text-text-secondary"
					}`}
				>
					{step.description}
				</p>

				{/* Sitemap discovery info for CRAWLING step */}
				{showSitemapInfo && (
					<SitemapDiscoveryInfo
						sitemapUrlCount={audit.sitemapUrlCount}
						maxPages={maxPages}
						pagesFound={audit.pagesFound}
					/>
				)}
			</div>

			{/* Progress spinner for current step */}
			{isCurrent && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex-shrink-0"
				>
					<svg
						className="w-5 h-5 text-emerald-500 animate-spin"
						viewBox="0 0 24 24"
						fill="none"
						aria-hidden="true"
					>
						<circle
							className="opacity-20"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="2"
						/>
						<path
							className="opacity-80"
							d="M12 2a10 10 0 0 1 10 10"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
						/>
					</svg>
				</motion.div>
			)}
		</motion.div>
	);
}

function ElapsedTime({ startTime }: { startTime: Date }) {
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
		}, 1000);
		return () => clearInterval(interval);
	}, [startTime]);

	const minutes = Math.floor(elapsed / 60);
	const seconds = elapsed % 60;

	return (
		<span className="font-mono tabular-nums">
			{minutes}:{seconds.toString().padStart(2, "0")}
		</span>
	);
}

const WAVEFORM_BARS = [
	{ id: "bar-a", delay: 0 },
	{ id: "bar-b", delay: 0.1 },
	{ id: "bar-c", delay: 0.2 },
	{ id: "bar-d", delay: 0.3 },
	{ id: "bar-e", delay: 0.4 },
];

function WaveformIndicator() {
	return (
		<div className="flex items-center gap-0.5 h-4">
			{WAVEFORM_BARS.map((bar) => (
				<motion.div
					key={bar.id}
					className="w-1 bg-emerald-500/60 rounded-full"
					animate={{
						height: ["8px", "16px", "8px"],
					}}
					transition={{
						duration: 0.8,
						repeat: Number.POSITIVE_INFINITY,
						delay: bar.delay,
						ease: "easeInOut",
					}}
				/>
			))}
		</div>
	);
}

export function AnalysisProgress({ audit, hostname }: AnalysisProgressProps) {
	const statusIndex = getStatusIndex(audit.status);
	const progressPercent = ((statusIndex + 0.5) / STATUS_STEPS.length) * 100;
	const [startTime] = useState(() => new Date(audit.createdAt));

	return (
		<div className="max-w-[680px] mx-auto">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="text-center mb-10"
			>
				<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
					<ActivityPulse />
					<span className="text-sm font-medium text-emerald-500">
						Analysis in progress
					</span>
				</div>
				<h1 className="font-display text-3xl font-semibold text-text-primary mb-2">
					Analyzing {hostname}
				</h1>
				<p className="text-text-secondary">
					<span className="uppercase text-xs tracking-wider text-text-tertiary">
						{audit.tier} tier
					</span>
				</p>
			</motion.div>

			{/* Main progress card */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="relative border border-border rounded-xl overflow-hidden bg-canvas"
			>
				{/* Subtle ambient background */}
				<div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] to-transparent" />

				{/* Progress bar */}
				<div className="relative h-1 bg-subtle">
					<motion.div
						className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400"
						initial={{ width: 0 }}
						animate={{ width: `${progressPercent}%` }}
						transition={{ duration: 0.8, ease: "easeOut" }}
					/>
					<motion.div
						className="absolute inset-y-0 bg-gradient-to-r from-emerald-400/0 via-emerald-300/50 to-emerald-400/0"
						style={{ width: "30%" }}
						animate={{ left: ["0%", "100%"] }}
						transition={{
							duration: 1.5,
							repeat: Number.POSITIVE_INFINITY,
							ease: "linear",
						}}
					/>
				</div>

				{/* Steps */}
				<div className="relative p-6 space-y-2">
					{STATUS_STEPS.map((step, idx) => (
						<ProgressStep
							key={step.status}
							step={step}
							index={idx}
							currentIndex={statusIndex}
							audit={audit}
						/>
					))}
				</div>

				{/* Footer status bar */}
				<div className="relative border-t border-border bg-subtle/30 px-6 py-4">
					<div className="flex items-center justify-between text-sm">
						<div className="flex items-center gap-3">
							<WaveformIndicator />
							<span className="text-text-secondary">Processing...</span>
						</div>
						<div className="flex items-center gap-4 text-text-tertiary">
							<span>
								Elapsed: <ElapsedTime startTime={startTime} />
							</span>
						</div>
					</div>
				</div>
			</motion.div>

			{/* Live stats */}
			<AnimatePresence>
				{audit.pagesFound && audit.pagesFound > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="mt-6"
					>
						<p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-3 text-center">
							Live results
						</p>
						<div className="grid grid-cols-3 gap-3">
							<LiveCounter value={audit.pagesFound} label="Pages discovered" />
							<div className="bg-subtle/50 border border-border/50 rounded-lg p-4 text-center backdrop-blur-sm">
								<p className="text-3xl font-bold text-text-tertiary">—</p>
								<p className="text-xs text-text-tertiary mt-1">Opportunities</p>
							</div>
							<div className="bg-subtle/50 border border-border/50 rounded-lg p-4 text-center backdrop-blur-sm">
								<p className="text-3xl font-bold text-text-tertiary">—</p>
								<p className="text-xs text-text-tertiary mt-1">Briefs</p>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Email notice */}
			<motion.p
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.4 }}
				className="text-sm text-text-tertiary mt-8 text-center"
			>
				We&apos;ll email you the full report when it&apos;s ready.
			</motion.p>
		</div>
	);
}
