import type { ErrorHandler } from "hono";
import { createLogger } from "../lib/logger.js";

const log = createLogger("http");

export const errorHandler: ErrorHandler<{
	Variables: { requestId: string };
}> = (err, c) => {
	const requestId = c.get("requestId");

	log.error(
		{
			requestId,
			error: err.message,
			stack: err.stack,
			method: c.req.method,
			path: c.req.path,
		},
		"Unhandled error",
	);

	return c.json({ error: "Internal server error" }, 500);
};
