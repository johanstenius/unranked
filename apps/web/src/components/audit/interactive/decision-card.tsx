"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type DecisionCardProps = {
	title: string;
	subtitle: string;
	icon?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
};

export function DecisionCard({
	title,
	subtitle,
	icon,
	children,
	footer,
	className,
}: DecisionCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, ease: "easeOut" }}
			className={cn(
				"relative rounded-2xl overflow-hidden",
				"bg-gradient-to-b from-zinc-900/90 to-zinc-900/70",
				"border border-zinc-800/50",
				"backdrop-blur-xl",
				className,
			)}
		>
			{/* Animated border glow */}
			<div className="absolute inset-0 rounded-2xl opacity-50">
				<div className="absolute inset-[-1px] rounded-2xl bg-gradient-to-r from-cyan-500/20 via-transparent to-cyan-500/20" />
			</div>

			{/* Grid pattern overlay */}
			<div
				className="absolute inset-0 opacity-[0.02]"
				style={{
					backgroundImage: `
						linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
						linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
					`,
					backgroundSize: "20px 20px",
				}}
			/>

			{/* Content */}
			<div className="relative">
				{/* Header */}
				<div className="px-6 pt-6 pb-4 border-b border-zinc-800/50">
					<div className="flex items-start gap-4">
						{icon && (
							<div className="flex-shrink-0 w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
								{icon}
							</div>
						)}
						<div>
							<h2 className="text-lg font-semibold text-white tracking-tight">
								{title}
							</h2>
							<p className="text-sm text-zinc-400 mt-0.5">{subtitle}</p>
						</div>
					</div>
				</div>

				{/* Body */}
				<div className="px-6 py-4">{children}</div>

				{/* Footer */}
				{footer && (
					<div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/50">
						{footer}
					</div>
				)}
			</div>
		</motion.div>
	);
}

// Selection item component for use inside DecisionCard
type SelectionItemProps = {
	selected: boolean;
	onToggle: () => void;
	disabled?: boolean;
	children: ReactNode;
	badge?: ReactNode;
};

export function SelectionItem({
	selected,
	onToggle,
	disabled,
	children,
	badge,
}: SelectionItemProps) {
	return (
		<motion.button
			type="button"
			onClick={onToggle}
			disabled={disabled}
			whileHover={!disabled ? { scale: 1.01 } : undefined}
			whileTap={!disabled ? { scale: 0.99 } : undefined}
			className={cn(
				"w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200",
				"border",
				selected
					? "bg-cyan-500/10 border-cyan-500/30"
					: "bg-zinc-800/30 border-zinc-700/50 hover:bg-zinc-800/50 hover:border-zinc-600/50",
				disabled && !selected && "opacity-50 cursor-not-allowed",
			)}
		>
			{/* Checkbox */}
			<div
				className={cn(
					"flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
					selected
						? "bg-cyan-500 border-cyan-500"
						: "border-zinc-600 bg-zinc-800/50",
				)}
			>
				{selected && (
					<motion.svg
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
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
					</motion.svg>
				)}
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0">{children}</div>

			{/* Badge */}
			{badge && <div className="flex-shrink-0">{badge}</div>}
		</motion.button>
	);
}

// Counter badge for showing selection limits
type SelectionCounterProps = {
	selected: number;
	max: number;
	label?: string;
};

export function SelectionCounter({
	selected,
	max,
	label = "selected",
}: SelectionCounterProps) {
	const isAtLimit = selected >= max;

	return (
		<div className="flex items-center gap-2">
			<div
				className={cn(
					"px-3 py-1.5 rounded-lg font-mono text-sm",
					"border",
					isAtLimit
						? "bg-amber-500/10 border-amber-500/30 text-amber-400"
						: "bg-zinc-800/50 border-zinc-700/50 text-zinc-300",
				)}
			>
				<span className="font-semibold">{selected}</span>
				<span className="text-zinc-500 mx-1">/</span>
				<span>{max}</span>
			</div>
			<span className="text-xs text-zinc-500">{label}</span>
		</div>
	);
}
