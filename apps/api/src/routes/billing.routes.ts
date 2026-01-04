import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import type { AppEnv } from "../app.js";
import { queueCrawlJob } from "../jobs/audit.jobs.js";
import { createLogger } from "../lib/logger.js";
import { getQueue } from "../lib/queue.js";
import * as auditRepo from "../repositories/audit.repository.js";
import {
	auditTierSchema,
	createAuditSchema,
	validateUrlRequestSchema,
	validateUrlResponseSchema,
} from "../schemas/audit.schema.js";
import { isValidUpgrade } from "../services/payments/billing.js";
import { lemonSqueezyProvider } from "../services/payments/lemonsqueezy.js";
import { validateSiteUrl } from "../services/url-validation.service.js";

const log = createLogger("billing");

export const billingRoutes = new OpenAPIHono<AppEnv>();

const FREE_TIER_RATE_LIMIT = 30;
const FREE_TIER_WINDOW_HOURS = 24;

// Validate URL endpoint
const validateUrlRoute = createRoute({
	method: "post",
	path: "/validate-url",
	request: {
		body: {
			content: {
				"application/json": {
					schema: validateUrlRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: validateUrlResponseSchema,
				},
			},
			description: "URL validation result",
		},
	},
});

billingRoutes.openapi(validateUrlRoute, async (c) => {
	const { url } = c.req.valid("json");
	const result = await validateSiteUrl(url);
	return c.json(result, 200);
});

const createCheckoutRoute = createRoute({
	method: "post",
	path: "/checkout",
	request: {
		body: {
			content: {
				"application/json": {
					schema: createAuditSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						checkoutUrl: z.string().nullable(),
						accessToken: z.string(),
					}),
				},
			},
			description: "Checkout session created or free audit started",
		},
		400: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Invalid or unreachable site URL",
		},
		429: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Rate limit exceeded for free tier",
		},
	},
});

billingRoutes.openapi(createCheckoutRoute, async (c) => {
	const body = c.req.valid("json");

	// Validate site URL is reachable
	const urlValidation = await validateSiteUrl(body.siteUrl);
	if (!urlValidation.valid) {
		return c.json({ error: urlValidation.error ?? "Site unreachable" }, 400);
	}

	// Rate limit FREE tier
	if (body.tier === "FREE") {
		const recentCount = await auditRepo.countRecentFreeAuditsByEmail(
			body.email,
			FREE_TIER_WINDOW_HOURS,
		);
		if (recentCount >= FREE_TIER_RATE_LIMIT) {
			return c.json(
				{ error: `Free tier limit: ${FREE_TIER_RATE_LIMIT} audits per day` },
				429,
			);
		}
	}

	const audit = await auditRepo.createAudit({
		siteUrl: body.siteUrl,
		productDesc: body.productDesc,
		competitors: body.competitors,
		sections: body.sections,
		tier: body.tier,
		email: body.email,
	});

	// FREE tier: start immediately without payment
	if (body.tier === "FREE") {
		const queue = await getQueue();
		await queueCrawlJob(queue, audit.id);
		return c.json({ checkoutUrl: null, accessToken: audit.accessToken }, 200);
	}

	// Paid tier: create checkout
	const { url } = await lemonSqueezyProvider.createCheckout({
		auditId: audit.id,
		tier: audit.tier,
		siteUrl: audit.siteUrl,
		email: audit.email,
	});

	return c.json({ checkoutUrl: url, accessToken: audit.accessToken }, 200);
});

// Webhook handler
billingRoutes.post("/webhooks/lemonsqueezy", async (c) => {
	const signature = c.req.header("x-signature");
	if (!signature) {
		return c.json({ error: "Missing signature" }, 400);
	}

	const payload = await c.req.text();

	try {
		const event = await lemonSqueezyProvider.handleWebhook(payload, signature);

		if (!event) {
			return c.json({ received: true }, 200);
		}

		if (event.type === "checkout.completed") {
			log.info(
				{ auditId: event.auditId, tier: event.tier },
				"Payment completed",
			);

			// Check current audit status - don't re-trigger if already processing/completed
			const audit = await auditRepo.getAuditById(event.auditId);
			if (!audit) {
				log.error({ auditId: event.auditId }, "Audit not found");
				return c.json({ received: true }, 200);
			}

			const isUpgrade = audit.tier !== event.tier;
			const canStart = audit.status === "PENDING" || isUpgrade;

			if (!canStart) {
				log.info(
					{ auditId: event.auditId, status: audit.status },
					"Skipping job queue - audit already processing",
				);
				return c.json({ received: true }, 200);
			}

			// Update audit tier and reset status for processing
			await auditRepo.updateAudit(event.auditId, {
				tier: event.tier,
				status: "PENDING",
			});

			// Start the crawl job
			const queue = await getQueue();
			await queueCrawlJob(queue, event.auditId);
		}

		if (event.type === "checkout.failed") {
			log.warn(
				{ auditId: event.auditId, reason: event.reason },
				"Payment failed",
			);
		}

		return c.json({ received: true }, 200);
	} catch (err) {
		log.error({ error: err }, "Webhook handling failed");
		return c.json({ error: "Webhook processing failed" }, 400);
	}
});

// Dev-only: Create audit and start directly (skips payment)
const devStartAuditRoute = createRoute({
	method: "post",
	path: "/dev/start-audit",
	request: {
		body: {
			content: {
				"application/json": {
					schema: createAuditSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({ accessToken: z.string() }),
				},
			},
			description: "Audit created and started",
		},
	},
});

billingRoutes.openapi(devStartAuditRoute, async (c) => {
	const body = c.req.valid("json");

	const audit = await auditRepo.createAudit({
		siteUrl: body.siteUrl,
		productDesc: body.productDesc,
		competitors: body.competitors,
		sections: body.sections,
		tier: body.tier,
		email: body.email,
	});

	const queue = await getQueue();
	await queueCrawlJob(queue, audit.id);

	return c.json({ accessToken: audit.accessToken }, 200);
});

// Upgrade endpoint
const upgradeRoute = createRoute({
	method: "post",
	path: "/audits/{token}/upgrade",
	request: {
		params: z.object({
			token: z.string(),
		}),
		body: {
			content: {
				"application/json": {
					schema: z.object({
						toTier: auditTierSchema,
					}),
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						checkoutUrl: z.string(),
					}),
				},
			},
			description: "Upgrade checkout created",
		},
		400: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Invalid upgrade",
		},
		404: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Audit not found or expired",
		},
	},
});

billingRoutes.openapi(upgradeRoute, async (c) => {
	const { token } = c.req.valid("param");
	const { toTier } = c.req.valid("json");

	const audit = await auditRepo.getAuditByAccessToken(token);
	if (!audit) {
		return c.json({ error: "Audit not found" }, 404);
	}

	if (audit.expiresAt < new Date()) {
		return c.json({ error: "Audit link has expired" }, 404);
	}

	if (!isValidUpgrade(audit.tier, toTier)) {
		return c.json({ error: `Invalid upgrade: ${audit.tier} → ${toTier}` }, 400);
	}

	const { url } = await lemonSqueezyProvider.createUpgradeCheckout({
		auditId: audit.id,
		fromTier: audit.tier,
		toTier,
		siteUrl: audit.siteUrl,
		email: audit.email,
	});

	return c.json({ checkoutUrl: url }, 200);
});
