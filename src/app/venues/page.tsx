import { Suspense, cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { PageSkeleton } from "@/components/page-skeleton";
import { VenuesClient } from "./venues-client";
import type { Venue } from "./types";

const getAdmin = cache(() =>
	createAdminClient(supabaseConfig.url, supabaseConfig.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	}),
);

export type { Venue };

export default async function VenuesPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const adminClient = getAdmin();

	const { data: venues } = await adminClient
		.from("venues")
		.select(
			`*,
			sub_locations:venue_sub_locations(id, venue_id, name, description, capacity, created_at)`,
		)
		.order("name", { ascending: true });

	return (
		<Suspense
			fallback={
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
					<PageSkeleton rows={6} />
				</div>
			}
		>
			<VenuesClient initialVenues={(venues as Venue[]) || []} />
		</Suspense>
	);
}
