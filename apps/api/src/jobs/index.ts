/**
 * Jobs Index - Register all job handlers
 */

import type PgBoss from "pg-boss";
import { createLogger } from "../lib/logger.js";
import { registerCrawlJob } from "./crawl.job.js";
import { registerFinalAnalysisJob } from "./final-analysis.job.js";
import { registerFreeAuditJob } from "./free-audit.job.js";

const log = createLogger("jobs");

export async function registerAllJobs(boss: PgBoss): Promise<void> {
	log.info("Registering job handlers");

	await registerCrawlJob(boss);
	await registerFinalAnalysisJob(boss);
	await registerFreeAuditJob(boss);

	log.info("All job handlers registered");
}

// Re-export queue functions for convenience
export { queueCrawlJob } from "./crawl.job.js";
export { queueFinalAnalysisJob } from "./final-analysis.job.js";
export { queueFreeAuditJob } from "./free-audit.job.js";
