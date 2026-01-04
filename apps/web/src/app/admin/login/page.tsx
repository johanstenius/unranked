"use client";

import { isAdmin } from "@/lib/admin-types";
import { getSession, signIn, twoFactor, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [totpCode, setTotpCode] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [needsTwoFactor, setNeedsTwoFactor] = useState(false);

	// Redirect if already logged in as admin
	if (session?.user && isAdmin(session.user)) {
		router.push("/admin");
		return null;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			const result = await signIn.email({ email, password });

			if (result.error) {
				if (result.error.code === "TWO_FACTOR_REQUIRED") {
					setNeedsTwoFactor(true);
				} else {
					setError(result.error.message || "Sign in failed");
				}
				return;
			}

			if (!isAdmin(result.data?.user)) {
				setError("Access denied. Admin privileges required.");
				return;
			}

			router.push("/admin");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Sign in failed");
		} finally {
			setIsLoading(false);
		}
	}

	async function handleTwoFactor(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			const result = await twoFactor.verifyTotp({ code: totpCode });

			if (result.error) {
				setError(result.error.message || "Invalid 2FA code");
				return;
			}

			const sessionData = await getSession();
			if (!isAdmin(sessionData.data?.user)) {
				setError("Access denied. Admin privileges required.");
				return;
			}

			router.push("/admin");
		} catch (err) {
			setError(err instanceof Error ? err.message : "2FA verification failed");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
			<div className="max-w-sm w-full">
				<div className="text-center mb-8">
					<h1 className="text-2xl font-bold text-text-primary">Admin Login</h1>
					<p className="text-text-secondary mt-2">
						Sign in to access the admin panel
					</p>
				</div>

				{needsTwoFactor ? (
					<form onSubmit={handleTwoFactor} className="space-y-4">
						<div>
							<label
								htmlFor="totp"
								className="block text-sm font-medium text-text-secondary mb-1"
							>
								2FA Code
							</label>
							<input
								id="totp"
								type="text"
								inputMode="numeric"
								autoComplete="one-time-code"
								value={totpCode}
								onChange={(e) => setTotpCode(e.target.value)}
								className="w-full px-3 py-2 border border-border-subtle rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
								placeholder="Enter 6-digit code"
								required
							/>
						</div>

						{error && (
							<div className="text-sm text-status-error bg-red-500/10 px-3 py-2 rounded">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={isLoading}
							className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-medium hover:bg-brand-primary/90 disabled:opacity-50"
						>
							{isLoading ? "Verifying..." : "Verify"}
						</button>

						<button
							type="button"
							onClick={() => setNeedsTwoFactor(false)}
							className="w-full text-sm text-text-secondary hover:text-text-primary"
						>
							Back to login
						</button>
					</form>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-text-secondary mb-1"
							>
								Email
							</label>
							<input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full px-3 py-2 border border-border-subtle rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
								placeholder="admin@example.com"
								required
							/>
						</div>

						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-text-secondary mb-1"
							>
								Password
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-3 py-2 border border-border-subtle rounded-md bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
								required
							/>
						</div>

						{error && (
							<div className="text-sm text-status-error bg-red-500/10 px-3 py-2 rounded">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={isLoading}
							className="w-full py-2 px-4 bg-brand-primary text-white rounded-md font-medium hover:bg-brand-primary/90 disabled:opacity-50"
						>
							{isLoading ? "Signing in..." : "Sign in"}
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
