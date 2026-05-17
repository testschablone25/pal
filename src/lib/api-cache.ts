/**
 * Cache-Control header helpers for API routes.
 *
 * Usage in route handler:
 *   return NextResponse.json(data, { headers: cacheHeaders(30) });
 */

/**
 * Private cache for authenticated data.
 * @param maxAgeSeconds - how long the browser may keep the response (default 30)
 */
export function cacheHeaders(maxAgeSeconds = 30): Record<string, string> {
	return {
		"Cache-Control": `private, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`,
	};
}
