import { Suspense, cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowClient, type WorkflowInitialData } from "./workflow-client";

// Cache admin client
const getAdmin = cache(() =>
	createAdminClient(supabaseConfig.url, supabaseConfig.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	}),
);

export default async function WorkflowPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const adminClient = getAdmin();
	const userId = user.id;

	const [tasksResult, eventsResult, profilesResult, venuesResult] =
		await Promise.all([
			// Tasks matching the API shape (with joins)
			adminClient
				.from("tasks")
				.select(
					`
					*,
					assignee:assignee_id (id, full_name, email, avatar_url),
					event:event_id (id, name, date),
					comments:task_comments(count)
				`,
					{ count: "exact" },
				)
				.order("created_at", { ascending: false })
				.limit(100),
			// Events for filter dropdowns
			adminClient
				.from("events")
				.select("id, name, venue_id")
				.order("date", { ascending: false })
				.limit(100),
			// Profiles for assignee filter
			adminClient
				.from("profiles")
				.select("id, full_name, email")
				.order("full_name", { ascending: true })
				.limit(100),
			// Venues for venue filter
			adminClient
				.from("venues")
				.select("id, name")
				.order("name", { ascending: true })
				.limit(50),
		]);

	const initialData: WorkflowInitialData = {
		currentUserId: userId,
		tasks: (tasksResult.data as WorkflowInitialData["tasks"]) || [],
		events: (eventsResult.data as WorkflowInitialData["events"]) || [],
		profiles: (profilesResult.data as WorkflowInitialData["profiles"]) || [],
		venues: (venuesResult.data as WorkflowInitialData["venues"]) || [],
	};

	return (
		<Suspense
			fallback={
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
					<Skeleton className="h-10 w-48 bg-zinc-800" />
					<Skeleton className="h-12 w-full bg-zinc-800 rounded-lg" />
					<div className="grid grid-cols-4 gap-4">
						{[...Array(4)].map((_, i) => (
							<Skeleton key={i} className="h-96 bg-zinc-800/60 rounded-lg" />
						))}
					</div>
				</div>
			}
		>
			<WorkflowClient initialData={initialData} />
		</Suspense>
	);
}
