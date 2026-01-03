"use client";

import { FormNav } from "@/components/form-nav";
import { SlideUp, motion } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingScreen, Spinner } from "@/components/ui/spinner";
import { createCheckout, tierInfo } from "@/lib/api";
import { normalizeUrl } from "@/lib/url";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function CheckForm() {
	const searchParams = useSearchParams();
	const router = useRouter();

	const siteParam = searchParams.get("site") || "";

	const [site, setSite] = useState(siteParam);
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const freeInfo = tierInfo.FREE;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const result = await createCheckout({
				siteUrl: normalizeUrl(site),
				email,
				tier: "FREE",
			});

			// FREE tier returns null checkoutUrl, go directly to audit
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
				<div className="max-w-[600px] mx-auto">
					<SlideUp className="mb-8">
						<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-status-good-bg border border-status-good text-2xs font-semibold uppercase tracking-wider text-status-good mb-4">
							Free
						</div>
						<h1 className="font-display text-3xl font-semibold text-text-primary mb-2">
							Free SEO Health Check
						</h1>
						<p className="text-text-secondary">
							Get a quick overview of your site&apos;s SEO health. No payment
							required.
						</p>
					</SlideUp>

					<SlideUp delay={0.05} className="mb-8">
						<Card>
							<CardContent className="pt-6">
								<p className="text-sm font-medium mb-2">
									What you&apos;ll get:
								</p>
								<ul className="space-y-1">
									{freeInfo.features.map((feature) => (
										<li
											key={feature}
											className="flex items-center gap-2 text-sm text-muted-foreground"
										>
											<span className="text-status-good">✓</span>
											{feature}
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					</SlideUp>

					<form onSubmit={handleSubmit} className="space-y-6">
						<SlideUp delay={0.1}>
							<label
								htmlFor="site"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Website to check
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
								We&apos;ll email you when the report is ready.
							</p>
						</SlideUp>

						{error && (
							<SlideUp>
								<div className="p-4 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
									{error}
								</div>
							</SlideUp>
						)}

						<SlideUp delay={0.2}>
							<motion.button
								type="submit"
								disabled={loading || !canSubmit}
								whileHover={{ scale: 1.01 }}
								whileTap={{ scale: 0.98 }}
								className="w-full h-12 bg-accent text-canvas font-medium rounded transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{loading ? (
									<>
										<Spinner
											size="sm"
											className="border-canvas/30 border-t-canvas"
										/>
										<span>Starting...</span>
									</>
								) : (
									"Run Free Check →"
								)}
							</motion.button>
						</SlideUp>

						<SlideUp delay={0.25}>
							<p className="text-center text-sm text-text-tertiary">
								Want more?{" "}
								<Link href="/analyze" className="text-accent hover:underline">
									Get a full SEO audit
								</Link>
							</p>
						</SlideUp>
					</form>
				</div>
			</main>
		</div>
	);
}

export default function CheckPage() {
	return (
		<Suspense fallback={<LoadingScreen message="Loading..." />}>
			<CheckForm />
		</Suspense>
	);
}
