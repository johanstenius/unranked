import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { registerAllJobs } from "./jobs/index.js";
import { createLogger } from "./lib/logger.js";
import { getQueue, stopQueue } from "./lib/queue.js";

const log = createLogger("server");

async function main() {
	const app = createApp();

	// Initialize job queue
	const queue = await getQueue();
	await registerAllJobs(queue);
	log.info("Job queue initialized");

	log.info({ port: env.PORT }, "Starting server");

	const server = serve({
		fetch: app.fetch,
		port: env.PORT,
	});

	// Graceful shutdown
	async function shutdown(signal: string) {
		log.info(
			{ signal, uptime: process.uptime(), timestamp: new Date().toISOString() },
			"Shutdown signal received",
		);
		server.close();
		await stopQueue();
		log.info("Graceful shutdown complete");
		process.exit(0);
	}

	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));
	process.on("uncaughtException", (err) => {
		log.error({ err }, "Uncaught exception");
		process.exit(1);
	});
	process.on("unhandledRejection", (reason) => {
		log.error({ reason }, "Unhandled rejection");
	});
}

main().catch((error) => {
	log.fatal({ error }, "Failed to start server");
	process.exit(1);
});
