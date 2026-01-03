import { Logo } from "@/components/logo";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Terms of Service",
	description:
		"Terms of service for Unranked SEO audit tool. One-time purchases, refund policy, and usage guidelines.",
	robots: {
		index: true,
		follow: true,
	},
};

export default function TermsPage() {
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
						Terms of Service
					</h1>

					<div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-text-secondary">
						<p className="text-sm text-text-tertiary">
							Last updated: January 2025
						</p>

						<section className="space-y-3">
							<h2 className="text-lg font-semibold text-text-primary">
								Service
							</h2>
							<p>
								Unranked provides SEO analysis and content brief generation for
								websites. Reports are generated based on publicly available data
								and third-party keyword research APIs.
							</p>
						</section>

						<section className="space-y-3">
							<h2 className="text-lg font-semibold text-text-primary">
								Payment
							</h2>
							<p>
								All purchases are one-time payments processed through Stripe.
								Prices are in EUR and include applicable taxes. Refunds are
								available within 7 days if no report has been generated.
							</p>
						</section>

						<section className="space-y-3">
							<h2 className="text-lg font-semibold text-text-primary">
								Your responsibilities
							</h2>
							<p>
								You may only analyze websites you own or have permission to
								analyze. You agree not to abuse the service or attempt to
								circumvent usage limits.
							</p>
						</section>

						<section className="space-y-3">
							<h2 className="text-lg font-semibold text-text-primary">
								Limitations
							</h2>
							<p>
								SEO recommendations are suggestions based on available data. We
								do not guarantee specific ranking improvements. Keyword data is
								sourced from third-party providers and may not be 100% accurate.
							</p>
						</section>

						<section className="space-y-3">
							<h2 className="text-lg font-semibold text-text-primary">
								Liability
							</h2>
							<p>
								Unranked is provided &quot;as is&quot; without warranties. Our
								liability is limited to the amount you paid for the service.
							</p>
						</section>

						<section className="space-y-3">
							<h2 className="text-lg font-semibold text-text-primary">
								Contact
							</h2>
							<p>Questions? Email us at support@rankaudit.com</p>
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
