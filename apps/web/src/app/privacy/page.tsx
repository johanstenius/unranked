import { Logo } from "@/components/logo";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Privacy Policy",
	description:
		"Learn how Unranked handles your data. We collect minimal information and never share your audit data with third parties.",
	robots: {
		index: true,
		follow: true,
	},
};

export default function PrivacyPage() {
	return (
		<div className="min-h-screen bg-canvas">
			<nav className="h-[60px] bg-canvas/80 backdrop-blur-md border-b border-border">
				<div className="max-w-[700px] mx-auto px-6 h-full flex items-center">
					<Link href="/" className="flex items-center gap-2">
						<Logo size={18} />
						<span className="font-display font-semibold text-text-primary">
							Unranked
						</span>
					</Link>
				</div>
			</nav>

			<main className="py-16 px-6">
				<div className="max-w-[700px] mx-auto">
					<h1 className="font-display text-3xl font-semibold text-text-primary mb-8">
						Privacy Policy
					</h1>

					<div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-text-secondary">
						<p className="text-sm text-text-tertiary">
							Last updated: January 2025
						</p>

						<section className="space-y-3">
							<h2 className="text-lg font-semibold text-text-primary">
								What we collect
							</h2>
							<p>
								When you use Unranked, we collect your email address and the
								website URL you submit for analysis. We use third-party services
								for payments, keyword research, AI content generation, and email
								delivery. These providers may collect additional information as
								described in their respective privacy policies.
							</p>
						</section>

						<section className="space-y-3">
							<h2 className="text-lg font-semibold text-text-primary">
								How we use it
							</h2>
							<p>
								We use your email to send you the audit report and occasional
								product updates. We analyze the website you submit to generate
								SEO insights. We do not sell your data to third parties.
							</p>
						</section>

						<section className="space-y-3">
							<h2 className="text-lg font-semibold text-text-primary">
								Data retention
							</h2>
							<p>
								Report links expire 30 days after generation. You can request
								deletion of your data at any time by contacting us.
							</p>
						</section>

						<section className="space-y-3">
							<h2 className="text-lg font-semibold text-text-primary">
								Local storage
							</h2>
							<p>
								We use browser local storage to save your theme preference. We
								do not use tracking or advertising cookies.
							</p>
						</section>

						<section className="space-y-3">
							<h2 className="text-lg font-semibold text-text-primary">
								Contact
							</h2>
							<p>
								Questions about this policy? Email us at{" "}
								<a
									href="mailto:privacy@unranked.io"
									className="text-text-primary hover:underline"
								>
									privacy@unranked.io
								</a>
							</p>
						</section>
					</div>

					<div className="mt-12 pt-8 border-t border-border">
						<Link
							href="/"
							className="text-sm text-text-secondary hover:text-text-primary transition-colors"
						>
							← Back to home
						</Link>
					</div>
				</div>
			</main>
		</div>
	);
}
