"use client";

import { Logo } from "@/components/logo";
import { SlideUp, StaggerItem, StaggerList, motion } from "@/components/motion";
import { PricingCard } from "@/components/pricing-card";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
	const router = useRouter();
	const [website, setWebsite] = useState("");

	function handleAnalyze(e: React.FormEvent) {
		e.preventDefault();
		const url = website.trim();
		if (url) {
			router.push(`/audit/new?site=${encodeURIComponent(url)}`);
		} else {
			router.push("/audit/new");
		}
	}

	return (
		<div className="min-h-screen bg-canvas">
			{/* Navigation */}
			<nav className="h-[60px] sticky top-0 bg-canvas/80 backdrop-blur-md border-b border-border z-50">
				<div className="max-w-[1100px] mx-auto px-10 h-full flex items-center justify-between">
					<Link href="/" className="flex items-center gap-2">
						<Logo size={18} />
						<span className="font-display font-semibold text-text-primary">
							Unranked
						</span>
					</Link>
					<div className="flex items-center gap-6">
						<a
							href="#features"
							className="text-sm text-text-secondary hover:text-text-primary transition-colors"
						>
							Features
						</a>
						<a
							href="#pricing"
							className="text-sm text-text-secondary hover:text-text-primary transition-colors"
						>
							Pricing
						</a>
						<ThemeToggle />
						<button
							type="button"
							onClick={() => router.push("/audit/new")}
							className="h-9 px-4 bg-accent text-canvas text-sm font-medium rounded transition-colors hover:bg-accent-hover"
						>
							Start Analysis
						</button>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="pt-28 pb-20 px-10 relative overflow-hidden">
				{/* Subtle gradient background */}
				<div className="absolute inset-0 bg-gradient-to-b from-subtle/50 to-transparent pointer-events-none" />

				<div className="max-w-[800px] mx-auto text-center relative">
					<SlideUp>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{
								delay: 0.1,
								type: "spring",
								stiffness: 300,
								damping: 20,
							}}
							className="inline-flex items-center gap-3 mb-8"
						>
							<span className="h-px w-8 bg-border-active" />
							<span className="text-xs font-medium uppercase tracking-[0.2em] text-text-secondary">
								One-time purchase
							</span>
							<span className="h-px w-8 bg-border-active" />
						</motion.div>
					</SlideUp>
					<SlideUp delay={0.1}>
						<h1 className="font-display text-[clamp(3rem,6vw,4.5rem)] leading-[1.05] text-text-primary mb-6 font-bold">
							Find what's missing.
							<br />
							Know what matters.
						</h1>
					</SlideUp>
					<SlideUp delay={0.15}>
						<p className="text-lg text-text-secondary max-w-[520px] mx-auto mb-12 leading-relaxed">
							Full SEO audit with prioritized opportunities and AI content
							briefs. One-time price, no subscription.
						</p>
					</SlideUp>

					{/* CTA Input */}
					<SlideUp delay={0.2}>
						<form
							onSubmit={handleAnalyze}
							className="flex gap-3 max-w-[520px] mx-auto mb-5"
						>
							<div className="flex-1 relative group">
								<input
									type="text"
									value={website}
									onChange={(e) => setWebsite(e.target.value)}
									placeholder="yourproduct.com"
									className="w-full h-14 px-5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary transition-all focus:shadow-[0_0_0_4px_rgba(0,0,0,0.03)] dark:focus:shadow-[0_0_0_4px_rgba(255,255,255,0.03)]"
								/>
							</div>
							<motion.button
								type="submit"
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="h-14 px-8 bg-accent text-canvas font-medium rounded-lg transition-all hover:bg-accent-hover whitespace-nowrap shadow-sm hover:shadow-md"
							>
								Analyze Site →
							</motion.button>
						</form>
						<p className="text-sm text-text-tertiary mb-2">
							We'll crawl your entire site from sitemap or links.
						</p>
						<p className="text-sm text-text-secondary">
							Or{" "}
							<Link
								href="/audit/new?tier=FREE"
								className="text-text-primary underline underline-offset-4 hover:no-underline"
							>
								try a free technical check
							</Link>{" "}
							first.
						</p>
					</SlideUp>
				</div>
			</section>

			{/* App Preview */}
			<section className="pb-32 px-10">
				<div className="max-w-[900px] mx-auto">
					<motion.div
						initial={{ y: 40, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
						className="relative"
					>
						{/* Glow effect behind card */}
						<div className="absolute -inset-8 bg-gradient-to-b from-border/40 to-transparent rounded-3xl blur-2xl opacity-70" />

						<div className="relative border border-border rounded-2xl overflow-hidden shadow-2xl dark:shadow-dark-md bg-surface">
							{/* Browser chrome */}
							<div className="flex items-center gap-2 px-4 py-3 bg-subtle border-b border-border">
								<div className="flex gap-1.5">
									<div className="w-3 h-3 rounded-full bg-status-crit/60" />
									<div className="w-3 h-3 rounded-full bg-status-warn/60" />
									<div className="w-3 h-3 rounded-full bg-status-good/60" />
								</div>
								<div className="flex-1 flex justify-center">
									<div className="px-4 py-1 bg-surface rounded-md text-xs text-text-tertiary font-mono">
										unranked.io/audit/example-site
									</div>
								</div>
								<div className="w-[52px]" />
							</div>

							{/* Screenshot */}
							<img
								src="/demo-light.png"
								alt="Unranked SEO audit report showing health score, keyword opportunities, and traffic potential"
								className="w-full dark:hidden"
							/>
							<img
								src="/demo-dark.png"
								alt="Unranked SEO audit report showing health score, keyword opportunities, and traffic potential"
								className="w-full hidden dark:block"
							/>
						</div>
					</motion.div>
				</div>
			</section>

			{/* How it Works */}
			<section
				id="how-it-works"
				className="py-28 px-10 border-t border-border bg-subtle/30"
			>
				<div className="max-w-[1100px] mx-auto">
					<div className="max-w-[500px] mb-16">
						<h2 className="font-display text-[clamp(2rem,4vw,2.75rem)] text-text-primary mb-4 font-bold">
							How it works
						</h2>
						<p className="text-text-secondary text-lg">
							Enter your URL. Get a complete SEO analysis with prioritized
							actions in minutes.
						</p>
					</div>

					<StaggerList className="grid grid-cols-3 gap-8 relative">
						{/* Connector line */}
						<div className="absolute top-[52px] left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-border via-border-active to-border hidden md:block" />

						<StaggerItem>
							<motion.div
								whileHover={{ y: -4 }}
								transition={{ duration: 0.2 }}
								className="relative p-8 bg-surface border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow"
							>
								<div className="w-12 h-12 bg-accent text-canvas rounded-full flex items-center justify-center text-lg font-bold mb-6 relative z-10">
									1
								</div>
								<h3 className="font-display text-xl text-text-primary mb-3">
									Diagnose
								</h3>
								<p className="text-text-secondary leading-relaxed">
									We crawl your site, check technical SEO, find keyword gaps,
									and identify what competitors rank for.
								</p>
							</motion.div>
						</StaggerItem>
						<StaggerItem>
							<motion.div
								whileHover={{ y: -4 }}
								transition={{ duration: 0.2 }}
								className="relative p-8 bg-surface border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow"
							>
								<div className="w-12 h-12 bg-accent text-canvas rounded-full flex items-center justify-center text-lg font-bold mb-6 relative z-10">
									2
								</div>
								<h3 className="font-display text-xl text-text-primary mb-3">
									Prioritize
								</h3>
								<p className="text-text-secondary leading-relaxed">
									Every opportunity scored by impact. Quick wins highlighted.
									Know exactly what to tackle first.
								</p>
							</motion.div>
						</StaggerItem>
						<StaggerItem>
							<motion.div
								whileHover={{ y: -4 }}
								transition={{ duration: 0.2 }}
								className="relative p-8 bg-surface border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow"
							>
								<div className="w-12 h-12 bg-accent text-canvas rounded-full flex items-center justify-center text-lg font-bold mb-6 relative z-10">
									3
								</div>
								<h3 className="font-display text-xl text-text-primary mb-3">
									Execute
								</h3>
								<p className="text-text-secondary leading-relaxed">
									AI content briefs with structure, keywords, and competitor
									insights. Ready to write or hand off.
								</p>
							</motion.div>
						</StaggerItem>
					</StaggerList>
				</div>
			</section>

			{/* What You Get */}
			<section id="features" className="py-28 px-10 border-t border-border">
				<div className="max-w-[1100px] mx-auto">
					<div className="max-w-[500px] mb-16">
						<h2 className="font-display text-[clamp(2rem,4vw,2.75rem)] text-text-primary mb-4 font-bold">
							What you get
						</h2>
						<p className="text-text-secondary text-lg">
							Everything you need to improve your search rankings, in one
							report.
						</p>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-3 gap-6">
						<motion.div
							whileHover={{ y: -2 }}
							className="p-6 bg-subtle/50 border border-border rounded-xl hover:border-border-active transition-colors"
						>
							<div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-text-primary mb-5">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									aria-hidden="true"
								>
									<circle cx="12" cy="12" r="9" />
									<path d="M12 7v5l3 3" />
								</svg>
							</div>
							<h3 className="font-display text-lg text-text-primary mb-2">
								Health Score
							</h3>
							<p className="text-sm text-text-secondary leading-relaxed">
								Overall SEO health with breakdown across 6 key factors. See
								exactly where you stand.
							</p>
						</motion.div>

						<motion.div
							whileHover={{ y: -2 }}
							className="p-6 bg-subtle/50 border border-border rounded-xl hover:border-border-active transition-colors"
						>
							<div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-text-primary mb-5">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									aria-hidden="true"
								>
									<path d="M3 20l5-5 4 4 9-11" />
								</svg>
							</div>
							<h3 className="font-display text-lg text-text-primary mb-2">
								Keyword Opportunities
							</h3>
							<p className="text-sm text-text-secondary leading-relaxed">
								Keywords you should rank for but don't. Scored by search volume,
								difficulty, and potential impact.
							</p>
						</motion.div>

						<motion.div
							whileHover={{ y: -2 }}
							className="p-6 bg-subtle/50 border border-border rounded-xl hover:border-border-active transition-colors"
						>
							<div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-text-primary mb-5">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									aria-hidden="true"
								>
									<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
									<rect x="8" y="2" width="8" height="4" rx="1" />
									<path d="M9 12h6M9 16h6" />
								</svg>
							</div>
							<h3 className="font-display text-lg text-text-primary mb-2">
								Competitor Gap Analysis
							</h3>
							<p className="text-sm text-text-secondary leading-relaxed">
								See what keywords competitors rank for that you don't.
								Auto-discovered or specify your own.
							</p>
						</motion.div>

						<motion.div
							whileHover={{ y: -2 }}
							className="p-6 bg-subtle/50 border border-border rounded-xl hover:border-border-active transition-colors"
						>
							<div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-text-primary mb-5">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									aria-hidden="true"
								>
									<path d="M4 6h16M4 12h10M4 18h14" />
								</svg>
							</div>
							<h3 className="font-display text-lg text-text-primary mb-2">
								AI Content Briefs
							</h3>
							<p className="text-sm text-text-secondary leading-relaxed">
								Full writing instructions: title, structure, questions to
								answer, internal links, competitor insights.
							</p>
						</motion.div>

						<motion.div
							whileHover={{ y: -2 }}
							className="p-6 bg-subtle/50 border border-border rounded-xl hover:border-border-active transition-colors"
						>
							<div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-text-primary mb-5">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									aria-hidden="true"
								>
									<path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
								</svg>
							</div>
							<h3 className="font-display text-lg text-text-primary mb-2">
								Quick Wins
							</h3>
							<p className="text-sm text-text-secondary leading-relaxed">
								Pages ranking 10-30 that could jump to page one with small
								improvements. AI suggestions included.
							</p>
						</motion.div>

						<motion.div
							whileHover={{ y: -2 }}
							className="p-6 bg-subtle/50 border border-border rounded-xl hover:border-border-active transition-colors"
						>
							<div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-text-primary mb-5">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									aria-hidden="true"
								>
									<path d="M12 9v4M12 17h.01" />
									<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
								</svg>
							</div>
							<h3 className="font-display text-lg text-text-primary mb-2">
								Technical Issues
							</h3>
							<p className="text-sm text-text-secondary leading-relaxed">
								Missing titles, thin content, broken internal links, redirect
								chains. Prioritized by severity.
							</p>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Full Audit Breakdown */}
			<section className="py-28 px-10 border-t border-border bg-subtle/30">
				<div className="max-w-[1100px] mx-auto">
					<div className="text-center mb-16">
						<h2 className="font-display text-[clamp(2rem,4vw,2.75rem)] text-text-primary mb-4 font-bold">
							The complete picture
						</h2>
						<p className="text-text-secondary text-lg max-w-[500px] mx-auto">
							Every dimension analyzed. Every opportunity surfaced. Here's
							exactly what your audit covers.
						</p>
					</div>

					<div className="grid md:grid-cols-2 gap-16 max-w-[900px] mx-auto">
						{/* Analysis Column */}
						<div>
							<div className="flex items-center gap-3 mb-8">
								<span className="w-8 h-px bg-accent" />
								<span className="text-xs font-medium uppercase tracking-[0.15em] text-text-tertiary">
									What we analyze
								</span>
							</div>
							<div className="space-y-6">
								{[
									{
										num: "01",
										title: "SEO Health Score",
										value: "Know where you stand across 6 key factors",
									},
									{
										num: "02",
										title: "Keyword Opportunities",
										value: "Find gaps with intent + difficulty scoring",
									},
									{
										num: "03",
										title: "Current Rankings",
										value: "See what's working and estimate traffic",
									},
									{
										num: "04",
										title: "Competitor Gaps",
										value: "Discover what they rank for that you don't",
									},
									{
										num: "05",
										title: "Internal Linking",
										value: "Find orphan pages and underlinked content",
									},
									{
										num: "06",
										title: "Cannibalization",
										value: "Spot pages competing for the same keywords",
									},
									{
										num: "07",
										title: "Technical Issues",
										value: "Catch missing titles, thin content, errors",
									},
									{
										num: "08",
										title: "Section Breakdown",
										value: "Performance metrics per site area",
									},
								].map((item) => (
									<motion.div
										key={item.num}
										initial={{ opacity: 0, x: -10 }}
										whileInView={{ opacity: 1, x: 0 }}
										viewport={{ once: true }}
										transition={{ delay: Number(item.num) * 0.03 }}
										className="group"
									>
										<div className="flex gap-4">
											<span className="text-xs text-text-tertiary font-mono pt-1 opacity-40 group-hover:opacity-100 transition-opacity">
												{item.num}
											</span>
											<div>
												<h4 className="font-display text-text-primary font-bold mb-1">
													{item.title}
												</h4>
												<p className="text-sm text-text-secondary leading-relaxed">
													{item.value}
												</p>
											</div>
										</div>
									</motion.div>
								))}
							</div>
						</div>

						{/* Deliverables Column */}
						<div>
							<div className="flex items-center gap-3 mb-8">
								<span className="w-8 h-px bg-accent" />
								<span className="text-xs font-medium uppercase tracking-[0.15em] text-text-tertiary">
									What you get
								</span>
							</div>
							<div className="space-y-6">
								{[
									{
										num: "09",
										title: "Quick Wins List",
										value: "Pages ranking 10-30 that can jump to page 1",
									},
									{
										num: "10",
										title: "AI Content Briefs",
										value: "Full outlines with structure + keywords",
									},
									{
										num: "11",
										title: "Priority Scoring",
										value: "Know exactly what to tackle first",
									},
									{
										num: "12",
										title: "Traffic Estimates",
										value: "See potential impact before you write",
									},
								].map((item) => (
									<motion.div
										key={item.num}
										initial={{ opacity: 0, x: -10 }}
										whileInView={{ opacity: 1, x: 0 }}
										viewport={{ once: true }}
										transition={{ delay: Number(item.num) * 0.03 }}
										className="group"
									>
										<div className="flex gap-4">
											<span className="text-xs text-text-tertiary font-mono pt-1 opacity-40 group-hover:opacity-100 transition-opacity">
												{item.num}
											</span>
											<div>
												<h4 className="font-display text-text-primary font-bold mb-1">
													{item.title}
												</h4>
												<p className="text-sm text-text-secondary leading-relaxed">
													{item.value}
												</p>
											</div>
										</div>
									</motion.div>
								))}
							</div>

							{/* Extras */}
							<div className="mt-12 pt-8 border-t border-border">
								<div className="flex items-center gap-3 mb-6">
									<span className="w-8 h-px bg-border-active" />
									<span className="text-xs font-medium uppercase tracking-[0.15em] text-text-tertiary">
										Also included
									</span>
								</div>
								<div className="flex flex-wrap gap-3">
									{[
										"PDF Export",
										"Email Delivery",
										"Shareable Link",
										"Dark Mode",
									].map((extra) => (
										<span
											key={extra}
											className="px-3 py-1.5 bg-surface border border-border rounded-full text-sm text-text-secondary"
										>
											{extra}
										</span>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Pricing */}
			<section id="pricing" className="py-28 px-10 border-t border-border">
				<div className="max-w-[1100px] mx-auto">
					<div className="text-center mb-16">
						<h2 className="font-display text-[clamp(2rem,4vw,2.75rem)] text-text-primary mb-4 font-bold">
							One price. Full audit.
						</h2>
						<p className="text-text-secondary text-lg">
							No monthly fees. No per-keyword charges. Pay once, own your
							report.
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[900px] mx-auto">
						<PricingCard tier="SCAN" />
						<PricingCard tier="AUDIT" featured />
						<PricingCard tier="DEEP_DIVE" />
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="py-10 px-10 border-t border-border">
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
	);
}
