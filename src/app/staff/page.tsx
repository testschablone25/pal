import { Suspense, cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffClient } from "./staff-client";

const getAdmin = cache(() =>
	createAdminClient(supabaseConfig.url, supabaseConfig.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	}),
);

export default async function StaffPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const adminClient = getAdmin();

	const { data: staff, count } = await adminClient
		.from("staff")
		.select(
			`*,
			profiles:profile_id (id, full_name, email)`,
			{ count: "exact" },
		)
		.order("created_at", { ascending: false })
		.limit(100);

	return (
		<Suspense
			fallback={
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
					<Skeleton className="h-10 w-48 bg-zinc-800" />
					<Skeleton className="h-64 w-full bg-zinc-800 rounded-lg" />
				</div>
			}
		>
			<StaffClient initialStaff={(staff as Array<Record<string, unknown>>) || []} initialTotal={count || 0} />
		</Suspense>
	);
}
