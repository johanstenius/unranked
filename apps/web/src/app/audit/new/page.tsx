"use client";

import { FormNav } from "@/components/form-nav";
import { AnimatePresence, SlideUp, motion } from "@/components/motion";
import { Input } from "@/components/ui/input";
import { LoadingScreen, Spinner } from "@/components/ui/spinner";
import {
	createCheckout,
	devStartAudit,
	tierInfo,
	validateUrl,
} from "@/lib/api";
import { billingEnabled } from "@/lib/config";
import type { AuditTier } from "@/lib/types";
import { normalizeUrl } from "@/lib/url";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useId, useState } from "react";

const TIERS: AuditTier[] = ["FREE", "SCAN", "AUDIT", "DEEP_DIVE"];

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

	return "Enter full domain (e.g., competitor.com)";
}

function AuditNewForm() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const baseId = useId();

	const siteParam = searchParams.get("site") || "";
	const tierParam = searchParams.get("tier") as AuditTier | null;
	const initialTier =
		tierParam && TIERS.includes(tierParam) ? tierParam : "AUDIT";

	const [site, setSite] = useState(siteParam);
	const [tier, setTier] = useState<AuditTier>(initialTier);
	const [email, setEmail] = useState("");
	const [productDesc, setProductDesc] = useState("");
	const [competitors, setCompetitors] = useState<CompetitorInput[]>([
		{ id: `${baseId}-0`, value: "" },
	]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [nextId, setNextId] = useState(1);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [siteError, setSiteError] = useState<string | null>(null);
	const [validatingSite, setValidatingSite] = useState(false);
	const [siteValidated, setSiteValidated] = useState(false);

	const selectedTier = tierInfo[tier];
	const isPaid = tier !== "FREE";
	const hasCompetitors = selectedTier.competitors > 0;

	const handleSiteBlur = useCallback(async () => {
		const trimmed = site.trim();
		if (!trimmed) {
			setSiteError(null);
			setSiteValidated(false);
			return;
		}

		setValidatingSite(true);
		setSiteError(null);
		setSiteValidated(false);

		try {
			const result = await validateUrl(normalizeUrl(trimmed));
			if (!result.valid) {
				setSiteError(result.error ?? "Site unreachable");
			} else {
				setSiteValidated(true);
			}
		} catch {
			setSiteError("Failed to validate URL");
		} finally {
			setValidatingSite(false);
		}
	}, [site]);

	function handleSiteChange(value: string) {
		setSite(value);
		setSiteValidated(false);
		setSiteError(null);
	}

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
			productDesc: isPaid && productDesc ? productDesc : undefined,
			competitors: validCompetitors.length > 0 ? validCompetitors : undefined,
		};
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);

		if (!siteValidated) {
			try {
				const result = await validateUrl(normalizeUrl(site.trim()));
				if (!result.valid) {
					setSiteError(result.error ?? "Site unreachable");
					setLoading(false);
					return;
				}
				setSiteValidated(true);
			} catch {
				setSiteError("Failed to validate URL");
				setLoading(false);
				return;
			}
		}

		try {
			const result = await createCheckout(getFormData());
			if (result.checkoutUrl) {
				window.location.href = result.checkoutUrl;
			} else {
				router.push(`/audit/${result.accessToken}`);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
			setLoading(false);
		}
	}

	async function handleDevStart() {
		setLoading(true);
		setError(null);

		if (!siteValidated) {
			try {
				const result = await validateUrl(normalizeUrl(site.trim()));
				if (!result.valid) {
					setSiteError(result.error ?? "Site unreachable");
					setLoading(false);
					return;
				}
				setSiteValidated(true);
			} catch {
				setSiteError("Failed to validate URL");
				setLoading(false);
				return;
			}
		}

		try {
			const result = await devStartAudit(getFormData());
			router.push(`/audit/${result.accessToken}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
			setLoading(false);
		}
	}

	const canSubmit =
		site.trim() && email.trim() && !siteError && !validatingSite;

	// Build feature summary for selected tier
	function getFeatureSummary() {
		const parts: string[] = [];
		parts.push(`${selectedTier.pages} pages`);

		// FREE tier: emphasize it's technical only
		if (tier === "FREE") {
			parts.push("technical issues");
			parts.push("internal links");
			return parts;
		}

		// Paid tiers: show what's included
		if (selectedTier.opportunities === "all") {
			parts.push("all opportunities");
		} else if (
			typeof selectedTier.opportunities === "number" &&
			selectedTier.opportunities > 0
		) {
			parts.push(`${selectedTier.opportunities} opportunities`);
		}
		if (selectedTier.briefs === "unlimited") {
			parts.push("unlimited briefs");
		} else if (
			typeof selectedTier.briefs === "number" &&
			selectedTier.briefs > 0
		) {
			parts.push(
				`${selectedTier.briefs} brief${selectedTier.briefs > 1 ? "s" : ""}`,
			);
		}
		if (selectedTier.competitors > 0) {
			parts.push(
				`${selectedTier.competitors} competitor${selectedTier.competitors > 1 ? "s" : ""}`,
			);
		}
		return parts;
	}

	// If billing disabled and paid tier selected, show coming soon
	if (!billingEnabled && isPaid) {
		return (
			<div className="min-h-screen bg-canvas">
				<FormNav />
				<main className="py-16 px-6">
					<div className="max-w-[560px] mx-auto text-center">
						<SlideUp className="mb-10">
							<div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full mb-6">
								Coming Soon
							</div>
							<h1 className="font-display text-[2.5rem] leading-[1.1] text-text-primary mb-3 font-bold">
								Paid audits launching soon
							</h1>
							<p className="text-text-secondary text-lg mb-8">
								Paid audit plans are coming soon. Try a free check in the
								meantime.
							</p>
							<button
								type="button"
								onClick={() => setTier("FREE")}
								className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-canvas rounded-lg font-medium hover:bg-accent-hover transition-colors"
							>
								Try Free Check
							</button>
						</SlideUp>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-canvas">
			<FormNav />

			<main className="py-16 px-6">
				<div className="max-w-[560px] mx-auto">
					{/* Header */}
					<SlideUp className="mb-10">
						<h1 className="font-display text-[2.5rem] leading-[1.1] text-text-primary mb-3 font-bold">
							Start your SEO audit
						</h1>
						<p className="text-text-secondary text-lg">
							We&apos;ll crawl your site and find opportunities to rank higher.
						</p>
					</SlideUp>

					{/* Tier Selection */}
					<SlideUp delay={0.05} className="mb-8">
						<span className="block text-sm font-medium text-text-primary mb-3">
							Choose your plan
						</span>
						<div className="grid grid-cols-4 gap-2">
							{TIERS.map((t) => {
								const isSelected = tier === t;
								const isRecommended = t === "AUDIT";
								const info = tierInfo[t];
								return (
									<motion.button
										key={t}
										type="button"
										onClick={() => setTier(t)}
										whileHover={{ y: -2 }}
										whileTap={{ scale: 0.98 }}
										className={`relative p-4 rounded-lg transition-all text-left ${
											isSelected
												? "bg-accent text-canvas shadow-md"
												: "bg-surface border border-border hover:border-border-active hover:shadow-sm"
										}`}
									>
										{isRecommended && !isSelected && (
											<span className="absolute -top-2 left-2 px-1.5 py-0.5 bg-accent text-canvas text-2xs font-medium rounded-full">
												Best
											</span>
										)}
										<div
											className={`text-xs mb-1 ${
												isSelected ? "text-canvas/80" : "text-text-secondary"
											}`}
										>
											{info.name}
										</div>
										<div
											className={`font-display text-xl font-semibold ${
												isSelected ? "text-canvas" : "text-text-primary"
											}`}
										>
											{info.price === 0 ? "Free" : `€${info.price}`}
										</div>
									</motion.button>
								);
							})}
						</div>
						<motion.div
							key={tier}
							initial={{ opacity: 0, y: -4 }}
							animate={{ opacity: 1, y: 0 }}
							className="flex flex-wrap gap-2 mt-3"
						>
							{getFeatureSummary().map((feature) => (
								<span
									key={feature}
									className="inline-flex items-center gap-1 text-xs text-text-secondary"
								>
									<span className="text-status-good">✓</span>
									{feature}
								</span>
							))}
						</motion.div>
					</SlideUp>

					{/* Form */}
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Website URL */}
						<SlideUp delay={0.1}>
							<label
								htmlFor="site"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Website to audit
							</label>
							<div className="relative">
								<Input
									id="site"
									type="text"
									required
									value={site}
									onChange={(e) => handleSiteChange(e.target.value)}
									onBlur={handleSiteBlur}
									placeholder="yoursite.com"
									className={`h-12 ${siteError ? "border-destructive focus-visible:ring-destructive" : ""}`}
								/>
								{validatingSite && (
									<div className="absolute right-3 top-1/2 -translate-y-1/2">
										<Spinner size="sm" />
									</div>
								)}
								{siteValidated && !validatingSite && (
									<div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
										<svg
											className="w-5 h-5"
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
								)}
							</div>
							{siteError && (
								<p className="text-xs text-destructive mt-1">{siteError}</p>
							)}
						</SlideUp>

						{/* Email */}
						<SlideUp delay={0.15}>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Your email
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
								We&apos;ll send your report here.
							</p>
						</SlideUp>

						{/* Product Description - paid tiers only */}
						<AnimatePresence>
							{isPaid && (
								<motion.div
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: "auto", opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									transition={{ duration: 0.2 }}
									className="overflow-hidden"
								>
									<SlideUp delay={0.2}>
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
								</motion.div>
							)}
						</AnimatePresence>

						{/* Competitors - AUDIT/DEEP_DIVE only */}
						<AnimatePresence>
							{hasCompetitors && (
								<motion.div
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: "auto", opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									transition={{ duration: 0.2 }}
									className="overflow-hidden"
								>
									<SlideUp delay={0.25}>
										<button
											type="button"
											onClick={() => setShowAdvanced(!showAdvanced)}
											className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
										>
											<ChevronIcon open={showAdvanced} />
											Add competitors (optional)
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
								</motion.div>
							)}
						</AnimatePresence>

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
								) : tier === "FREE" ? (
									"Run Technical Check →"
								) : (
									<>
										Start Analysis
										<span className="opacity-70">€{selectedTier.price} →</span>
									</>
								)}
							</motion.button>
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

export default function AuditNewPage() {
	return (
		<Suspense fallback={<LoadingScreen message="Loading..." />}>
			<AuditNewForm />
		</Suspense>
	);
}
