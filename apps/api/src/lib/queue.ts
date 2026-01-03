import PgBoss from "pg-boss";
import { env } from "../config/env.js";
import { createLogger } from "./logger.js";

const log = createLogger("queue");

let boss: PgBoss | null = null;

export async function getQueue(): Promise<PgBoss> {
	if (!boss) {
		log.info("Initializing pg-boss");
		boss = new PgBoss(env.DATABASE_URL);
		await boss.start();
		log.info("pg-boss started");
	}
	return boss;
}

export async function stopQueue(): Promise<void> {
	if (boss) {
		await boss.stop();
		boss = null;
	}
}
