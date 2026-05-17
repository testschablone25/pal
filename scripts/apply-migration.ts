import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
	const migrationPath = path.join(
		process.cwd(),
		"supabase",
		"migrations",
		"20260429000000_venue_sublocations_and_inventory_align.sql",
	);
	const sql = fs.readFileSync(migrationPath, "utf-8");

	console.log(
		"Applying migration: 20260429000000_venue_sublocations_and_inventory_align.sql",
	);
	console.log("Connecting to:", supabaseUrl);

	const { error } = await supabase.rpc("exec_sql", { sql });

	if (error) {
		console.error("Migration error:", error.message);
		process.exit(1);
	}

	console.log("Migration applied successfully!");
}

main().catch(console.error);
