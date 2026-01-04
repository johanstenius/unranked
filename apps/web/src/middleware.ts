import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
	const host = request.headers.get("host") ?? "";

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

	return NextResponse.next();
}

export const config = {
	matcher: [
		// Match all paths except static files and API routes
		"/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
	],
};
