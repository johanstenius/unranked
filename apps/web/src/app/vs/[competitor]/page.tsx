import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
	competitorSlugs,
	getCompetitor,
} from "@/content/comparisons/competitors";
import { tierInfo } from "@/lib/config";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";

type Props = {
	params: Promise<{ competitor: string }>;
};

export async function generateStaticParams() {
	return competitorSlugs.map((slug) => ({ competitor: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { competitor: slug } = await params;
	const competitor = getCompetitor(slug);

	if (!competitor) {
		return { title: "Comparison Not Found" };
	}

	const title = `Unranked vs ${competitor.name} - SEO Tool Comparison`;
	const description = `Compare Unranked and ${competitor.name}. See pricing, features, and which SEO tool is right for your needs. Objective comparison with no bias.`;

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			type: "website",
		},
		alternates: {
			canonical: `https://unranked.io/vs/${slug}`,
		},
	};
}

function CheckIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className || "w-5 h-5 text-status-good"}
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			strokeWidth={2}
			aria-hidden="true"
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
		</svg>
	);
}

function XIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className || "w-5 h-5 text-text-tertiary"}
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			strokeWidth={2}
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M6 18L18 6M6 6l12 12"
			/>
		</svg>
	);
}

function FeatureValue({ value }: { value: string | boolean }) {
	if (value === true) {
		return <CheckIcon />;
	}
	if (value === false) {
		return <XIcon />;
	}
	return <span className="text-sm text-text-secondary">{value}</span>;
}

