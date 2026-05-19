import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";


export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "TASKS_READ");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

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
