// Supabase Admin Server Client
// Uses service_role key to bypass RLS.
// Use in server components where you need unrestricted DB access.

import { createClient as createAdmin } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

/**
 * Create a Supabase admin client (service role, bypasses RLS).
 * For use in server components and API routes that need unrestricted access.
 */
export async function createAdminClient() {
	return createAdmin(supabaseConfig.url, supabaseConfig.serviceKey);
}
