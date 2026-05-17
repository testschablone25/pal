import { Suspense, cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { PageSkeleton } from "@/components/page-skeleton";
import { GuestListsClient } from "./guest-lists-client";

// Cache admin client
const getAdmin = cache(() =>
	createAdminClient(supabaseConfig.url, supabaseConfig.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	}),
);

// ── Types (exported for use by client) ────────────────────────────────

export interface GuestListEntry {
	id: string;
	status: string;
}

export interface GuestListEvent {
	id: string;
	name: string;
	date: string;
	max_capacity: number | null;
}

export interface GuestList {
	id: string;
	name: string;
	event_id: string;
	created_at: string;
	event: GuestListEvent | null;
	entries: GuestListEntry[];
}

export interface FlatEvent {
	id: string;
	name: string;
}

// ── Server Page ───────────────────────────────────────────────────────

export default async function GuestListsPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const adminClient = getAdmin();

	const [guestListsResult, eventsResult] = await Promise.all([
		adminClient
			.from("guest_lists")
			.select(
				`*,
				event:events(id, name, date, max_capacity),
				entries:guest_entries(id, status)`,
			)
			.order("created_at", { ascending: false })
			.limit(50),
		adminClient
			.from("events")
			.select("id, name")
			.order("name", { ascending: true })
			.limit(100),
	]);

	const guestLists = (guestListsResult.data as GuestList[]) || [];
	const events = (eventsResult.data as FlatEvent[]) || [];

	return (
		<Suspense
			fallback={
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
					<PageSkeleton rows={6} />
				</div>
			}
		>
			<GuestListsClient initialGuestLists={guestLists} initialEvents={events} />
		</Suspense>
	);
}
