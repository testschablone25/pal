import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "TASKS_READ");
		if (!auth.authorized) return auth.response;

		const { id } = await params;

		const { data, error } = await supabase
			.from("task_history")
			.select(`
        *,
        changed_by_profile:changed_by (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
			.eq("task_id", id)
			.order("created_at", { ascending: false });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ history: data || [] });
	} catch (error) {
		console.error("Error fetching task history:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
