// Migration: add is_pal_location column to venues
// Run: npx tsx scripts/run-migration-20260506.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function run() {
	if (!supabaseUrl || !supabaseServiceKey) {
		console.error(
			"Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
		);
		process.exit(1);
	}

	const supabase = createClient(supabaseUrl, supabaseServiceKey);

	console.log("Running migration: add is_pal_location to venues...");

	// Try using the pg_dump-style SQL execution
	// First, try a direct approach: fetch venues and catch the error
	const { data: test, error: testErr } = await supabase
		.from("venues")
		.select("is_pal_location")
		.limit(1);

	if (testErr && testErr.message?.includes("does not exist")) {
		console.log("Column does not exist. Need to add it.");
		console.log(`
    ╔══════════════════════════════════════════════════════════════╗
    ║  Please run this SQL in Supabase Dashboard → SQL Editor:    ║
    ║                                                              ║
    ║  ALTER TABLE venues ADD COLUMN IF NOT EXISTS                 ║
    ║    is_pal_location BOOLEAN NOT NULL DEFAULT true;            ║
    ╚══════════════════════════════════════════════════════════════╝
    `);
	} else if (testErr) {
		console.error("Unexpected error:", testErr.message);
	} else {
		console.log("Column already exists! ✅");
		console.log("Sample data:", test);
	}
}

run().catch(console.error);
