import { auth } from "../src/lib/auth.js";
import { db } from "../src/lib/db.js";

const EMAIL = process.argv[2];
const PASSWORD = process.argv[3];

if (!EMAIL || !PASSWORD) {
	console.error("Usage: npx tsx scripts/create-admin.ts <email> <password>");
	process.exit(1);
}

async function main() {
	// Check if user already exists
	const existing = await db.user.findUnique({ where: { email: EMAIL } });

	if (existing) {
		// Just update to admin
		await db.user.update({
			where: { email: EMAIL },
			data: { role: "admin" },
		});
		console.log(`Updated ${EMAIL} to admin role`);
	} else {
		// Create via Better Auth
		const ctx = await auth.api.signUpEmail({
			body: { email: EMAIL, password: PASSWORD, name: "Admin" },
		});

		if (!ctx.user) {
			console.error("Failed to create user");
			process.exit(1);
		}

		// Update role to admin
		await db.user.update({
			where: { id: ctx.user.id },
			data: { role: "admin" },
		});
		console.log(`Created admin user: ${EMAIL}`);
	}

	await db.$disconnect();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
