import type { Context, Next } from "hono";
import { auth } from "../lib/auth.js";

export type AdminUser = {
	id: string;
	email: string;
	name: string;
	role: string;
};

export type AdminContext = {
	Variables: {
		requestId: string;
		adminUser: AdminUser;
	};
};

export async function requireAdmin(c: Context<AdminContext>, next: Next) {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session?.user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (session.user.role !== "admin") {
		return c.json({ error: "Forbidden: Admin access required" }, 403);
	}

	c.set("adminUser", {
		id: session.user.id,
		email: session.user.email,
		name: session.user.name,
		role: session.user.role as string,
	});

	await next();
}
