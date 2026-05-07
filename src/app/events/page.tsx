import { Suspense, cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { CalendarView, type Event } from "@/components/calendar-view";
import { PageSkeleton } from "@/components/page-skeleton";
import { format, startOfMonth, endOfMonth } from "date-fns";

// Cache admin client
const getAdmin = cache(() =>
	createAdminClient(supabaseConfig.url, supabaseConfig.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	}),
);

export default async function EventsPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const adminClient = getAdmin();

	// Pre-fetch current month's events for instant first paint
	const now = new Date();
	const start = format(startOfMonth(now), "yyyy-MM-dd");
	const end = format(endOfMonth(now), "yyyy-MM-dd");

	const { data: initialEvents } = await adminClient
		.from("events")
		.select(
			`*,
			venues:venue_id (name, capacity)`,
		)
		.gte("date", start)
		.lte("date", end)
		.order("date", { ascending: true })
		.limit(100);

	return (
		<Suspense
			fallback={
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
					<div className="mb-8">
						<div className="h-9 w-32 bg-zinc-800 rounded animate-pulse" />
						<div className="h-5 w-64 bg-zinc-800/60 rounded mt-2 animate-pulse" />
					</div>
					<PageSkeleton rows={6} />
				</div>
			}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-white">Events</h1>
					<p className="text-zinc-400 mt-2">
						Manage your nightclub events and nights
					</p>
				</div>
				<CalendarView initialEvents={(initialEvents as Event[]) || []} />
			</div>
		</Suspense>
	);
}
