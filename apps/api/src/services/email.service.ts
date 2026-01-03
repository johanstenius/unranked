import { randomBytes } from "node:crypto";
import { SendPigeon } from "sendpigeon";
import { env } from "../config/env.js";
import { createLogger } from "../lib/logger.js";
import {
	alertBox,
	card,
	dataRow,
	footnote,
	heading,
	paragraph,
	wrapEmail,
} from "./email/templates/base.js";

const log = createLogger("email");

const REPORT_TOKEN_EXPIRY_DAYS = 30;

function getClient(): SendPigeon {
	const apiKey = process.env.SENDPIGEON_API_KEY;
	if (!apiKey) {
		throw new Error("SENDPIGEON_API_KEY not configured");
	}
	return new SendPigeon(apiKey);
}

export function generateReportToken(): string {
	return randomBytes(32).toString("hex");
}

export function getReportTokenExpiry(): Date {
	const expiry = new Date();
	expiry.setDate(expiry.getDate() + REPORT_TOKEN_EXPIRY_DAYS);
	return expiry;
}

export type SendReportEmailInput = {
	to: string;
	siteUrl: string;
	reportToken: string;
	healthScore?: number;
	healthGrade?: string;
	opportunitiesCount: number;
	briefsCount: number;
};

export async function sendReportReadyEmail(
	input: SendReportEmailInput,
): Promise<void> {
	const client = getClient();
	const fromEmail = process.env.SENDPIGEON_FROM_EMAIL;

	if (!fromEmail) {
		throw new Error("SENDPIGEON_FROM_EMAIL not configured");
	}

	const reportUrl = `${env.FRONTEND_URL}/report/${input.reportToken}`;
	const hostname = new URL(input.siteUrl).hostname;

	const html = buildReportEmailHtml({
		hostname,
		reportUrl,
		healthScore: input.healthScore,
		healthGrade: input.healthGrade,
		opportunitiesCount: input.opportunitiesCount,
		briefsCount: input.briefsCount,
	});

	const { error } = await client.send({
		from: fromEmail,
		to: input.to,
		subject: `Your Unranked report for ${hostname} is ready`,
		html,
	});

	if (error) {
		log.error({ error }, "SendPigeon error");
		throw new Error(`Failed to send email: ${error.message}`);
	}

	log.info({ to: input.to }, "Report email sent");
}

type EmailTemplateInput = {
	hostname: string;
	reportUrl: string;
	healthScore?: number;
	healthGrade?: string;
	opportunitiesCount: number;
	briefsCount: number;
};

