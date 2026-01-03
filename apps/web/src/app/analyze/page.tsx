"use client";

import { FormNav } from "@/components/form-nav";
import { AnimatePresence, SlideUp, motion } from "@/components/motion";
import { Input } from "@/components/ui/input";
import { LoadingScreen, Spinner } from "@/components/ui/spinner";
import type { AuditTier } from "@/lib/api";
import { createCheckout, devStartAudit, tierInfo } from "@/lib/api";
import { normalizeUrl } from "@/lib/url";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useId, useState } from "react";

const TIERS = ["SCAN", "AUDIT", "DEEP_DIVE"] as const;

type CompetitorInput = { id: string; value: string; error?: string };

function ChevronIcon({ open }: { open: boolean }) {
	return (
		<svg
			className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`}
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M9 5l7 7-7 7"
			/>
		</svg>
	);
}

const isDev = process.env.NODE_ENV === "development";

function validateCompetitor(value: string): string | undefined {
	const trimmed = value.trim();
	if (!trimmed) return undefined;

	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		try {
			new URL(trimmed);
			return undefined;
		} catch {
			return "Invalid URL format";
		}
	}

	if (trimmed.includes(".")) {
		return undefined;
	}

	return "Enter full domain (e.g., resend.com)";
}

function AnalyzeForm() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const baseId = useId();

	const siteParam = searchParams.get("site") || "";
	const tierParam = searchParams.get("tier") as AuditTier | null;
	// Only allow paid tiers, default to AUDIT
	const initialTier =
		tierParam && ["SCAN", "AUDIT", "DEEP_DIVE"].includes(tierParam)
			? tierParam
			: "AUDIT";

	const [site, setSite] = useState(siteParam);
	const [tier, setTier] = useState<"SCAN" | "AUDIT" | "DEEP_DIVE">(
		initialTier as "SCAN" | "AUDIT" | "DEEP_DIVE",
	);
	const [email, setEmail] = useState("");
	const [productDesc, setProductDesc] = useState("");
	const [competitors, setCompetitors] = useState<CompetitorInput[]>([
		{ id: `${baseId}-0`, value: "" },
	]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [nextId, setNextId] = useState(1);
	const [showAdvanced, setShowAdvanced] = useState(false);

	const selectedTier = tierInfo[tier];

	function handleAddCompetitor() {
		if (competitors.length < selectedTier.competitors) {
			setCompetitors([
				...competitors,
				{ id: `${baseId}-${nextId}`, value: "" },
			]);
			setNextId(nextId + 1);
		}
	}

	function handleRemoveCompetitor(id: string) {
		setCompetitors(competitors.filter((c) => c.id !== id));
	}

	function handleCompetitorChange(id: string, value: string) {
		const error = validateCompetitor(value);
		setCompetitors(
			competitors.map((c) => (c.id === id ? { ...c, value, error } : c)),
		);
	}

	function getFormData() {
		const validCompetitors = competitors
			.filter((c) => c.value.trim() !== "" && !c.error)
			.map((c) => c.value);
		return {
			siteUrl: normalizeUrl(site),
			email,
			tier,
			productDesc: productDesc || undefined,
			competitors: validCompetitors.length > 0 ? validCompetitors : undefined,
		};
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const result = await createCheckout(getFormData());
			if (result.checkoutUrl) {
				window.location.href = result.checkoutUrl;
			} else {
				// Shouldn't happen for paid tiers, but handle gracefully
				router.push(`/audit/${result.auditId}`);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
			setLoading(false);
		}
	}

	async function handleDevStart() {
		setLoading(true);
		setError(null);

		try {
			const result = await devStartAudit(getFormData());
			router.push(`/audit/${result.auditId}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
			setLoading(false);
		}
	}

	const canSubmit = site.trim() && email.trim();

	return (
		<div className="min-h-screen bg-canvas">
			<FormNav />

			<main className="py-16 px-6">
				<div className="max-w-[560px] mx-auto">
					{/* Header */}
					<SlideUp className="mb-10">
						<h1 className="font-display text-[2.5rem] leading-[1.1] text-text-primary mb-3 font-bold">
							Analyze your content
						</h1>
						<p className="text-text-secondary text-lg">
							We&apos;ll crawl your entire site from sitemap or links.
						</p>
					</SlideUp>

					{/* Form */}
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Website URL */}
						<SlideUp delay={0.05}>
							<label
								htmlFor="site"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Website to analyze
							</label>
							<Input
								id="site"
								type="text"
								required
								value={site}
								onChange={(e) => setSite(e.target.value)}
								placeholder="yourproduct.com"
								className="h-12"
							/>
						</SlideUp>

						{/* Email */}
						<SlideUp delay={0.1}>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Your email (for the report)
							</label>
							<Input
								id="email"
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@company.com"
								className="h-12"
							/>
							<p className="text-xs text-muted-foreground mt-1">
								We&apos;ll send the full report here.
							</p>
						</SlideUp>

						{/* Product Description */}
						<SlideUp delay={0.15}>
							<label
								htmlFor="productDesc"
								className="block text-sm font-medium text-foreground mb-2"
							>
								What does your product do? (1 sentence)
							</label>
							<Input
								id="productDesc"
								type="text"
								value={productDesc}
								onChange={(e) => setProductDesc(e.target.value)}
								placeholder="Developer tool for building APIs"
								className="h-12"
							/>
						</SlideUp>

						{/* Advanced Options (collapsed) */}
						{selectedTier.competitors > 0 && (
							<SlideUp delay={0.2}>
								<button
									type="button"
									onClick={() => setShowAdvanced(!showAdvanced)}
									className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
								>
									<ChevronIcon open={showAdvanced} />
									Advanced options
								</button>
								<AnimatePresence>
									{showAdvanced && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: "auto", opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.2 }}
											className="overflow-hidden"
										>
											<div className="pt-4">
												<p className="text-xs text-muted-foreground mb-3">
													We auto-discover competitors. Add up to{" "}
													{selectedTier.competitors} here if you want.
												</p>
												{competitors.map((comp) => (
													<div key={comp.id} className="mb-2">
														<div className="flex gap-2">
															<Input
																type="text"
																value={comp.value}
																onChange={(e) =>
																	handleCompetitorChange(
																		comp.id,
																		e.target.value,
																	)
																}
																placeholder="competitor.com"
																className={`flex-1 h-12 ${
																	comp.error
																		? "border-destructive focus-visible:ring-destructive"
																		: ""
																}`}
															/>
															{competitors.length > 1 && (
																<button
																	type="button"
																	onClick={() =>
																		handleRemoveCompetitor(comp.id)
																	}
																	className="w-12 h-12 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
																>
																	×
																</button>
															)}
														</div>
														{comp.error && (
															<p className="text-xs text-destructive mt-1">
																{comp.error}
															</p>
														)}
													</div>
												))}
												{competitors.length < selectedTier.competitors && (
													<button
														type="button"
														onClick={handleAddCompetitor}
														className="text-sm text-muted-foreground hover:text-foreground transition-colors"
													>
														+ Add competitor
													</button>
												)}
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</SlideUp>
						)}

						{/* Plan Selection */}
						<SlideUp delay={0.25} className="pt-8 border-t border-border">
							<span className="block text-sm font-medium text-text-primary mb-4">
								Select plan
							</span>
							<div className="grid grid-cols-3 gap-3">
								{TIERS.map((t) => {
									const isSelected = tier === t;
									const isRecommended = t === "AUDIT";
									return (
										<motion.button
											key={t}
											type="button"
											onClick={() => setTier(t)}
											whileHover={{ y: -2 }}
											whileTap={{ scale: 0.98 }}
											className={`relative p-5 rounded-lg transition-all text-left ${
												isSelected
													? "bg-accent text-canvas shadow-md"
													: "bg-surface border border-border hover:border-border-active hover:shadow-sm"
											}`}
										>
											{isRecommended && !isSelected && (
												<span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-accent text-canvas text-2xs font-medium rounded-full">
													Recommended
												</span>
											)}
											<div
												className={`font-medium text-sm mb-1 ${
													isSelected ? "text-canvas" : "text-text-primary"
												}`}
											>
												{tierInfo[t].name}
											</div>
											<div
												className={`font-display text-2xl ${
													isSelected ? "text-canvas" : "text-text-primary"
												}`}
											>
												€{tierInfo[t].price}
											</div>
										</motion.button>
									);
								})}
							</div>
							<motion.p
								key={tier}
								initial={{ opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								className="text-sm text-text-secondary mt-4"
							>
								{selectedTier.pages} pages • {selectedTier.opportunities}{" "}
								opportunities • {selectedTier.briefs} briefs
								{selectedTier.competitors > 0 &&
									` • ${selectedTier.competitors} competitors`}
							</motion.p>
						</SlideUp>

						{/* Error */}
						<AnimatePresence>
							{error && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									className="p-4 bg-status-crit-bg border border-status-crit rounded text-sm text-status-crit"
								>
									{error}
								</motion.div>
							)}
						</AnimatePresence>

						{/* Submit */}
						<SlideUp delay={0.3}>
							<motion.button
								type="submit"
								disabled={loading || !canSubmit}
								whileHover={{ scale: 1.01 }}
								whileTap={{ scale: 0.98 }}
								className="w-full h-14 bg-accent text-canvas text-base font-medium rounded-lg transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
							>
								{loading ? (
									<>
										<Spinner
											size="sm"
											className="border-canvas/30 border-t-canvas"
										/>
										<span>Processing...</span>
									</>
								) : (
									<>
										Start Analysis
										<span className="opacity-70">→</span>
									</>
								)}
							</motion.button>
						</SlideUp>

						<SlideUp delay={0.35}>
							<p className="text-center text-sm text-text-tertiary">
								Just want a quick check?{" "}
								<Link href="/check" className="text-accent hover:underline">
									Try free health check
								</Link>
							</p>
						</SlideUp>

						{/* Dev Skip */}
						{isDev && (
							<button
								type="button"
								onClick={handleDevStart}
								disabled={loading || !canSubmit}
								className="w-full h-10 bg-subtle border border-border text-text-secondary text-sm rounded hover:bg-surface hover:border-border-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Dev: Skip Payment
							</button>
						)}
					</form>
				</div>
			</main>
		</div>
	);
}

export default function AnalyzePage() {
	return (
		<Suspense fallback={<LoadingScreen message="Loading..." />}>
			<AnalyzeForm />
		</Suspense>
	);
}
