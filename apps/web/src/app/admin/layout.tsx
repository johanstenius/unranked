"use client";

import { type AdminUser, getAdminUser } from "@/lib/admin-types";
import { signOut, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
	{ href: "/admin", label: "Dashboard" },
	{ href: "/admin/audits", label: "Audits" },
];

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const { data: session, isPending } = useSession();
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

	useEffect(() => {
		if (isPending) return;

		// Allow login page without auth
		if (pathname === "/admin/login") {
			setIsAuthorized(true);
			return;
		}

		// Check if user is authenticated and is admin
		if (!session?.user) {
			router.push("/admin/login");
			return;
		}

		const user = getAdminUser(session.user);
		if (!user) {
			router.push("/admin/login");
			return;
		}

		setAdminUser(user);
		setIsAuthorized(true);
	}, [session, isPending, pathname, router]);

	if (isPending || !isAuthorized) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-bg-primary">
				<div className="text-text-secondary">Loading...</div>
			</div>
		);
	}

	if (pathname === "/admin/login") {
		return <>{children}</>;
	}

	async function handleSignOut() {
		await signOut();
		router.push("/admin/login");
	}

	return (
		<div className="min-h-screen bg-bg-primary">
			<header className="border-b border-border-subtle bg-bg-secondary">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center gap-8">
							<Link
								href="/admin"
								className="text-lg font-semibold text-text-primary"
							>
								Admin
							</Link>
							<nav className="flex gap-4">
								{NAV_ITEMS.map((item) => (
									<Link
										key={item.href}
										href={item.href}
										className={`px-3 py-2 rounded-md text-sm font-medium ${
											pathname === item.href
												? "bg-bg-tertiary text-text-primary"
												: "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
										}`}
									>
										{item.label}
									</Link>
								))}
							</nav>
						</div>
						<div className="flex items-center gap-4">
							{adminUser && (
								<span className="text-sm text-text-secondary">
									{adminUser.email}
								</span>
							)}
							<button
								type="button"
								onClick={handleSignOut}
								className="px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
							>
								Sign out
							</button>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{children}
			</main>
		</div>
	);
}