function buildReportEmailHtml(input: EmailTemplateInput): string {
	const scoreSection =
		input.healthScore !== undefined
			? `
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <div style="font-size: 48px; font-weight: bold; color: #0f172a;">${input.healthScore}</div>
        <div style="font-size: 14px; color: #64748b; margin-top: 4px;">Health Score${input.healthGrade ? ` - ${input.healthGrade}` : ""}</div>
      </div>
    `
			: "";

	return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #0f172a;">Your SEO Audit is Ready</h1>
      <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px;">Site audit for <strong>${input.hostname}</strong></p>

      ${scoreSection}

      <div style="display: flex; gap: 20px; margin: 20px 0;">
        <div style="flex: 1; text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #0f172a;">${input.opportunitiesCount}</div>
          <div style="font-size: 12px; color: #64748b;">Opportunities</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #0f172a;">${input.briefsCount}</div>
          <div style="font-size: 12px; color: #64748b;">Content Briefs</div>
        </div>
      </div>

      <a href="${input.reportUrl}" style="display: block; background: #0f172a; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 500; text-align: center; margin-top: 24px;">
        View Your Report
      </a>

      <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
        This link expires in 30 days.
      </p>
    </div>

    <p style="margin: 20px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
      Unranked - SEO Audit Tool
    </p>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// DELAY AND FAILURE EMAILS
// ============================================================================

export type SendDelayEmailInput = {
	to: string;
	siteUrl: string;
	auditId: string;
};

export async function sendAuditDelayEmail(
	input: SendDelayEmailInput,
): Promise<void> {
	const client = getClient();
	const fromEmail = process.env.SENDPIGEON_FROM_EMAIL;

	if (!fromEmail) {
		throw new Error("SENDPIGEON_FROM_EMAIL not configured");
	}

	const hostname = new URL(input.siteUrl).hostname;

	const html = wrapEmail(
		card(
			heading(
				"Your Audit is Taking Longer",
				`Site audit for <strong>${hostname}</strong>`,
			) +
				alertBox(
					"We're still working on your SEO audit. Our keyword analysis is experiencing temporary delays, but don't worry - we're automatically retrying and will email you as soon as it's ready.",
					"warning",
				) +
				paragraph(
					"Technical SEO analysis is already complete and waiting for you. Once the full analysis is ready, you'll receive another email with access to your complete report.",
				) +
				footnote("No action needed - we'll notify you when it's ready."),
		),
	);

	const { error } = await client.send({
		from: fromEmail,
		to: input.to,
		subject: `Your Unranked audit for ${hostname} is taking longer than expected`,
		html,
	});

	if (error) {
		log.error({ error }, "SendPigeon error");
		throw new Error(`Failed to send delay email: ${error.message}`);
	}

	log.info({ to: input.to }, "Delay email sent");
}

export type SendFailureEmailInput = {
	to: string;
	siteUrl: string;
	auditId: string;
};

export async function sendAuditFailureEmail(
	input: SendFailureEmailInput,
): Promise<void> {
	const client = getClient();
	const fromEmail = process.env.SENDPIGEON_FROM_EMAIL;

	if (!fromEmail) {
		throw new Error("SENDPIGEON_FROM_EMAIL not configured");
	}

	const hostname = new URL(input.siteUrl).hostname;

	const html = wrapEmail(
		card(
			heading(
				"Issue With Your Audit",
				`Site audit for <strong>${hostname}</strong>`,
			) +
				alertBox(
					"We were unable to complete the full keyword analysis for your site due to temporary service issues. We apologize for the inconvenience.",
					"error",
				) +
				paragraph(
					"Your technical SEO analysis was completed and may still contain valuable insights. If you'd like us to retry or have any questions, please contact our support team.",
				) +
				footnote("We'll be happy to help resolve any issues."),
		),
	);

	const { error } = await client.send({
		from: fromEmail,
		to: input.to,
		subject: `Issue with your Unranked audit for ${hostname}`,
		html,
	});

	if (error) {
		log.error({ error }, "SendPigeon error");
		throw new Error(`Failed to send failure email: ${error.message}`);
	}

	log.info({ to: input.to }, "Failure email sent");
}

// ============================================================================
// INTERNAL SUPPORT ALERTS
// ============================================================================

const SUPPORT_EMAIL = "support@unranked.io";

export type SendSupportAlertInput = {
	auditId: string;
	siteUrl: string;
	email: string;
	tier: string;
	retryCount: number;
	failingComponents: string[];
};

/**
 * Send internal alert to support when a paid audit is struggling.
 * Triggered after N retries so team can intervene before 24h timeout.
 */
export async function sendSupportAlertEmail(
	input: SendSupportAlertInput,
): Promise<void> {
	const client = getClient();
	const fromEmail = process.env.SENDPIGEON_FROM_EMAIL;

	if (!fromEmail) {
		throw new Error("SENDPIGEON_FROM_EMAIL not configured");
	}

	const hostname = new URL(input.siteUrl).hostname;
	const isPaid = input.tier !== "FREE";

	const html = wrapEmail(
		card(
			heading(
				`${isPaid ? "🚨 PAID" : "⚠️"} Audit Struggling`,
				`${hostname} - ${input.tier} tier`,
			) +
				alertBox(
					`Audit has failed ${input.retryCount} retry attempts. Manual intervention may be needed.`,
					"error",
				) +
				dataRow("Audit ID", input.auditId, true) +
				dataRow("Customer Email", input.email) +
				dataRow(
					"Failing Components",
					input.failingComponents.join(", ") || "Unknown",
				) +
				paragraph(
					isPaid
						? "This is a PAID audit. Customer may need refund if not resolved."
						: "This is a free audit but still worth investigating.",
				) +
				footnote("Check DataForSEO/Claude dashboards for API issues."),
		),
	);

	const { error } = await client.send({
		from: fromEmail,
		to: SUPPORT_EMAIL,
		subject: `${isPaid ? "[PAID] " : ""}Audit struggling: ${hostname} (${input.retryCount} retries)`,
		html,
	});

	if (error) {
		log.error({ error }, "SendPigeon error sending support alert");
		throw new Error(`Failed to send support alert: ${error.message}`);
	}

	log.info({ auditId: input.auditId }, "Support alert email sent");
}
