import { Suspense, cache } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { PageSkeleton } from "@/components/page-skeleton";
import { EditEventClient } from "./edit-event-client";

// Cache admin client
const getAdmin = cache(() =>
	createAdminClient(supabaseConfig.url, supabaseConfig.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	}),
);

interface EditEventPageProps {
	params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const { id } = await params;
	const adminClient = getAdmin();

	const { data: event } = await adminClient
		.from("events")
		.select("*")
		.eq("id", id)
		.single();

	if (!event) notFound();

	// Strip seconds from time fields for the form (e.g. "22:00:00" → "22:00")
	const formattedEvent = {
		id: event.id,
		name: event.name,
		date: event.date,
		venue_id: event.venue_id,
		door_time: event.door_time ? event.door_time.slice(0, 5) : null,
		end_time: event.end_time ? event.end_time.slice(0, 5) : null,
		status: event.status,
		max_capacity: event.max_capacity,
	};

	return (
		<Suspense
			fallback={
				<div className="max-w-3xl mx-auto px-4 py-8">
					<PageSkeleton rows={3} />
				</div>
			}
		>
			<div className="max-w-3xl mx-auto px-4 py-8">
				{/* Breadcrumbs */}
				<nav className="text-sm text-zinc-400 mb-6" aria-label="Breadcrumb">
					<ol className="flex items-center flex-wrap gap-1">
						<li>
							<Link
								href="/"
								className="hover:text-violet-400 transition-colors"
							>
								Dashboard
							</Link>
						</li>
						<li>
							<span className="mx-1 text-zinc-600">/</span>
							<Link
								href="/events"
								className="hover:text-violet-400 transition-colors"
							>
								Events
							</Link>
						</li>
						<li>
							<span className="mx-1 text-zinc-600">/</span>
							<Link
								href={`/events/${event.id}`}
								className="hover:text-violet-400 transition-colors"
							>
								{formattedEvent.name}
							</Link>
						</li>
						<li>
							<span className="mx-1 text-zinc-600">/</span>
							<span className="text-white">Edit</span>
						</li>
					</ol>
				</nav>

				<div className="mb-8">
					<h1 className="text-3xl font-bold text-white">
						Edit Event
					</h1>
					<p className="text-zinc-400 mt-2">Update event details</p>
				</div>

				<EditEventClient event={formattedEvent} />
			</div>
		</Suspense>
	);
}
