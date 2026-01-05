"use client";

import { motion } from "@/components/motion";
import { Spinner } from "@/components/ui/spinner";
import { createUpgradeCheckout, tierInfo } from "@/lib/api";
import { billingEnabled } from "@/lib/config";
import type { Analysis } from "@/lib/types";
import { useState } from "react";

type UpgradeBannerProps = {
	auditToken: string;
	analysis: Analysis | null;
};

export function UpgradeBanner({ auditToken, analysis }: UpgradeBannerProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const opportunitiesCount = analysis?.opportunities.length ?? 0;
	const freeLimit = tierInfo.FREE.opportunities;
	const hiddenOpportunities =
		typeof freeLimit === "number"
			? Math.max(0, opportunitiesCount - freeLimit)
			: 0;

	async function handleUpgrade(tier: "SCAN" | "AUDIT" | "DEEP_DIVE") {
		setLoading(true);
		setError(null);

		try {
			const result = await createUpgradeCheckout(auditToken, tier);
			window.location.href = result.checkoutUrl;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
			setLoading(false);
		}
	}

	return (
		<div className="mb-8 p-6 bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 rounded-lg">
			<div className="flex items-start justify-between gap-6">
				<div>
					<h3 className="font-display text-lg font-semibold text-text-primary mb-2">
						{billingEnabled
							? "Unlock the full report"
							: "Full audits coming soon"}
					</h3>
					<p className="text-text-secondary text-sm mb-4 max-w-[500px]">
						You&apos;re viewing a free health check.{" "}
						{hiddenOpportunities > 0 && (
							<>
								There are{" "}
								<strong>{hiddenOpportunities} more opportunities</strong>{" "}
								waiting for you.{" "}
							</>
						)}
						{billingEnabled
							? "Upgrade to get keyword opportunities, AI content briefs, and competitor analysis."
							: "Paid plans coming soon."}
					</p>

					{error && <p className="text-sm text-status-crit mb-4">{error}</p>}

					{billingEnabled ? (
						<div className="flex gap-3">
							<motion.button
								type="button"
								onClick={() => handleUpgrade("AUDIT")}
								disabled={loading}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="h-10 px-5 bg-accent text-canvas text-sm font-medium rounded hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
									<>Upgrade to Audit — ${tierInfo.AUDIT.price}</>
								)}
							</motion.button>

							<motion.button
								type="button"
								onClick={() => handleUpgrade("SCAN")}
								disabled={loading}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="h-10 px-4 bg-surface border border-border-active text-sm font-medium text-text-primary rounded hover:border-border-focus hover:bg-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Scan — ${tierInfo.SCAN.price}
							</motion.button>
						</div>
					) : (
						<div className="flex gap-3">
							<div className="h-10 px-5 bg-accent/50 text-canvas text-sm font-medium rounded opacity-50 cursor-not-allowed flex items-center">
								Coming Soon
							</div>
						</div>
					)}
				</div>

				<div className="hidden md:block text-right">
					<div className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
						What you&apos;ll get
					</div>
					<ul className="text-sm text-text-secondary space-y-1">
						<li className="flex items-center gap-2 justify-end">
							<span>All keyword opportunities</span>
							<span className="text-accent">✓</span>
						</li>
						<li className="flex items-center gap-2 justify-end">
							<span>AI content briefs</span>
							<span className="text-accent">✓</span>
						</li>
						<li className="flex items-center gap-2 justify-end">
							<span>Competitor analysis</span>
							<span className="text-accent">✓</span>
						</li>
						<li className="flex items-center gap-2 justify-end">
							<span>PDF export</span>
							<span className="text-accent">✓</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
