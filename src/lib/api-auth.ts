// API Route Auth & Permission Helpers
// Provides a consistent way to authenticate users and check permissions
// in all API routes across the application.
//
// Uses a read-only Supabase client created from the NextRequest cookies
// so auth works correctly in Next.js 16 API route handlers.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import {
	hasPermission,
	isValidRole,
	type AppRole,
	type FeaturePermission,
} from "@/lib/permissions";

/** Singleton admin (service-role) client — cached across the lifetime of the
 *  server process for API-route DB operations that bypass RLS. */
let adminClient: ReturnType<typeof createAdminClient> | null = null;

function getAdminClientSingleton(): ReturnType<typeof createAdminClient> {
	if (adminClient) return adminClient;
	adminClient = createAdminClient(
		supabaseConfig.url,
		supabaseConfig.serviceKey,
	);
	return adminClient;
}

/**
 * Create a Supabase client that reads auth cookies from the NextRequest.
 * Token-refresh writes are no-ops — the client-side handles that.
 */
function createRequestClient(request: NextRequest) {
	return createServerClient(supabaseConfig.url, supabaseConfig.publishableKey, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll() {
				// Read-only — token refresh is handled by the browser client
			},
		},
	});
}

/**
 * Result of an auth check.
 * If `authorized` is false, `response` contains the error response to return.
 */
export interface AuthCheckResult {
	authorized: boolean;
	userId: string | null;
	userRoles: AppRole[];
	response?: NextResponse;
}

/**
 * Internal: get the authenticated user and their roles.
 * Returns null on auth failure.
 */
async function getAuthenticatedUser(request: NextRequest): Promise<{
	userId: string;
	userRoles: AppRole[];
} | null> {
	try {
		const supabase = createRequestClient(request);
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) return null;

		// Use admin client to fetch roles (bypasses RLS)
		const admin = getAdminClientSingleton();
		const { data } = await admin
			.from("user_roles")
			.select("role")
			.eq("user_id", user.id);

		const userRoles: AppRole[] = (
			data?.map((r: { role: string }) => r.role as AppRole) ?? []
		).filter(isValidRole);

		return { userId: user.id, userRoles };
	} catch {
		return null;
	}
}

function unauthorizedResponse(): AuthCheckResult {
	return {
		authorized: false,
		userId: null,
		userRoles: [],
		response: NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		),
	};
}

function forbiddenResponse(
	userId: string,
	userRoles: AppRole[],
): AuthCheckResult {
	return {
		authorized: false,
		userId,
		userRoles,
		response: NextResponse.json(
			{ error: "Insufficient permissions" },
			{ status: 403 },
		),
	};
}

function serverErrorResponse(): AuthCheckResult {
	return {
		authorized: false,
		userId: null,
		userRoles: [],
		response: NextResponse.json(
			{ error: "Authentication check failed" },
			{ status: 500 },
		),
	};
}

/**
 * Authenticate the request and check if the user has a specific feature permission.
 *
 * @param request - The incoming NextRequest
 * @param requiredPermission - The feature permission to check
 * @returns AuthCheckResult with user info if authorized, or an error response
 *
 * Usage:
 *   const auth = await requireAuth(request, "STAFF_WRITE");
 *   if (!auth.authorized) return auth.response;
 */
export async function requireAuth(
	request: NextRequest,
	requiredPermission: FeaturePermission,
): Promise<AuthCheckResult> {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) return unauthorizedResponse();
		if (!hasPermission(user.userRoles, requiredPermission)) {
			return forbiddenResponse(user.userId, user.userRoles);
		}
		return { authorized: true, userId: user.userId, userRoles: user.userRoles };
	} catch {
		return serverErrorResponse();
	}
}

/**
 * Authenticate the request and get user info without permission check.
 * Useful for routes where access is allowed to any authenticated user.
 */
export async function authenticate(
	request: NextRequest,
): Promise<AuthCheckResult> {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) return unauthorizedResponse();
		return { authorized: true, userId: user.userId, userRoles: user.userRoles };
	} catch {
		return serverErrorResponse();
	}
}

/**
 * Get a Supabase admin client (service_role) for API route DB operations.
 */
export function getAdminClient() {
	return getAdminClientSingleton();
}
