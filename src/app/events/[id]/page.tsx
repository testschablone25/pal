import { Suspense, cache } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { PageSkeleton } from "@/components/page-skeleton";
import {
  EventDetailClient,
  type EventDetailInitialData,
} from "./event-detail-client";

// Cache admin client
const getAdmin = cache(() =>
  createAdminClient(supabaseConfig.url, supabaseConfig.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }),
);

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;
  const adminClient = getAdmin();

  // Parallel adminClient queries
  const [
    eventResult,
    timeSlotsResult,
    guestListsResult,
    shiftsResult,
    tasksResult,
    staffResult,
    eventsResult,
  ] = await Promise.all([
    // Event details with venue join
    adminClient
      .from("events")
      .select("*, venues:venue_id (id, name, address, capacity)")
      .eq("id", id)
      .single(),

    // Time slots + performances + artists
    adminClient
      .from("time_slots")
      .select(
        "*, performances (id, artist_id, stage, order_index, artists:artist_id (id, name, city, genre))",
      )
      .eq("event_id", id)
      .order("slot_index", { ascending: true }),

    // Guest lists with entries
    adminClient
      .from("guest_lists")
      .select("*, entries:guest_entries(id, status, guest_name, plus_ones)")
      .eq("event_id", id)
      .order("created_at", { ascending: false }),

    // Shifts for this event
    adminClient
      .from("shifts")
      .select("id, staff_id, status, clocked_in_at")
      .eq("event_id", id),

    // Tasks filtered to this event
    adminClient
      .from("tasks")
      .select(
        "*, assignee:assignee_id (id, full_name, email, avatar_url)",
      )
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(100),

    // Staff profiles
    adminClient
      .from("staff")
      .select("id, profile_id, role, profiles:profile_id (id, full_name, email)")
      .limit(100),

    // All events (for task context)
    adminClient
      .from("events")
      .select("id, name")
      .limit(100),
  ]);

  if (eventResult.error || !eventResult.data) {
    notFound();
  }

  const event = eventResult.data;

  const initialData: EventDetailInitialData = {
    currentUserId: user.id,
    event: event as EventDetailInitialData["event"],
    timeSlots: (timeSlotsResult.data as EventDetailInitialData["timeSlots"]) || [],
    guestLists:
      (guestListsResult.data as EventDetailInitialData["guestLists"]) || [],
    shifts: (shiftsResult.data as EventDetailInitialData["shifts"]) || [],
    tasks: (tasksResult.data as EventDetailInitialData["tasks"]) || [],
    staff: (staffResult.data as EventDetailInitialData["staff"]) || [],
    events: (eventsResult.data as EventDetailInitialData["events"]) || [],
  };

  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <PageSkeleton rows={3} />
        </div>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
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
              <span className="text-white">{event.name}</span>
            </li>
          </ol>
        </nav>

        <EventDetailClient initialData={initialData} />
      </div>
    </Suspense>
  );
}
