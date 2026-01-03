import type { MiddlewareHandler } from "hono";
import { createLogger } from "../lib/logger.js";

const log = createLogger("http");

export function requestLogger(): MiddlewareHandler<{
	Variables: { requestId: string };
}> {
	return async (c, next) => {
		const start = Date.now();
		const requestId = crypto.randomUUID();

		c.set("requestId", requestId);

		let body: string | undefined;
		const method = c.req.method;
		if ((method === "POST" || method === "PUT") && c.req.raw.body) {
			try {
				body = await c.req.text();
				// Recreate request with the body we consumed
				const newRequest = new Request(c.req.url, {
					method: c.req.method,
					headers: c.req.raw.headers,
					body,
				});
				Object.defineProperty(c.req, "raw", { value: newRequest });
			} catch {
				// Body might not be readable
			}
		}

		await next();

		const duration = Date.now() - start;
		const status = c.res.status;

		const logData: Record<string, unknown> = {
			requestId,
			method: c.req.method,
			path: c.req.path,
			status,
			duration,
		};

		if (status >= 400 && body) {
			logData.body = body.slice(0, 1000);
		}

		const msg = `${c.req.method} ${c.req.path} ${status}`;

		if (status >= 500) {
			log.error(logData, msg);
		} else if (status >= 400) {
			log.warn(logData, msg);
		} else {
			log.info(logData, msg);
		}
	};
}
