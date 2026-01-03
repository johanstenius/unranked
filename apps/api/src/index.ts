import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { registerAuditJobs } from "./jobs/audit.jobs.js";
import { createLogger } from "./lib/logger.js";
import { getQueue, stopQueue } from "./lib/queue.js";

const log = createLogger("server");

async function main() {
	const app = createApp();

	// Initialize job queue
	const queue = await getQueue();
	await registerAuditJobs(queue);
	log.info("Job queue initialized");

	log.info({ port: env.PORT }, "Starting server");

	const server = serve({
		fetch: app.fetch,
		port: env.PORT,
	});

	// Graceful shutdown
	async function shutdown(signal: string) {
		log.info({ signal }, "Shutdown signal received");
		server.close();
		await stopQueue();
		log.info("Graceful shutdown complete");
		process.exit(0);
	}

	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
	log.fatal({ error }, "Failed to start server");
	process.exit(1);
});
