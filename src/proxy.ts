import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { supabaseConfig } from "@/lib/supabase/config";
import { canAccessRoute, type AppRole } from "@/lib/permissions";

// Routes that require authentication (any role)
const PROTECTED_ROUTES = [
	"/artists",
	"/events",
	"/door",
	"/staff",
	"/workflow",
	"/guest-lists",
	"/venues",
	"/admin",
	"/inventory",
	"/rentals",
	"/settings",
];

// Singleton admin client for the edge/middleware runtime
let adminClient: ReturnType<typeof createAdminClient> | null = null;
function getAdmin() {
	if (!adminClient) {
		adminClient = createAdminClient(
			supabaseConfig.url,
			supabaseConfig.serviceKey,
			{
				auth: { autoRefreshToken: false, persistSession: false },
			},
		);
	}
	return adminClient;
}

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Create response and Supabase client
	const response = NextResponse.next({
		request: {
			headers: request.headers,
		},
	});

	const supabase = createMiddlewareClient(request, response);

	// Refresh session if it exists
	const {
		data: { session },
	} = await supabase.auth.getSession();

	// Check if current path is protected
	const isProtectedRoute = PROTECTED_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);

	// If accessing a protected route without a session, redirect to login
	if (isProtectedRoute && !session) {
		const redirectUrl = new URL("/login", request.url);
		redirectUrl.searchParams.set("redirect", pathname);
		return NextResponse.redirect(redirectUrl);
	}

	// If logged in and trying to access login/signup, redirect to home.
	if (session && (pathname === "/login" || pathname === "/signup")) {
		// Avoid redirect loop: if the request already has a "redirect" param
		// pointing to /, the user is stuck in a loop — let them stay on login.
		const redirectParam = request.nextUrl.searchParams.get("redirect");
		if (redirectParam === "/") {
			return response;
		}
		return NextResponse.redirect(new URL("/", request.url));
	}

	// Role-based access control for protected routes
	if (session && isProtectedRoute && pathname !== "/") {
		// Use the admin (service-role) client to query user_roles.
		// The middleware client uses the user's JWT and is subject to RLS —
		// if RLS is missing or misconfigured, the query returns empty and
		// EVERY protected route gets redirected to the dashboard.
		const admin = getAdmin();
		const { data: roleData } = await admin
			.from("user_roles")
			.select("role")
			.eq("user_id", session.user.id);

		// Map to array of roles
		const userRoles: AppRole[] =
			(roleData as { role: string }[] | null)?.map((r) => r.role as AppRole) ||
			[];

		// Check if ANY of the user's roles grants access to this route
		if (!canAccessRoute(userRoles, pathname)) {
			// Redirect to dashboard with no error shown (user just doesn't have access)
			return NextResponse.redirect(new URL("/", request.url));
		}
	}

	return response;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
