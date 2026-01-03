import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
	level: env.LOG_LEVEL,
	formatters: {
		level: (label) => ({ level: label }),
	},
	timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;

export function createLogger(
	category: string,
	context?: Record<string, unknown>,
): Logger {
	return logger.child({ category, ...context });
}
