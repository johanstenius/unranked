import crypto from "node:crypto";
import { z } from "zod";
import { env } from "../../config/env.js";
import { createLogger } from "../../lib/logger.js";
import { type AuditTier, auditTierSchema } from "../../schemas/audit.schema.js";
import type {
	BillingProvider,
	CheckoutInput,
	UpgradeCheckoutInput,
} from "./billing.js";
import { calculateUpgradePrice } from "./billing.js";

const log = createLogger("payments");

const LEMONSQUEEZY_API_URL = "https://api.lemonsqueezy.com/v1";

const webhookPayloadSchema = z.object({
	meta: z.object({
		event_name: z.string(),
		custom_data: z
			.object({
				audit_id: z.string(),
				tier: auditTierSchema,
			})
			.optional(),
	}),
	data: z.object({
		attributes: z.object({
			status: z.string(),
		}),
	}),
});

type LemonSqueezyCheckoutResponse = {
	data: {
		attributes: {
			url: string;
		};
	};
};

async function createLemonSqueezyCheckout(
	variantId: string,
	customData: Record<string, string>,
	customPrice?: number,
): Promise<string> {
	const successUrl = `${env.FRONTEND_URL}/audit/${customData.audit_id}`;

	const response = await fetch(`${LEMONSQUEEZY_API_URL}/checkouts`, {
		method: "POST",
		headers: {
			Accept: "application/vnd.api+json",
			"Content-Type": "application/vnd.api+json",
			Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
		},
		body: JSON.stringify({
			data: {
				type: "checkouts",
				attributes: {
					checkout_data: {
						custom: customData,
					},
					product_options: {
						redirect_url: successUrl,
					},
					...(customPrice !== undefined && { custom_price: customPrice }),
				},
				relationships: {
					store: {
						data: {
							type: "stores",
							id: env.LEMONSQUEEZY_STORE_ID,
						},
					},
					variant: {
						data: {
							type: "variants",
							id: variantId,
						},
					},
				},
			},
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`LemonSqueezy checkout failed: ${error}`);
	}

	const data = (await response.json()) as LemonSqueezyCheckoutResponse;
	return data.data.attributes.url;
}

function getVariantIdForTier(tier: Exclude<AuditTier, "FREE">): string {
	const variantIds = {
		SCAN: env.LEMONSQUEEZY_VARIANT_SCAN,
		AUDIT: env.LEMONSQUEEZY_VARIANT_AUDIT,
		DEEP_DIVE: env.LEMONSQUEEZY_VARIANT_DEEP_DIVE,
	};
	return variantIds[tier];
}

function verifySignature(payload: string, signature: string): boolean {
	const hmac = crypto.createHmac("sha256", env.LEMONSQUEEZY_WEBHOOK_SECRET);
	const digest = Buffer.from(hmac.update(payload).digest("hex"), "utf8");
	const signatureBuffer = Buffer.from(signature, "utf8");

	if (digest.length !== signatureBuffer.length) {
		return false;
	}

	return crypto.timingSafeEqual(digest, signatureBuffer);
}

export const lemonSqueezyProvider: BillingProvider = {
	async createCheckout(input: CheckoutInput) {
		if (input.tier === "FREE") {
			throw new Error("Cannot create checkout for FREE tier");
		}
		const variantId = getVariantIdForTier(input.tier);
		const url = await createLemonSqueezyCheckout(variantId, {
			audit_id: input.auditId,
			tier: input.tier,
		});
		return { url };
	},

	async createUpgradeCheckout(input: UpgradeCheckoutInput) {
		if (input.toTier === "FREE") {
			throw new Error("Cannot upgrade to FREE tier");
		}
		const variantId = getVariantIdForTier(input.toTier);
		const upgradePrice = calculateUpgradePrice(input.fromTier, input.toTier);
		const url = await createLemonSqueezyCheckout(
			variantId,
			{
				audit_id: input.auditId,
				tier: input.toTier,
				upgrade_from: input.fromTier,
			},
			upgradePrice,
		);
		return { url };
	},

	async handleWebhook(payload: string, signature: string) {
		if (!verifySignature(payload, signature)) {
			throw new Error("Invalid webhook signature");
		}

		const parsed = webhookPayloadSchema.safeParse(JSON.parse(payload));
		if (!parsed.success) {
			log.warn({ error: parsed.error.message }, "Invalid webhook payload");
			return null;
		}

		const { meta, data } = parsed.data;
		const customData = meta.custom_data;

		if (!customData) {
			log.warn({ event: meta.event_name }, "Webhook missing custom data");
			return null;
		}

		if (meta.event_name === "order_created") {
			const status = data.attributes.status;
			if (status === "paid") {
				return {
					type: "checkout.completed" as const,
					auditId: customData.audit_id,
					tier: customData.tier,
				};
			}
			if (status === "failed" || status === "refunded") {
				return {
					type: "checkout.failed" as const,
					auditId: customData.audit_id,
					reason: status,
				};
			}
		}

		return null;
	},
};