export default async function ComparisonPage({ params }: Props) {
	const { competitor: slug } = await params;
	const competitor = getCompetitor(slug);

	if (!competitor) {
		notFound();
	}

	const unrankedPrice = `€${tierInfo.AUDIT.price}`;

	// Schema markup for comparison
	const comparisonSchema = {
		"@context": "https://schema.org",
		"@type": "WebPage",
		name: `Unranked vs ${competitor.name}`,
		description: `Objective comparison between Unranked and ${competitor.name} SEO tools.`,
		mainEntity: {
			"@type": "ItemList",
			itemListElement: [
				{
					"@type": "Product",
					name: "Unranked",
					description:
						"SEO audit tool with keyword opportunities and AI content briefs",
					offers: {
						"@type": "Offer",
						price: tierInfo.AUDIT.price,
						priceCurrency: "EUR",
						priceSpecification: {
							"@type": "UnitPriceSpecification",
							price: tierInfo.AUDIT.price,
							priceCurrency: "EUR",
							unitText: "one-time",
						},
					},
				},
				{
					"@type": "Product",
					name: competitor.name,
					description: competitor.description,
					url: competitor.website,
				},
			],
		},
	};

	return (
		<>
			<Script
				id="comparison-schema"
				type="application/ld+json"
				strategy="beforeInteractive"
			>
				{JSON.stringify(comparisonSchema)}
			</Script>

			<div className="min-h-screen bg-canvas">
				{/* Navigation */}
				<nav className="h-[60px] sticky top-0 bg-canvas/80 backdrop-blur-md border-b border-border z-50">
					<div className="max-w-[1100px] mx-auto px-6 h-full flex items-center justify-between">
						<Link href="/" className="flex items-center gap-2">
							<Logo size={18} />
							<span className="font-display font-semibold text-text-primary">
								Unranked
							</span>
						</Link>
						<div className="flex items-center gap-4">
							<ThemeToggle />
							<Link
								href="/audit/new"
								className="h-9 px-4 bg-accent text-canvas text-sm font-medium rounded transition-colors hover:bg-accent-hover inline-flex items-center"
							>
								Start Audit
							</Link>
						</div>
					</div>
				</nav>

				<main className="py-16 px-6">
					<div className="max-w-[900px] mx-auto">
						{/* Header */}
						<div className="text-center mb-16">
							<p className="text-sm text-text-secondary mb-4">
								SEO Tool Comparison
							</p>
							<h1 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
								Unranked vs {competitor.name}
							</h1>
							<p className="text-lg text-text-secondary max-w-[600px] mx-auto">
								An objective comparison to help you choose the right SEO tool
								for your needs.
							</p>
						</div>

						{/* Quick Comparison Cards */}
						<div className="grid md:grid-cols-2 gap-6 mb-16">
							{/* Unranked Card */}
							<div className="p-6 bg-surface border-2 border-accent rounded-xl">
								<div className="flex items-center gap-3 mb-4">
									<Logo size={24} />
									<span className="font-display font-semibold text-xl text-text-primary">
										Unranked
									</span>
								</div>
								<div className="mb-4">
									<span className="text-3xl font-bold text-text-primary">
										{unrankedPrice}
									</span>
									<span className="text-text-secondary ml-2">one-time</span>
								</div>
								<p className="text-sm text-text-secondary mb-4">
									SEO audit tool that finds keyword opportunities and generates
									AI content briefs. Pay once, keep your report forever.
								</p>
								<ul className="space-y-2">
									{[
										"One-time purchase",
										"Keyword opportunity discovery",
										"AI-generated content briefs",
										"Technical SEO audit",
										"Competitor gap analysis",
									].map((item) => (
										<li
											key={item}
											className="flex items-center gap-2 text-sm text-text-secondary"
										>
											<CheckIcon className="w-4 h-4 text-status-good flex-shrink-0" />
											{item}
										</li>
									))}
								</ul>
							</div>

							{/* Competitor Card */}
							<div className="p-6 bg-surface border border-border rounded-xl">
								<div className="flex items-center gap-3 mb-4">
									<div className="w-6 h-6 bg-subtle rounded flex items-center justify-center text-xs font-bold text-text-secondary">
										{competitor.name[0]}
									</div>
									<span className="font-display font-semibold text-xl text-text-primary">
										{competitor.name}
									</span>
								</div>
								<div className="mb-4">
									<span className="text-3xl font-bold text-text-primary">
										{competitor.startingPrice}
									</span>
									<span className="text-text-secondary ml-2">
										{competitor.pricingModel === "subscription"
											? "subscription"
											: competitor.pricingModel}
									</span>
								</div>
								<p className="text-sm text-text-secondary mb-4">
									{competitor.description}
								</p>
								<p className="text-xs text-text-tertiary mb-4">
									{competitor.priceNote}
								</p>
								<div className="text-sm text-text-secondary">
									<span className="font-medium">Best for:</span>
									<ul className="mt-2 space-y-1">
										{competitor.bestFor.slice(0, 4).map((item) => (
											<li key={item} className="flex items-center gap-2">
												<span className="w-1 h-1 bg-text-tertiary rounded-full" />
												{item}
											</li>
										))}
									</ul>
								</div>
							</div>
						</div>

						{/* Feature Comparison Table */}
						<div className="mb-16">
							<h2 className="font-display text-2xl font-bold text-text-primary mb-6">
								Feature Comparison
							</h2>
							<div className="border border-border rounded-xl overflow-hidden">
								<table className="w-full">
									<thead>
										<tr className="bg-subtle">
											<th className="text-left py-4 px-6 text-sm font-medium text-text-primary">
												Feature
											</th>
											<th className="text-center py-4 px-6 text-sm font-medium text-text-primary w-[140px]">
												Unranked
											</th>
											<th className="text-center py-4 px-6 text-sm font-medium text-text-primary w-[140px]">
												{competitor.name}
											</th>
										</tr>
									</thead>
									<tbody>
										{competitor.features.map((feature, index) => (
											<tr
												key={feature.name}
												className={
													index % 2 === 0 ? "bg-surface" : "bg-subtle/50"
												}
											>
												<td className="py-4 px-6 text-sm text-text-primary">
													{feature.name}
												</td>
												<td className="py-4 px-6 text-center">
													<div className="flex justify-center">
														<FeatureValue value={feature.unranked} />
													</div>
												</td>
												<td className="py-4 px-6 text-center">
													<div className="flex justify-center">
														<FeatureValue value={feature.competitor} />
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						{/* Key Differences */}
						<div className="mb-16">
							<h2 className="font-display text-2xl font-bold text-text-primary mb-6">
								Key Differences
							</h2>
							<div className="bg-subtle/50 border border-border rounded-xl p-6">
								<ul className="space-y-4">
									{competitor.differentiators.map((diff) => (
										<li key={diff} className="flex gap-3">
											<span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
											<span className="text-text-secondary">{diff}</span>
										</li>
									))}
								</ul>
							</div>
						</div>

						{/* When to Choose */}
						<div className="grid md:grid-cols-2 gap-6 mb-16">
							<div className="p-6 bg-surface border border-border rounded-xl">
								<h3 className="font-display text-lg font-semibold text-text-primary mb-4">
									Choose Unranked if you want:
								</h3>
								<ul className="space-y-3">
									{[
										"A one-time purchase with no recurring fees",
										"Actionable keyword opportunities, not just data",
										"AI-generated content briefs ready to use",
										"A focused audit without feature overwhelm",
									].map((item) => (
										<li
											key={item}
											className="flex items-start gap-2 text-sm text-text-secondary"
										>
											<CheckIcon className="w-4 h-4 text-status-good flex-shrink-0 mt-0.5" />
											{item}
										</li>
									))}
								</ul>
							</div>

							<div className="p-6 bg-surface border border-border rounded-xl">
								<h3 className="font-display text-lg font-semibold text-text-primary mb-4">
									Choose {competitor.name} if you need:
								</h3>
								<ul className="space-y-3">
									{competitor.bestFor.map((item) => (
										<li
											key={item}
											className="flex items-start gap-2 text-sm text-text-secondary"
										>
											<span className="w-1.5 h-1.5 bg-text-tertiary rounded-full mt-2 flex-shrink-0" />
											{item}
										</li>
									))}
								</ul>
							</div>
						</div>

						{/* CTA */}
						<div className="text-center p-8 bg-accent/5 border border-accent/20 rounded-xl">
							<h2 className="font-display text-2xl font-bold text-text-primary mb-3">
								Ready to find your SEO opportunities?
							</h2>
							<p className="text-text-secondary mb-6 max-w-[500px] mx-auto">
								Get a complete SEO audit with prioritized opportunities and AI
								content briefs. One-time purchase, no subscription required.
							</p>
							<Link
								href="/audit/new"
								className="inline-flex items-center gap-2 h-12 px-8 bg-accent text-canvas font-medium rounded-lg transition-colors hover:bg-accent-hover"
							>
								Start Your Audit
								<span className="opacity-70">→</span>
							</Link>
							<p className="text-sm text-text-tertiary mt-4">
								From €{tierInfo.SCAN.price} for a full audit
							</p>
						</div>

						{/* Disclaimer */}
						<p className="text-xs text-text-tertiary text-center mt-12">
							Pricing and features change frequently. Information was last
							verified in {competitor.lastVerified}. Visit{" "}
							<a
								href={competitor.website}
								target="_blank"
								rel="noopener noreferrer nofollow"
								className="underline hover:text-text-secondary"
							>
								{competitor.name}&apos;s website
							</a>{" "}
							for the most current information.
						</p>
					</div>
				</main>

				{/* Footer */}
				<footer className="py-10 px-6 border-t border-border">
					<div className="max-w-[1100px] mx-auto flex items-center justify-between text-sm text-text-tertiary">
						<span>&copy; 2025 Unranked. All rights reserved.</span>
						<div className="flex gap-6">
							<Link
								href="/privacy"
								className="hover:text-text-primary transition-colors"
							>
								Privacy
							</Link>
							<Link
								href="/terms"
								className="hover:text-text-primary transition-colors"
							>
								Terms
							</Link>
						</div>
					</div>
				</footer>
			</div>
		</>
	);
}
