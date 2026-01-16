import crypto from "node:crypto";
import { z } from "zod";
import { env } from "../../config/env.js";
import { getErrorMessage } from "../../lib/errors.js";
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
		id: z.string(),
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
	email: string,
	customPrice?: number,
): Promise<string> {
	const successUrl = `${env.FRONTEND_URL}/audit/${customData.access_token}`;

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
						email,
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
		const url = await createLemonSqueezyCheckout(
			variantId,
			{
				audit_id: input.auditId,
				access_token: input.accessToken,
				tier: input.tier,
			},
			input.email,
		);
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
				access_token: input.accessToken,
				tier: input.toTier,
				upgrade_from: input.fromTier,
			},
			input.email,
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
			const orderId = data.id;
			if (status === "paid") {
				return {
					type: "checkout.completed" as const,
					auditId: customData.audit_id,
					tier: customData.tier,
					orderId,
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

export type RefundResult = {
	success: boolean;
	message: string;
	refundedAmount?: number;
};

export async function issueRefund(orderId: string): Promise<RefundResult> {
	try {
		const response = await fetch(
			`${LEMONSQUEEZY_API_URL}/orders/${orderId}/refund`,
			{
				method: "POST",
				headers: {
					Accept: "application/vnd.api+json",
					"Content-Type": "application/vnd.api+json",
					Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
				},
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			log.error(
				{ orderId, status: response.status, error: errorText },
				"Refund failed",
			);
			return {
				success: false,
				message: `Refund failed: ${response.status} ${errorText}`,
			};
		}

		const result = (await response.json()) as {
			data: {
				attributes: {
					refunded: boolean;
					refunded_amount: number;
				};
			};
		};

		const refunded = result.data.attributes.refunded;
		const refundedAmount = result.data.attributes.refunded_amount;

		if (refunded) {
			log.info({ orderId, refundedAmount }, "Refund successful");
			return {
				success: true,
				message: "Refund issued successfully",
				refundedAmount,
			};
		}

		return {
			success: false,
			message: "Refund was not processed",
		};
	} catch (error) {
		const message = getErrorMessage(error);
		log.error({ orderId, error: message }, "Refund exception");
		return {
			success: false,
			message: `Refund error: ${message}`,
		};
	}
}
