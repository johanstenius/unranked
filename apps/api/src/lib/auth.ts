import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { env } from "../config/env.js";
import { db } from "./db.js";

export const auth = betterAuth({
	database: prismaAdapter(db, { provider: "postgresql" }),
	baseURL: env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`,
	secret: env.BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true,
	},
	session: {
		expiresIn: 60 * 60, // 1 hour
		updateAge: 60 * 5, // Refresh session every 5 minutes
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
		},
	},
	user: {
		additionalFields: {
			role: {
				type: "string",
				defaultValue: "user",
				input: false,
			},
		},
	},
	plugins: [twoFactor()],
	trustedOrigins: env.CORS_ORIGINS,
});

export type Auth = typeof auth;
