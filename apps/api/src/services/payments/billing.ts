import type { AuditTier } from "../../schemas/audit.schema.js";

const TIER_ORDER: Record<AuditTier, number> = {
	FREE: 0,
	SCAN: 1,
	AUDIT: 2,
	DEEP_DIVE: 3,
};

export type CheckoutInput = {
	auditId: string;
	accessToken: string;
	tier: AuditTier;
	siteUrl: string;
	email: string;
};

export type UpgradeCheckoutInput = {
	auditId: string;
	accessToken: string;
	fromTier: AuditTier;
	toTier: AuditTier;
	siteUrl: string;
	email: string;
};

export type WebhookEvent =
	| {
			type: "checkout.completed";
			auditId: string;
			tier: AuditTier;
			orderId: string;
	  }
	| { type: "checkout.failed"; auditId: string; reason: string };

export type BillingProvider = {
	createCheckout(input: CheckoutInput): Promise<{ url: string }>;
	createUpgradeCheckout(input: UpgradeCheckoutInput): Promise<{ url: string }>;
	handleWebhook(
		payload: string,
		signature: string,
	): Promise<WebhookEvent | null>;
};

export const tierPrices: Record<Exclude<AuditTier, "FREE">, number> = {
	SCAN: 900, // €9 in cents
	AUDIT: 2900, // €29 in cents
	DEEP_DIVE: 4900, // €49 in cents
};

export function isValidUpgrade(
	fromTier: AuditTier,
	toTier: AuditTier,
): boolean {
	return TIER_ORDER[toTier] > TIER_ORDER[fromTier];
}

export function calculateUpgradePrice(
	fromTier: AuditTier,
	toTier: AuditTier,
): number {
	if (!isValidUpgrade(fromTier, toTier)) {
		throw new Error(`Invalid upgrade: ${fromTier} → ${toTier}`);
	}
	if (fromTier === "FREE") {
		return tierPrices[toTier as Exclude<AuditTier, "FREE">];
	}
	const fromPrice = tierPrices[fromTier as Exclude<AuditTier, "FREE">];
	const toPrice = tierPrices[toTier as Exclude<AuditTier, "FREE">];
	return toPrice - fromPrice;
}
