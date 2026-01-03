"use client";

import { LoadingScreen } from "@/components/ui/spinner";
import { getReportByToken } from "@/lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PageState =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "redirecting" };

export default function ReportPage() {
	const params = useParams();
	const router = useRouter();
	const token = params.token as string;
	const [state, setState] = useState<PageState>({ status: "loading" });

	useEffect(() => {
		async function loadReport() {
			try {
				const data = await getReportByToken(token);
				if (data.expired) {
					setState({
						status: "error",
						message: "This report link has expired.",
					});
					return;
				}
				setState({ status: "redirecting" });
				router.replace(`/audit/${data.audit.id}`);
			} catch {
				setState({
					status: "error",
					message: "Report not found or link has expired.",
				});
			}
		}
		loadReport();
	}, [token, router]);

	if (state.status === "loading" || state.status === "redirecting") {
		return <LoadingScreen />;
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-8 bg-background">
			<div className="max-w-md text-center">
				<div className="w-16 h-16 rounded-full bg-status-error/10 flex items-center justify-center mx-auto mb-6">
					<svg
						className="w-8 h-8 text-status-error"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h1 className="font-display text-2xl font-bold text-text-primary mb-2">
					Report Unavailable
				</h1>
				<p className="text-text-secondary mb-6">{state.message}</p>
				<Link
					href="/"
					className="inline-flex items-center justify-center px-6 py-3 bg-text-primary text-background font-medium rounded-lg hover:opacity-90 transition-opacity"
				>
					Run a New Audit
				</Link>
			</div>
		</div>
	);
}
