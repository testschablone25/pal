// Server-side sign out — properly clears auth cookies by operating
// on the request/response cookie store (unlike the browser client).

import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

export async function POST(request: NextRequest) {
	const response = NextResponse.json({ success: true });
	try {
		const supabase = createMiddlewareClient(request, response);
		await supabase.auth.signOut({ scope: "global" });
		return response;
	} catch (error) {
		console.error("Sign out error:", error);
		return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
	}
}
