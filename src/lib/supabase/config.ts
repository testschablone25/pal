// Supabase client configuration
// Three-client setup: browser, server, and middleware

const supabaseUrl =
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	"https://cysoyvyjrhiukklxjqfe.supabase.co";
const supabasePublishableKey =
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
	"sb_publishable_ahfFFYMTd3pepNNsVDcTKA_6XDCgSqR";
// Service role key is optional - only needed for admin operations
// For production, set SUPABASE_SERVICE_ROLE_KEY environment variable
const supabaseServiceKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY ||
	"placeholder-service-key-for-build";

// Only warn server-side — the service role key is NOT a NEXT_PUBLIC_ variable,
// so it will always be undefined on the client/browser.
if (
	typeof window === "undefined" &&
	supabaseServiceKey === "placeholder-service-key-for-build"
) {
	console.warn(
		"[PAL] ⚠️  SUPABASE_SERVICE_ROLE_KEY is not set. API routes that use the admin client will fail. " +
			"Set SUPABASE_SERVICE_ROLE_KEY in your .env.local file.",
	);
}

export const supabaseConfig = {
	url: supabaseUrl,
	publishableKey: supabasePublishableKey,
	serviceKey: supabaseServiceKey,
};

export const isServer = typeof window === "undefined";
export const isMiddleware = typeof navigator === "undefined";
