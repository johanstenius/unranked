import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { auditRoutes } from "./routes/audit.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { billingRoutes } from "./routes/billing.routes.js";

export type AppEnv = {
	Variables: { requestId: string };
};

export function createApp() {
	const app = new OpenAPIHono<AppEnv>();

	app.use("*", requestLogger());
	app.onError(errorHandler);
	app.use(
		"*",
		cors({
			origin: env.CORS_ORIGINS,
			credentials: true,
		}),
	);

	app.get("/health", (c) =>
		c.json({ status: "ok", timestamp: new Date().toISOString() }),
	);

	app.route("/", authRoutes);
	app.route("/", adminRoutes);
	app.route("/", auditRoutes);
	app.route("/", billingRoutes);

	app.doc("/openapi", {
		openapi: "3.1.0",
		info: {
			title: "DocRank API",
			version: "0.0.1",
		},
	});

	return app;
}

export type App = ReturnType<typeof createApp>;
