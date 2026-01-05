import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import type { AdminContext } from "../middleware/require-admin.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { auditStatusSchema, auditTierSchema } from "../schemas/audit.schema.js";
import * as adminService from "../services/admin.service.js";

export const adminRoutes = new OpenAPIHono<AdminContext>();

// Apply admin middleware to admin routes only
adminRoutes.use("/admin/*", requireAdmin);

// ============================================================================
// Schemas
// ============================================================================

const costBreakdownSchema = z.object({
	dataforseo: z.number(),
	claude: z.number(),
	total: z.number(),
});

const auditListItemSchema = z.object({
	id: z.string(),
	email: z.string(),
	siteUrl: z.string(),
	tier: z.string(),
	status: z.string(),
	cost: costBreakdownSchema,
	createdAt: z.string().datetime(),
	completedAt: z.string().datetime().nullable(),
	briefsCount: z.number(),
	pagesCount: z.number(),
});

const auditListResponseSchema = z.object({
	audits: z.array(auditListItemSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
});

const auditDetailSchema = z.object({
	id: z.string(),
	email: z.string(),
	siteUrl: z.string(),
	productDesc: z.string().nullable(),
	competitors: z.array(z.string()),
	tier: z.string(),
	status: z.string(),
	accessToken: z.string(),
	lsOrderId: z.string().nullable(),
	cost: costBreakdownSchema,
	apiUsage: z.any().nullable(),
	progress: z.any().nullable(),
	healthScore: z.any().nullable(),
	createdAt: z.string(),
	startedAt: z.string().nullable(),
	completedAt: z.string().nullable(),
	expiresAt: z.string(),
	briefsCount: z.number(),
	pagesCount: z.number(),
	pagesFound: z.number().nullable(),
});

const statsResponseSchema = z.object({
	auditsByStatus: z.record(z.string(), z.number()),
	auditsByTier: z.record(z.string(), z.number()),
	totalCosts: costBreakdownSchema,
	totalAudits: z.number(),
});

const retryResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	componentsRun: z.array(z.string()).optional(),
	componentsFailed: z.array(z.string()).optional(),
});

const refundResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	refundedAmount: z.number().optional(),
});

// ============================================================================
// Routes
// ============================================================================

// List audits with filters
const listAuditsRoute = createRoute({
	method: "get",
	path: "/admin/audits",
	request: {
		query: z.object({
			page: z.coerce.number().min(1).default(1),
			limit: z.coerce.number().min(1).max(100).default(50),
			status: auditStatusSchema.optional(),
			tier: auditTierSchema.optional(),
			email: z.string().optional(),
			dateFrom: z.string().datetime().optional(),
			dateTo: z.string().datetime().optional(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: auditListResponseSchema,
				},
			},
			description: "List of audits",
		},
	},
});

adminRoutes.openapi(listAuditsRoute, async (c) => {
	const query = c.req.valid("query");

	const result = await adminService.listAudits({
		page: query.page,
		limit: query.limit,
		filters: {
			status: query.status,
			tier: query.tier,
			email: query.email,
			dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
			dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
		},
	});

	return c.json(
		{
			...result,
			audits: result.audits.map((a) => ({
				...a,
				createdAt: a.createdAt.toISOString(),
				completedAt: a.completedAt?.toISOString() ?? null,
			})),
		},
		200,
	);
});

// Get audit detail
const getAuditRoute = createRoute({
	method: "get",
	path: "/admin/audits/{id}",
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: auditDetailSchema,
				},
			},
			description: "Audit detail",
		},
		404: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Audit not found",
		},
	},
});

adminRoutes.openapi(getAuditRoute, async (c) => {
	const { id } = c.req.valid("param");

	const audit = await adminService.getAuditDetail(id);
	if (!audit) {
		return c.json({ error: "Audit not found" }, 404);
	}

	const response = {
		id: audit.id,
		email: audit.email,
		siteUrl: audit.siteUrl,
		productDesc: audit.productDesc,
		competitors: audit.competitors,
		tier: audit.tier,
		status: audit.status,
		accessToken: audit.accessToken,
		lsOrderId: audit.lsOrderId,
		cost: audit.cost,
		apiUsage: audit.apiUsage,
		progress: audit.progress,
		healthScore: audit.healthScore,
		createdAt: audit.createdAt.toISOString(),
		startedAt: audit.startedAt?.toISOString() ?? null,
		completedAt: audit.completedAt?.toISOString() ?? null,
		expiresAt: audit.expiresAt.toISOString(),
		briefsCount: audit.briefsCount,
		pagesCount: audit.pagesCount,
		pagesFound: audit.pagesFound,
	};

	return c.json(response, 200);
});

// Get stats
const getStatsRoute = createRoute({
	method: "get",
	path: "/admin/stats",
	responses: {
		200: {
			content: {
				"application/json": {
					schema: statsResponseSchema,
				},
			},
			description: "Admin stats",
		},
	},
});

adminRoutes.openapi(getStatsRoute, async (c) => {
	const stats = await adminService.getStats();
	return c.json(stats, 200);
});

// Retry audit
const retryAuditRoute = createRoute({
	method: "post",
	path: "/admin/audits/{id}/retry",
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: retryResponseSchema,
				},
			},
			description: "Retry result",
		},
	},
});

adminRoutes.openapi(retryAuditRoute, async (c) => {
	const { id } = c.req.valid("param");
	const result = await adminService.retryAudit(id);
	return c.json(result, 200);
});

// Refund audit
const refundAuditRoute = createRoute({
	method: "post",
	path: "/admin/audits/{id}/refund",
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: refundResponseSchema,
				},
			},
			description: "Refund result",
		},
	},
});

adminRoutes.openapi(refundAuditRoute, async (c) => {
	const { id } = c.req.valid("param");
	const result = await adminService.refundAudit(id);
	return c.json(result, 200);
});
