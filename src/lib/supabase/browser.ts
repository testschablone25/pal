import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
import type { SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

export function createClient() {
	if (clientInstance) return clientInstance;

	clientInstance = createBrowserClient(
		supabaseConfig.url,
		supabaseConfig.publishableKey,
	);

	return clientInstance;
}
