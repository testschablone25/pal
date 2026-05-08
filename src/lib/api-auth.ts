// API Route Auth & Permission Helpers
// Uses the middleware client (same pattern as proxy.ts) to read auth cookies
// from the NextRequest. The placeholder response carries any cookie changes
// (token refresh) that Supabase SSR needs.

import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import {
	hasPermission,
	isValidRole,
	type AppRole,
	type FeaturePermission,
} from "@/lib/permissions";

/** Singleton admin (service-role) client cached for the server process lifetime. */
let adminClient: ReturnType<typeof createAdminClient> | null = null;

function getAdmin(): ReturnType<typeof createAdminClient> {
	if (!adminClient) {
		adminClient = createAdminClient(
			supabaseConfig.url,
			supabaseConfig.serviceKey,
		);
	}
	return adminClient;
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
 * Authenticate request via middleware client + admin role lookup.
 * Returns null on auth failure.
 */
async function getAuthenticatedUser(
	request: NextRequest,
): Promise<{
	userId: string;
	userRoles: AppRole[];
} | null> {
	try {
		// Use the middleware client with a placeholder response.
		// This is the same pattern as proxy.ts — it reads cookies from the
		// NextRequest and can handle token refresh if needed.
		const placeholderResponse = NextResponse.next();
		const supabase = createMiddlewareClient(request, placeholderResponse);
		const {
			data: { session },
			error: sessionError,
		} = await supabase.auth.getSession();

		if (sessionError || !session?.user) return null;

		const admin = getAdmin();
		const { data } = await admin
			.from("user_roles")
			.select("role")
			.eq("user_id", session.user.id);

		const userRoles: AppRole[] = (
			data?.map((r: { role: string }) => r.role as AppRole) ?? []
		).filter(isValidRole);

		return { userId: session.user.id, userRoles };
	} catch (e) {
		console.error("api-auth getAuthenticatedUser error:", e);
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
	return getAdmin();
}
