import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
	PORT: z.coerce.number().default(3001),
	DATABASE_URL: z.string(),
	// Test mode - skips real API calls to Anthropic and DataForSEO
	TEST_MODE: z.coerce.boolean().default(false),
	DATAFORSEO_LOGIN: z.string().optional(),
	DATAFORSEO_PASSWORD: z.string().optional(),
	FRONTEND_URL: z.string().url(),
	// CORS origins - comma-separated list of allowed origins
	CORS_ORIGINS: z
		.string()
		.optional()
		.transform((val) => {
			if (!val) return [];
			return val.split(",").map((s) => s.trim());
		}),
	ANTHROPIC_API_KEY: z.string().optional(),
	// AI models - defaults to latest versions
	AI_MODEL_FAST: z.string().default("claude-haiku-4-5-20250514"),
	AI_MODEL_QUALITY: z.string().default("claude-sonnet-4-5-20250514"),
	// LemonSqueezy billing
	LEMONSQUEEZY_API_KEY: z.string(),
	LEMONSQUEEZY_WEBHOOK_SECRET: z.string(),
	LEMONSQUEEZY_STORE_ID: z.string(),
	LEMONSQUEEZY_VARIANT_SCAN: z.string(),
	LEMONSQUEEZY_VARIANT_AUDIT: z.string(),
	LEMONSQUEEZY_VARIANT_DEEP_DIVE: z.string(),
	// Better Auth
	BETTER_AUTH_SECRET: z.string(),
	BETTER_AUTH_URL: z.string().url(),
	// PageSpeed Insights (optional - works without key with lower rate limits)
	PAGESPEED_API_KEY: z.string().optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

export type Env = Omit<EnvSchema, "CORS_ORIGINS"> & {
	CORS_ORIGINS: string[];
};

function loadEnv(): Env {
	const result = envSchema.safeParse(process.env);

	if (!result.success) {
		console.error("Invalid environment variables:", result.error.format());
		process.exit(1);
	}

	const data = result.data;

	// Default CORS_ORIGINS to FRONTEND_URL if not set
	const corsOrigins =
		data.CORS_ORIGINS && data.CORS_ORIGINS.length > 0
			? data.CORS_ORIGINS
			: [data.FRONTEND_URL];

	return { ...data, CORS_ORIGINS: corsOrigins };
}

export const env = loadEnv();
