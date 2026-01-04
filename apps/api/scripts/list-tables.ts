import { db } from "../src/lib/db.js";

async function main() {
	const tables = await db.$queryRaw<{ table_name: string }[]>`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public'
		ORDER BY table_name
	`;
	console.log("Tables in database:");
	for (const t of tables) {
		console.log(`  - ${t.table_name}`);
	}
	await db.$disconnect();
}

main();
