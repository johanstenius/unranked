import { type NextRequest, NextResponse } from "next/server";

const AUDIT_TOKEN_PATTERN = /^\/audit\/(?!new)[^/]+/;

export function middleware(request: NextRequest) {
	const host = request.headers.get("host") ?? "";
	const pathname = request.nextUrl.pathname;

	// Handle admin subdomain
	if (host.startsWith("admin.")) {
		const url = request.nextUrl.clone();
		// Rewrite admin.domain.com/* → /admin/*
		// But keep /admin/login as /admin/login (not /admin/admin/login)
		if (!url.pathname.startsWith("/admin")) {
			url.pathname = `/admin${url.pathname === "/" ? "" : url.pathname}`;
			return NextResponse.rewrite(url);
		}
	}

	// Add noindex header for private audit pages (/audit/[token])
	if (AUDIT_TOKEN_PATTERN.test(pathname)) {
		const response = NextResponse.next();
		response.headers.set("X-Robots-Tag", "noindex, nofollow");
		return response;
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		// Match all paths except static files and API routes
		"/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
	],
};
