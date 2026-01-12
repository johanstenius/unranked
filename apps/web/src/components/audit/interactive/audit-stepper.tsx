"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type AuditPhase =
	| "discovery"
	| "competitors"
	| "keywords"
	| "clusters"
	| "generating"
	| "complete";

type PhaseConfig = {
	id: AuditPhase;
	label: string;
	shortLabel: string;
};

const PHASES: PhaseConfig[] = [
	{ id: "discovery", label: "Discovering", shortLabel: "Scan" },
	{ id: "competitors", label: "Select Competitors", shortLabel: "Rivals" },
	{ id: "keywords", label: "Analyzing Keywords", shortLabel: "Keywords" },
	{ id: "clusters", label: "Select Topics", shortLabel: "Topics" },
	{ id: "generating", label: "Generating Report", shortLabel: "Build" },
	{ id: "complete", label: "Complete", shortLabel: "Done" },
];

type AuditStepperProps = {
	currentPhase: AuditPhase;
	completedPhases: AuditPhase[];
};

export function AuditStepper({
	currentPhase,
	completedPhases,
}: AuditStepperProps) {
	const currentIndex = PHASES.findIndex((p) => p.id === currentPhase);

	return (
		<div className="w-full py-6">
			{/* Phase labels - desktop */}
			<div className="hidden md:flex justify-between mb-3 px-2">
				{PHASES.map((phase, index) => {
					const isCompleted = completedPhases.includes(phase.id);
					const isCurrent = phase.id === currentPhase;
					const isPending = index > currentIndex;

					return (
						<div
							key={phase.id}
							className={cn(
								"text-xs font-mono uppercase tracking-wider transition-colors duration-300",
								isCompleted && "text-emerald-400",
								isCurrent && "text-cyan-400",
								isPending && "text-zinc-600",
							)}
						>
							{phase.shortLabel}
						</div>
					);
				})}
			</div>

			{/* Progress track */}
			<div className="relative h-1 bg-zinc-800/50 rounded-full overflow-hidden">
				{/* Completed progress */}
				<motion.div
					className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
					initial={{ width: "0%" }}
					animate={{
						width: `${(currentIndex / (PHASES.length - 1)) * 100}%`,
					}}
					transition={{ duration: 0.5, ease: "easeOut" }}
				/>

				{/* Animated pulse on current */}
				{currentPhase !== "complete" && (
					<motion.div
						className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent rounded-full"
						initial={{ left: "0%" }}
						animate={{
							left: `${(currentIndex / (PHASES.length - 1)) * 100}%`,
						}}
						transition={{ duration: 0.5, ease: "easeOut" }}
					>
						<motion.div
							className="absolute inset-0 bg-cyan-400/30 rounded-full"
							animate={{ opacity: [0.3, 0.8, 0.3] }}
							transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
						/>
					</motion.div>
				)}
			</div>

			{/* Phase nodes */}
			<div className="relative flex justify-between -mt-3">
				{PHASES.map((phase, index) => {
					const isCompleted = completedPhases.includes(phase.id);
					const isCurrent = phase.id === currentPhase;
					const isPending = index > currentIndex;

					return (
						<div key={phase.id} className="flex flex-col items-center">
							<motion.div
								className={cn(
									"w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-300",
									isCompleted && "bg-emerald-500 border-emerald-500",
									isCurrent && "bg-zinc-900 border-cyan-400",
									isPending && "bg-zinc-900 border-zinc-700",
								)}
								initial={false}
								animate={
									isCurrent
										? {
												boxShadow: [
													"0 0 0 0 rgba(34, 211, 238, 0)",
													"0 0 0 8px rgba(34, 211, 238, 0.1)",
													"0 0 0 0 rgba(34, 211, 238, 0)",
												],
											}
										: {}
								}
								transition={
									isCurrent
										? { duration: 2, repeat: Number.POSITIVE_INFINITY }
										: {}
								}
							>
								{isCompleted && (
									<svg
										className="w-3 h-3 text-white"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										aria-hidden="true"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={3}
											d="M5 13l4 4L19 7"
										/>
									</svg>
								)}
								{isCurrent && (
									<motion.div
										className="w-2 h-2 bg-cyan-400 rounded-full"
										animate={{ scale: [1, 1.2, 1] }}
										transition={{
											duration: 1,
											repeat: Number.POSITIVE_INFINITY,
										}}
									/>
								)}
							</motion.div>
						</div>
					);
				})}
			</div>

			{/* Current phase label - mobile */}
			<div className="md:hidden text-center mt-4">
				<span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
					Phase {currentIndex + 1}/{PHASES.length}
				</span>
				<p className="text-sm font-medium text-cyan-400 mt-1">
					{PHASES[currentIndex]?.label}
				</p>
			</div>
		</div>
	);
}
