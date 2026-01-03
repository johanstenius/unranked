import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export function FormNav() {
	return (
		<nav className="h-[60px] bg-canvas/80 backdrop-blur-md border-b border-border">
			<div className="max-w-[600px] mx-auto px-6 h-full flex items-center justify-between">
				<Link href="/" className="flex items-center gap-2">
					<Logo size={18} />
					<span className="font-display font-semibold text-text-primary">
						Unranked
					</span>
				</Link>
				<div className="flex items-center gap-4">
					<ThemeToggle />
					<Link
						href="/"
						className="text-sm text-text-secondary hover:text-text-primary transition-colors"
					>
						← Back
					</Link>
				</div>
			</div>
		</nav>
	);
}
