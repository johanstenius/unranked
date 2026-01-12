"use client";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import Link from "next/link";

type SelectionLayoutProps = {
	hostname: string;
	currentStep: 1 | 2;
	crawlProgress?: { pagesFound: number; complete: boolean };
	children: React.ReactNode;
};

const STEP_INFO = {
	1: {
		label: "Choose Competitors",
		description: "Pick sites to analyze against",
	},
	2: {
		label: "Select Topics",
		description: "Choose what to write about",
	},
};

/**
 * Focused layout for interactive selection phases.
 * Centers content with atmospheric design.
 */
export function SelectionLayout({
	hostname,
	currentStep,
	crawlProgress,
	children,
}: SelectionLayoutProps) {
	return (
		<div className="min-h-screen bg-canvas relative overflow-hidden">
			{/* Atmospheric background elements */}
			<div className="absolute inset-0 pointer-events-none">
				{/* Gradient orb top-right */}
				<div className="absolute -top-32 -right-32 w-96 h-96 bg-accent/[0.03] rounded-full blur-3xl" />
				{/* Gradient orb bottom-left */}
				<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-accent-teal/[0.02] rounded-full blur-3xl" />
				{/* Subtle grid pattern */}
				<div
					className="absolute inset-0 opacity-[0.015]"
					style={{
						backgroundImage:
							"radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
						backgroundSize: "32px 32px",
					}}
				/>
			</div>

			{/* Minimal nav */}
			<nav className="h-[60px] bg-canvas/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 relative">
				<div className="max-w-3xl mx-auto px-6 h-full flex items-center justify-between">
					<Link href="/" className="flex items-center gap-2">
						<Logo size={18} />
						<span className="font-display font-semibold text-text-primary">
							Unranked
						</span>
					</Link>
					<ThemeToggle />
				</div>
			</nav>

			{/* Main content - centered, focused */}
			<main className="py-12 px-6 relative">
				<div className="max-w-3xl mx-auto">
					{/* Step progress header */}
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className="mb-10"
					>
						{/* Horizontal step progress */}
						<div className="flex items-center justify-between mb-8">
							<div className="flex items-center gap-4">
								<StepPill step={1} currentStep={currentStep} />
								<motion.div
									className="w-12 h-[2px] rounded-full overflow-hidden bg-border/50"
									initial={false}
								>
									<motion.div
										className="h-full bg-accent"
										initial={{ width: "0%" }}
										animate={{ width: currentStep >= 2 ? "100%" : "0%" }}
										transition={{ duration: 0.4, ease: "easeOut" }}
									/>
								</motion.div>
								<StepPill step={2} currentStep={currentStep} />
							</div>
						</div>

						{/* Site being analyzed - more prominent */}
						<div className="flex items-center gap-4">
							<motion.div
								initial={{ scale: 0.9 }}
								animate={{ scale: 1 }}
								className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center shadow-lg shadow-accent/5"
							>
								<span className="text-accent font-display font-bold text-lg">
									{hostname.charAt(0).toUpperCase()}
								</span>
							</motion.div>
							<div>
								<h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
									{hostname}
								</h1>
								<p className="text-sm text-text-secondary mt-0.5">
									{STEP_INFO[currentStep].description}
								</p>
							</div>
						</div>
					</motion.div>

					{/* Selection content */}
					{children}

					{/* Crawl progress indicator - more prominent card */}
					{crawlProgress && !crawlProgress.complete && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className="mt-10 p-4 rounded-xl bg-surface/50 border border-border/50 backdrop-blur-sm"
						>
							<div className="flex items-center gap-4">
								<div className="relative">
									<motion.div
										className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"
										animate={{ opacity: [0.5, 1, 0.5] }}
										transition={{
											duration: 2,
											repeat: Number.POSITIVE_INFINITY,
											ease: "easeInOut",
										}}
									>
										<svg
											className="w-5 h-5 text-accent"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth={2}
											aria-hidden="true"
										>
											<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
										</svg>
									</motion.div>
									{/* Pulsing ring */}
									<motion.div
										className="absolute inset-0 rounded-lg border-2 border-accent/30"
										animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
										transition={{
											duration: 2,
											repeat: Number.POSITIVE_INFINITY,
											ease: "easeOut",
										}}
									/>
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-text-primary">
										Scanning your site in the background
									</p>
									<p className="text-xs text-text-tertiary mt-0.5">
										{crawlProgress.pagesFound > 0
											? `${crawlProgress.pagesFound} pages discovered so far`
											: "Discovering pages..."}
									</p>
								</div>
								{crawlProgress.pagesFound > 0 && (
									<div className="text-right">
										<span className="text-2xl font-display font-bold text-accent">
											{crawlProgress.pagesFound}
										</span>
										<p className="text-xs text-text-tertiary">pages</p>
									</div>
								)}
							</div>
						</motion.div>
					)}

					{/* Crawl complete indicator */}
					{crawlProgress?.complete && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className="mt-10 p-4 rounded-xl bg-status-good/5 border border-status-good/20"
						>
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-lg bg-status-good/10 flex items-center justify-center">
									<svg
										className="w-5 h-5 text-status-good"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2}
										aria-hidden="true"
									>
										<path d="M5 13l4 4L19 7" />
									</svg>
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-text-primary">
										Site scan complete
									</p>
									<p className="text-xs text-text-tertiary mt-0.5">
										{crawlProgress.pagesFound} pages ready for analysis
									</p>
								</div>
								<div className="text-right">
									<span className="text-2xl font-display font-bold text-status-good">
										{crawlProgress.pagesFound}
									</span>
									<p className="text-xs text-text-tertiary">pages</p>
								</div>
							</div>
						</motion.div>
					)}
				</div>
			</main>
		</div>
	);
}

function StepPill({ step, currentStep }: { step: 1 | 2; currentStep: 1 | 2 }) {
	const isActive = currentStep >= step;
	const isCurrent = currentStep === step;
	const info = STEP_INFO[step];

	return (
		<motion.div
			initial={false}
			animate={{
				scale: isCurrent ? 1 : 0.95,
			}}
			className={`
				flex items-center gap-2.5 px-3 py-2 rounded-full transition-colors
				${isCurrent ? "bg-accent/10 border border-accent/30" : isActive ? "bg-subtle border border-border/50" : "border border-border/30"}
			`}
		>
			<motion.div
				initial={false}
				animate={{
					backgroundColor: isActive ? "var(--accent)" : "var(--bg-subtle)",
				}}
				className={`
					w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
					${isActive ? "text-white" : "text-text-tertiary"}
				`}
			>
				{isActive && step < currentStep ? (
					<svg
						className="w-3.5 h-3.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={3}
						aria-hidden="true"
					>
						<path d="M5 13l4 4L19 7" />
					</svg>
				) : (
					step
				)}
			</motion.div>
			<span
				className={`text-sm font-medium ${isCurrent ? "text-accent" : isActive ? "text-text-primary" : "text-text-tertiary"}`}
			>
				{info.label}
			</span>
		</motion.div>
	);
}
