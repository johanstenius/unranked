"use client";

import { Logo } from "@/components/logo";
import { SlideUp, StaggerItem, StaggerList, motion } from "@/components/motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { Spinner } from "@/components/ui/spinner";
import type { Brief } from "@/lib/api";
import { getBrief } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type BriefStructure = {
	sections?: Array<{
		h2: string;
		h3s?: string[];
	}>;
};

export default function BriefPage() {
	const params = useParams();
	const auditToken = params.token as string;
	const briefId = params.briefId as string;

	const [brief, setBrief] = useState<Brief | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [templateCopied, setTemplateCopied] = useState(false);

	useEffect(() => {
		async function fetchBrief() {
			try {
				const data = await getBrief(briefId);
				setBrief(data);
				setLoading(false);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load brief");
				setLoading(false);
			}
		}
		fetchBrief();
	}, [briefId]);

	async function handleCopyBrief() {
		if (!brief) return;

		const structure = brief.structure as BriefStructure;
		const text = `
# Content Brief: ${brief.keyword}

## Target Keyword
${brief.keyword} (${brief.searchVolume.toLocaleString()} searches/mo, Difficulty: ${brief.difficulty}/100)

## Suggested Title
${brief.title}

## Recommended Structure
${
	structure?.sections
		?.map((s) => `- ${s.h2}${s.h3s?.map((h3) => `\n  - ${h3}`).join("") || ""}`)
		.join("\n") || ""
}

## Questions to Answer
${brief.questions?.map((q) => `- ${q}`).join("\n") || ""}

## Related Keywords
${brief.relatedKw?.join(", ") || ""}
`.trim();

		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	async function handleCopyTemplate() {
		if (!brief?.contentTemplate) return;
		await navigator.clipboard.writeText(brief.contentTemplate);
		setTemplateCopied(true);
		setTimeout(() => setTemplateCopied(false), 2000);
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-canvas flex items-center justify-center">
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className="flex flex-col items-center gap-4"
				>
					<Spinner size="lg" />
					<p className="text-text-secondary text-sm">Loading brief...</p>
				</motion.div>
			</div>
		);
	}

	if (error || !brief) {
		return (
			<div className="min-h-screen bg-canvas flex items-center justify-center">
				<div className="text-center">
					<div className="text-status-crit mb-4">
						{error || "Brief not found"}
					</div>
					<Link
						href={`/audit/${auditToken}`}
						className="text-text-secondary hover:text-text-primary transition-colors"
					>
						← Back to audit
					</Link>
				</div>
			</div>
		);
	}

	const structure = brief.structure as BriefStructure;
	const difficultyLabel =
		brief.difficulty < 30 ? "Low" : brief.difficulty < 60 ? "Medium" : "High";
	const difficultyColor =
		brief.difficulty < 30
			? "text-status-good"
			: brief.difficulty < 60
				? "text-status-warn"
				: "text-status-crit";

	return (
		<div className="min-h-screen bg-canvas">
			{/* Navigation */}
			<nav className="h-[60px] bg-canvas/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
				<div className="max-w-[800px] mx-auto px-6 h-full flex items-center justify-between">
					<Link href="/" className="flex items-center gap-2">
						<Logo size={18} />
						<span className="font-display font-semibold text-text-primary">
							Unranked
						</span>
					</Link>
					<div className="flex items-center gap-4">
						<ThemeToggle />
						<Link
							href={`/audit/${auditToken}`}
							className="text-sm text-text-secondary hover:text-text-primary transition-colors"
						>
							← Back to Report
						</Link>
					</div>
				</div>
			</nav>

			<main className="py-12 px-6">
				<div className="max-w-[800px] mx-auto">
					{/* Header */}
					<SlideUp className="flex items-start justify-between mb-8">
						<div>
							<div className="flex items-center gap-2 mb-1">
								<p className="text-xs text-text-tertiary">Content Brief</p>
								{brief.intent && (
									<span
										className={`text-xs px-2 py-0.5 rounded ${
											brief.intent === "informational"
												? "bg-blue-100 text-blue-700"
												: brief.intent === "transactional"
													? "bg-green-100 text-green-700"
													: brief.intent === "commercial"
														? "bg-purple-100 text-purple-700"
														: "bg-gray-100 text-gray-700"
										}`}
									>
										{brief.intent}
									</span>
								)}
							</div>
							<h1 className="font-display text-3xl font-semibold text-text-primary">
								&ldquo;{brief.keyword}&rdquo;
							</h1>
						</div>
						<div className="flex gap-2">
							{brief.contentTemplate && (
								<motion.button
									type="button"
									onClick={handleCopyTemplate}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									className="h-9 px-4 bg-accent text-canvas text-sm font-medium rounded hover:bg-accent-hover transition-colors"
								>
									{templateCopied ? "Copied!" : "Copy Template"}
								</motion.button>
							)}
							<motion.button
								type="button"
								onClick={handleCopyBrief}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="h-9 px-4 bg-surface border border-border-active text-sm font-medium text-text-primary rounded hover:border-border-focus hover:bg-subtle transition-colors"
							>
								{copied ? "Copied!" : "Copy All"}
							</motion.button>
						</div>
					</SlideUp>

					{/* Stats */}
					<SlideUp delay={0.05} className="flex gap-6 mb-10 text-sm">
						<div>
							<span className="text-text-tertiary">Volume</span>
							<span className="ml-2 font-semibold text-text-primary">
								{brief.searchVolume.toLocaleString()}/mo
							</span>
						</div>
						<div>
							<span className="text-text-tertiary">Difficulty</span>
							<span className={`ml-2 font-semibold ${difficultyColor}`}>
								{difficultyLabel}
							</span>
						</div>
						{brief.estimatedEffort && (
							<div>
								<span className="text-text-tertiary">Est. Effort</span>
								<span className="ml-2 font-semibold text-text-primary">
									{brief.estimatedEffort}
								</span>
							</div>
						)}
					</SlideUp>

					{/* Suggested Title */}
					<SlideUp delay={0.1}>
						<motion.div
							whileHover={{ scale: 1.005 }}
							className="border border-border rounded p-6 mb-6 transition-shadow hover:shadow-sm"
						>
							<h2 className="font-display font-semibold text-text-primary mb-3">
								Suggested Title
							</h2>
							<p className="text-lg text-text-primary">{brief.title}</p>
						</motion.div>
					</SlideUp>

					{/* Recommended Structure */}
					{structure?.sections && structure.sections.length > 0 && (
						<SlideUp delay={0.15}>
							<motion.div
								whileHover={{ scale: 1.005 }}
								className="border border-border rounded p-6 mb-6 transition-shadow hover:shadow-sm"
							>
								<h2 className="font-display font-semibold text-text-primary mb-3">
									Recommended Structure
								</h2>
								<div className="font-mono text-sm space-y-2">
									<p className="text-text-primary">H1: {brief.title}</p>
									{structure.sections.map((section) => (
										<div key={section.h2}>
											<p className="text-text-secondary pl-4">
												H2: {section.h2}
											</p>
											{section.h3s?.map((h3) => (
												<p key={h3} className="text-text-tertiary pl-8">
													H3: {h3}
												</p>
											))}
										</div>
									))}
								</div>
							</motion.div>
						</SlideUp>
					)}

					{/* Questions to Answer */}
					{brief.questions && brief.questions.length > 0 && (
						<SlideUp delay={0.2}>
							<motion.div
								whileHover={{ scale: 1.005 }}
								className="border border-border rounded p-6 mb-6 transition-shadow hover:shadow-sm"
							>
								<h2 className="font-display font-semibold text-text-primary mb-1">
									Questions to Answer
								</h2>
								<p className="text-xs text-text-tertiary mb-4">
									From &ldquo;People Also Ask&rdquo;
								</p>
								<ul className="space-y-2">
									{brief.questions.map((question) => (
										<li
											key={question}
											className="flex items-start gap-2 text-sm"
										>
											<span className="text-status-good mt-0.5">?</span>
											<span className="text-text-primary">{question}</span>
										</li>
									))}
								</ul>
							</motion.div>
						</SlideUp>
					)}

					{/* Related Keywords */}
					{brief.relatedKw && brief.relatedKw.length > 0 && (
						<SlideUp delay={0.25}>
							<motion.div
								whileHover={{ scale: 1.005 }}
								className="border border-border rounded p-6 mb-6 transition-shadow hover:shadow-sm"
							>
								<h2 className="font-display font-semibold text-text-primary mb-3">
									Related Keywords to Include
								</h2>
								<div className="flex flex-wrap gap-2">
									{brief.relatedKw.map((kw) => (
										<motion.span
											key={kw}
											whileHover={{ scale: 1.05 }}
											className="px-3 py-1 bg-subtle border border-border rounded text-sm text-text-secondary cursor-default"
										>
											{kw}
										</motion.span>
									))}
								</div>
							</motion.div>
						</SlideUp>
					)}

					{/* Internal Linking */}
					<div className="border border-border rounded p-6 mb-6">
						<h2 className="font-display font-semibold text-text-primary mb-3">
							Link to These Existing Pages
						</h2>
						<ul className="space-y-2 text-sm">
							<li className="flex items-center gap-2">
								<span className="text-text-primary">→</span>
								<code className="text-text-secondary bg-subtle px-1 rounded">
									/docs/getting-started
								</code>
							</li>
							<li className="flex items-center gap-2">
								<span className="text-text-primary">→</span>
								<code className="text-text-secondary bg-subtle px-1 rounded">
									/docs/authentication
								</code>
							</li>
							<li className="flex items-center gap-2">
								<span className="text-text-primary">→</span>
								<code className="text-text-secondary bg-subtle px-1 rounded">
									/docs/error-codes
								</code>
							</li>
						</ul>
					</div>

					{/* Competitor Analysis */}
					{brief.competitors &&
						Array.isArray(brief.competitors) &&
						brief.competitors.length > 0 && (
							<div className="border border-border rounded p-6 mb-6">
								<h2 className="font-display font-semibold text-text-primary mb-3">
									What Competitors Cover
								</h2>
								<div className="space-y-4">
									{(
										brief.competitors as Array<{
											url?: string;
											summary?: string;
										}>
									).map((comp) => (
										<div
											key={comp.url ?? comp.summary}
											className="border-l-2 border-border pl-4"
										>
											{comp.url && (
												<div className="text-sm font-medium text-text-primary mb-1">
													{new URL(comp.url).hostname}
												</div>
											)}
											{comp.summary && (
												<p className="text-sm text-text-secondary">
													{comp.summary}
												</p>
											)}
										</div>
									))}
									<div className="pt-3 border-t border-border">
										<p className="text-sm text-status-good">
											Gap: Look for angles competitors haven&apos;t covered
											well.
										</p>
									</div>
								</div>
							</div>
						)}

					{/* Content Template */}
					{brief.contentTemplate && (
						<SlideUp delay={0.35}>
							<motion.div
								whileHover={{ scale: 1.005 }}
								className="border border-border rounded p-6 mb-6 transition-shadow hover:shadow-sm"
							>
								<div className="flex items-center justify-between mb-3">
									<h2 className="font-display font-semibold text-text-primary">
										Content Template
									</h2>
									<motion.button
										type="button"
										onClick={handleCopyTemplate}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className="text-xs px-3 py-1.5 bg-subtle border border-border text-text-secondary rounded hover:border-border-active hover:text-text-primary transition-colors"
									>
										{templateCopied ? "Copied!" : "Copy"}
									</motion.button>
								</div>
								<pre className="text-sm text-text-secondary font-mono whitespace-pre-wrap bg-subtle p-4 rounded border border-border overflow-x-auto max-h-[400px] overflow-y-auto">
									{brief.contentTemplate}
								</pre>
							</motion.div>
						</SlideUp>
					)}

					{/* CTA */}
					<div className="flex gap-4 pt-6 border-t border-border">
						<Link
							href={`/audit/${auditToken}`}
							className="flex-1 h-11 bg-surface border border-border-active text-sm font-medium text-text-primary rounded flex items-center justify-center hover:border-border-focus hover:bg-subtle transition-colors"
						>
							← Back to Report
						</Link>
						<button
							type="button"
							onClick={handleCopyBrief}
							className="flex-1 h-11 bg-accent text-canvas text-sm font-medium rounded hover:bg-accent-hover transition-colors"
						>
							{copied ? "Copied!" : "Copy Brief to Clipboard"}
						</button>
					</div>
				</div>
			</main>
		</div>
	);
}
