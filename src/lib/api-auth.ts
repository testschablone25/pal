// API Route Auth & Permission Helpers
// Provides a consistent way to authenticate users and check permissions
// in all API routes across the application.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import {
	hasPermission,
	isValidRole,
	type AppRole,
	type FeaturePermission,
} from "@/lib/permissions";

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
async function getAuthenticatedUser(): Promise<{
	userId: string;
	userRoles: AppRole[];
} | null> {
	try {
		const supabase = await createClient();
		const { data: userData, error: authError } = await supabase.auth.getUser();

		if (authError || !userData?.user) return null;

		const adminClient = createAdminClient(
			supabaseConfig.url,
			supabaseConfig.serviceKey,
		);
		const { data } = await adminClient
			.from("user_roles")
			.select("role")
			.eq("user_id", userData.user.id);

		const userRoles: AppRole[] = (
			data?.map((r: { role: string }) => r.role as AppRole) ?? []
		).filter(isValidRole);

		return { userId: userData.user.id, userRoles };
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
 * @param _request - The incoming NextRequest
 * @param requiredPermission - The feature permission to check
 * @returns AuthCheckResult with user info if authorized, or an error response
 *
 * Usage:
 *   const auth = await requireAuth(request, "STAFF_WRITE");
 *   if (!auth.authorized) return auth.response;
 */
export async function requireAuth(
	_request: NextRequest,
	requiredPermission: FeaturePermission,
): Promise<AuthCheckResult> {
	try {
		const user = await getAuthenticatedUser();
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
	_request: NextRequest,
): Promise<AuthCheckResult> {
	try {
		const user = await getAuthenticatedUser();
		if (!user) return unauthorizedResponse();
		return { authorized: true, userId: user.userId, userRoles: user.userRoles };
	} catch {
		return serverErrorResponse();
	}
}

/**
 * Get the Supabase admin client (service_role) for API route DB operations.
 */
export function getAdminClient() {
	return createAdminClient(supabaseConfig.url, supabaseConfig.serviceKey);
}
