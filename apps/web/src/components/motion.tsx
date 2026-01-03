"use client";

import { AnimatePresence, type Variants, motion } from "framer-motion";
import type { ReactNode } from "react";

export const fadeIn: Variants = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
};

export const slideUp: Variants = {
	initial: { opacity: 0, y: 12 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -8 },
};

export const slideInLeft: Variants = {
	initial: { opacity: 0, x: -12 },
	animate: { opacity: 1, x: 0 },
	exit: { opacity: 0, x: 12 },
};

export const scaleIn: Variants = {
	initial: { opacity: 0, scale: 0.96 },
	animate: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 0.98 },
};

export const staggerContainer: Variants = {
	initial: {},
	animate: {
		transition: {
			staggerChildren: 0.05,
			delayChildren: 0.1,
		},
	},
};

export const staggerItem: Variants = {
	initial: { opacity: 0, y: 8 },
	animate: { opacity: 1, y: 0 },
};

type PageTransitionProps = {
	children: ReactNode;
	className?: string;
};

export function PageTransition({ children, className }: PageTransitionProps) {
	return (
		<motion.div
			initial="initial"
			animate="animate"
			exit="exit"
			variants={slideUp}
			transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

type FadeInProps = {
	children: ReactNode;
	delay?: number;
	className?: string;
};

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.4, delay, ease: "easeOut" }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

type SlideUpProps = {
	children: ReactNode;
	delay?: number;
	className?: string;
};

export function SlideUp({ children, delay = 0, className }: SlideUpProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

type StaggerListProps = {
	children: ReactNode;
	className?: string;
};

export function StaggerList({ children, className }: StaggerListProps) {
	return (
		<motion.div
			initial="initial"
			animate="animate"
			variants={staggerContainer}
			className={className}
		>
			{children}
		</motion.div>
	);
}

type StaggerItemProps = {
	children: ReactNode;
	className?: string;
};

export function StaggerItem({ children, className }: StaggerItemProps) {
	return (
		<motion.div variants={staggerItem} className={className}>
			{children}
		</motion.div>
	);
}

export function PresenceWrapper({ children }: { children: ReactNode }) {
	return <AnimatePresence mode="wait">{children}</AnimatePresence>;
}

export { motion, AnimatePresence };
