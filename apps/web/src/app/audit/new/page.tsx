"use client";

import { FormNav } from "@/components/form-nav";
import { AnimatePresence, SlideUp, motion } from "@/components/motion";
import { Input } from "@/components/ui/input";
import { LoadingScreen, Spinner } from "@/components/ui/spinner";
import { TIERS, createCheckout, devStartAudit, validateUrl } from "@/lib/api";
import { billingEnabled } from "@/lib/config";
import type { AuditTier } from "@/lib/types";
import { normalizeUrl } from "@/lib/url";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

const TIER_OPTIONS: AuditTier[] = ["FREE", "SCAN", "AUDIT", "DEEP_DIVE"];

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

function AuditNewForm() {
	const searchParams = useSearchParams();
	const router = useRouter();

	const siteParam = searchParams.get("site") || "";
	const tierParam = searchParams.get("tier") as AuditTier | null;
	const initialTier =
		tierParam && TIER_OPTIONS.includes(tierParam) ? tierParam : "AUDIT";

	const [site, setSite] = useState(siteParam);
	const [tier, setTier] = useState<AuditTier>(initialTier);
	const [email, setEmail] = useState("");
	const [productDesc, setProductDesc] = useState("");
	const [extractedDesc, setExtractedDesc] = useState<string | null>(null);
	const [seedKeywords, setSeedKeywords] = useState<string[]>([]);
	const [targetKeywords, setTargetKeywords] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [siteError, setSiteError] = useState<string | null>(null);
	const [validatingSite, setValidatingSite] = useState(false);
	const [siteValidated, setSiteValidated] = useState(false);

	const selectedTier = TIERS[tier];
	const isPaid = tier !== "FREE";

	const handleSiteBlur = useCallback(async () => {
		const trimmed = site.trim();
		if (!trimmed) {
			setSiteError(null);
			setSiteValidated(false);
			setExtractedDesc(null);
			setSeedKeywords([]);
			return;
		}

		setValidatingSite(true);
		setSiteError(null);
		setSiteValidated(false);

		try {
			const result = await validateUrl(normalizeUrl(trimmed));
			if (!result.valid) {
				setSiteError(result.error ?? "Site unreachable");
				setExtractedDesc(null);
				setSeedKeywords([]);
			} else {
				setSiteValidated(true);
				// Store extracted info
				if (result.productDescription) {
					setExtractedDesc(result.productDescription);
					// Auto-fill if user hasn't edited
					if (!productDesc) {
						setProductDesc(result.productDescription);
					}
				}
				if (result.seedKeywords) {
					setSeedKeywords(result.seedKeywords);
				}
			}
		} catch {
			setSiteError("Failed to validate URL");
		} finally {
			setValidatingSite(false);
		}
	}, [site, productDesc]);

	function handleSiteChange(value: string) {
		setSite(value);
		setSiteValidated(false);
		setSiteError(null);
		setExtractedDesc(null);
		setSeedKeywords([]);
	}

	function getFormData() {
		// seedKeywords now contains both auto-detected and user-added keywords
		const keywords = seedKeywords.slice(0, 10);

		return {
			siteUrl: normalizeUrl(site),
			email,
			tier,
			productDesc: isPaid && productDesc ? productDesc : undefined,
			targetKeywords: keywords.length > 0 ? keywords : undefined,
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
				// Store extracted info if available
				if (result.productDescription && !productDesc) {
					setProductDesc(result.productDescription);
				}
				if (result.seedKeywords) {
					setSeedKeywords(result.seedKeywords);
				}
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
				// Store extracted info if available
				if (result.productDescription && !productDesc) {
					setProductDesc(result.productDescription);
				}
				if (result.seedKeywords) {
					setSeedKeywords(result.seedKeywords);
				}
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
	// Returns array of { text: string, note?: string }
	function getFeatureSummary(): Array<{ text: string; note?: string }> {
		const parts: Array<{ text: string; note?: string }> = [];
		const limits = selectedTier.limits;
		parts.push({ text: `${limits.pages} pages` });

		// FREE tier: emphasize it's technical only
		if (tier === "FREE") {
			parts.push({ text: "technical issues" });
			parts.push({ text: "internal links" });
			parts.push({ text: "AI readiness" });
			return parts;
		}

		// Paid tiers: show what's included
		parts.push({ text: "all opportunities" });

		// Briefs: -1 means unlimited
		if (limits.briefs === -1) {
			parts.push({ text: "unlimited briefs" });
		} else if (limits.briefs > 0) {
			parts.push({
				text: `${limits.briefs} brief${limits.briefs > 1 ? "s" : ""}`,
			});
		}
		if (limits.competitors > 0) {
			parts.push({
				text: `${limits.competitors} competitor${limits.competitors > 1 ? "s" : ""}`,
			});
		}
		// Add note about ranking-dependent features
		parts.push({
			text: "quick wins",
			note: "with rankings",
		});
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
							{TIER_OPTIONS.map((t) => {
								const isSelected = tier === t;
								const isRecommended = t === "AUDIT";
								const info = TIERS[t];
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
									key={feature.text}
									className="inline-flex items-center gap-1 text-xs text-text-secondary"
								>
									<span className="text-status-good">✓</span>
									{feature.text}
									{feature.note && (
										<span className="text-text-tertiary text-2xs">
											({feature.note})
										</span>
									)}
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

						{/* Product Description - paid tiers only, auto-filled from URL */}
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
											What does your product do?
											{extractedDesc && (
												<span className="ml-2 text-xs font-normal text-status-good">
													Auto-detected
												</span>
											)}
										</label>
										<Input
											id="productDesc"
											type="text"
											value={productDesc}
											onChange={(e) => setProductDesc(e.target.value)}
											placeholder={
												validatingSite
													? "Reading your site..."
													: "Developer tool for building APIs"
											}
											className="h-12"
										/>
										{extractedDesc && productDesc !== extractedDesc && (
											<button
												type="button"
												onClick={() => setProductDesc(extractedDesc)}
												className="text-xs text-text-secondary hover:text-text-primary mt-1"
											>
												Reset to auto-detected
											</button>
										)}
									</SlideUp>
								</motion.div>
							)}
						</AnimatePresence>

						{/* Advanced: Target Keywords - for paid tiers */}
						<AnimatePresence>
							{isPaid && (
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
											<span>Target keywords</span>
											{!showAdvanced &&
												(validatingSite ? (
													<span className="flex items-center gap-1.5 text-xs text-text-tertiary">
														<span className="inline-block w-3 h-3 border-2 border-text-tertiary/30 border-t-text-tertiary rounded-full animate-spin" />
														detecting...
													</span>
												) : seedKeywords.length > 0 ? (
													<span className="text-xs text-status-good">
														{seedKeywords.length} detected
													</span>
												) : null)}
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
													<div className="pt-4 space-y-3">
														{/* Loading skeleton */}
														{validatingSite && seedKeywords.length === 0 && (
															<div className="space-y-2">
																<p className="text-xs text-text-tertiary">
																	Reading your site for keywords...
																</p>
																<div className="flex flex-wrap gap-2">
																	{[1, 2, 3, 4].map((i) => (
																		<div
																			key={i}
																			className="h-7 rounded-md bg-surface animate-pulse"
																			style={{
																				width: `${60 + i * 20}px`,
																				animationDelay: `${i * 100}ms`,
																			}}
																		/>
																	))}
																</div>
															</div>
														)}

														{/* Detected keywords as tags */}
														{seedKeywords.length > 0 && (
															<div className="space-y-2">
																<p className="text-xs text-text-secondary">
																	We found these keywords on your site:
																</p>
																<div className="flex flex-wrap gap-1.5">
																	<AnimatePresence mode="popLayout">
																		{seedKeywords.map((kw, idx) => (
																			<motion.span
																				key={kw}
																				initial={{ opacity: 0, scale: 0.8 }}
																				animate={{ opacity: 1, scale: 1 }}
																				exit={{ opacity: 0, scale: 0.8 }}
																				transition={{
																					delay: idx * 0.03,
																					duration: 0.15,
																				}}
																				className="group inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-surface border border-border rounded-md text-text-primary hover:border-border-active transition-colors"
																			>
																				{kw}
																				<button
																					type="button"
																					onClick={() =>
																						setSeedKeywords(
																							seedKeywords.filter(
																								(k) => k !== kw,
																							),
																						)
																					}
																					className="opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-text-primary -mr-0.5"
																					aria-label={`Remove ${kw}`}
																				>
																					<svg
																						className="w-3.5 h-3.5"
																						fill="none"
																						viewBox="0 0 24 24"
																						stroke="currentColor"
																						aria-hidden="true"
																					>
																						<path
																							strokeLinecap="round"
																							strokeLinejoin="round"
																							strokeWidth={2}
																							d="M6 18L18 6M6 6l12 12"
																						/>
																					</svg>
																				</button>
																			</motion.span>
																		))}
																	</AnimatePresence>
																</div>
															</div>
														)}

														{/* Add custom keywords */}
														<div className="space-y-1.5">
															{seedKeywords.length > 0 ? (
																<p className="text-xs text-text-tertiary">
																	Add more keywords:
																</p>
															) : !validatingSite ? (
																<p className="text-xs text-text-secondary">
																	Enter keywords you want to rank for:
																</p>
															) : null}
															{!validatingSite && (
																<Input
																	id="targetKeywords"
																	type="text"
																	value={targetKeywords}
																	onChange={(e) =>
																		setTargetKeywords(e.target.value)
																	}
																	onKeyDown={(e) => {
																		if (e.key === "Enter" || e.key === ",") {
																			e.preventDefault();
																			const newKw = targetKeywords.trim();
																			if (
																				newKw &&
																				!seedKeywords.includes(newKw)
																			) {
																				setSeedKeywords([
																					...seedKeywords,
																					newKw,
																				]);
																				setTargetKeywords("");
																			}
																		}
																	}}
																	placeholder="Type and press Enter to add"
																	className="h-10 text-sm"
																/>
															)}
														</div>
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
