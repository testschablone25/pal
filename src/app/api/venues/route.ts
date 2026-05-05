// Venues API
// Nightclub Booking System

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAuth } from "@/lib/api-auth";

const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// GET /api/venues - List all venues with aggregated stats
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "VENUES_READ");
		if (!auth.authorized) return auth.response;
		const { data: venues, error } = await supabase
			.from("venues")
			.select("*")
			.order("name", { ascending: true });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		const venueIds = venues?.map((v) => v.id) || [];

		if (venueIds.length === 0) {
			return NextResponse.json({ venues: [] });
		}

		// Fetch sub-locations for all venues
		const { data: subLocations } = await supabase
			.from("venue_sub_locations")
			.select("*")
			.in("venue_id", venueIds)
			.order("name", { ascending: true });

		const subLocationsByVenue: Record<string, unknown[]> = {};
		if (subLocations) {
			for (const sl of subLocations) {
				if (!subLocationsByVenue[sl.venue_id]) {
					subLocationsByVenue[sl.venue_id] = [];
				}
				subLocationsByVenue[sl.venue_id].push(sl);
			}
		}

		// Fetch all events for these venues
		const { data: venueEvents } = await supabase
			.from("events")
			.select("id, venue_id")
			.in("venue_id", venueIds);

		const eventsByVenue: Record<string, string[]> = {};
		const allEventIds: string[] = [];
		if (venueEvents) {
			for (const evt of venueEvents) {
				if (!eventsByVenue[evt.venue_id]) {
					eventsByVenue[evt.venue_id] = [];
				}
				eventsByVenue[evt.venue_id].push(evt.id);
				allEventIds.push(evt.id);
			}
		}

		// Fetch open tasks for events at these venues
		const openTasksByVenue: Record<string, number> = {};
		const urgentTasksByVenue: Record<string, number> = {};
		if (allEventIds.length > 0) {
			const { data: venueTasks } = await supabase
				.from("tasks")
				.select("id, event_id, priority, status, due_date")
				.in("event_id", allEventIds)
				.not("status", "in", "(done,cancelled)");

			if (venueTasks) {
				for (const task of venueTasks) {
					for (const [vid, evtIds] of Object.entries(eventsByVenue)) {
						if (evtIds.includes(task.event_id)) {
							openTasksByVenue[vid] = (openTasksByVenue[vid] || 0) + 1;
							if (
								task.priority === "urgent" ||
								(task.due_date &&
									new Date(task.due_date) < new Date() &&
									task.status !== "done")
							) {
								urgentTasksByVenue[vid] = (urgentTasksByVenue[vid] || 0) + 1;
							}
						}
					}
				}
			}
		}

		// Also count tasks linked directly to venues (no event)
		const { data: directVenueTasks } = await supabase
			.from("tasks")
			.select("id, venue_id, priority, status, due_date")
			.in("venue_id", venueIds)
			.not("status", "in", "(done,cancelled)");

		if (directVenueTasks) {
			for (const task of directVenueTasks) {
				if (!task.venue_id) continue;
				openTasksByVenue[task.venue_id] =
					(openTasksByVenue[task.venue_id] || 0) + 1;
				if (
					task.priority === "urgent" ||
					(task.due_date &&
						new Date(task.due_date) < new Date() &&
						task.status !== "done")
				) {
					urgentTasksByVenue[task.venue_id] =
						(urgentTasksByVenue[task.venue_id] || 0) + 1;
				}
			}
		}

		// Count upcoming events per venue
		const today = new Date().toISOString().split("T")[0];
		const upcomingEventsByVenue: Record<string, number> = {};
		if (venueEvents) {
			const { data: upcomingEvents } = await supabase
				.from("events")
				.select("id, venue_id")
				.in("venue_id", venueIds)
				.gte("date", today);

			if (upcomingEvents) {
				for (const evt of upcomingEvents) {
					upcomingEventsByVenue[evt.venue_id] =
						(upcomingEventsByVenue[evt.venue_id] || 0) + 1;
				}
			}
		}

		// Count staff with upcoming shifts at venue events
		const staffCountByVenue: Record<string, number> = {};
		if (allEventIds.length > 0) {
			const { data: upcomingShifts } = await supabase
				.from("shifts")
				.select("id, event_id, staff_id")
				.in("event_id", allEventIds)
				.gte("start_time", new Date().toISOString())
				.eq("status", "scheduled");

			if (upcomingShifts) {
				const staffSetByVenue: Record<string, Set<string>> = {};
				for (const shift of upcomingShifts) {
					for (const [vid, evtIds] of Object.entries(eventsByVenue)) {
						if (evtIds.includes(shift.event_id)) {
							if (!staffSetByVenue[vid]) {
								staffSetByVenue[vid] = new Set();
							}
							staffSetByVenue[vid].add(shift.staff_id);
						}
					}
				}
				for (const [vid, staffSet] of Object.entries(staffSetByVenue)) {
					staffCountByVenue[vid] = staffSet.size;
				}
			}
		}

		// Count inventory items at this venue (via sub-locations)
		const inventoryCountByVenue: Record<string, number> = {};
		const allSubLocationIds = Object.values(subLocationsByVenue)
			.flat()
			.map((sl) => (sl as Record<string, unknown>).id as string)
			.filter(Boolean);

		if (allSubLocationIds.length > 0) {
			const { data: venueItems } = await supabase
				.from("items")
				.select("id, sub_location_id")
				.in("sub_location_id", allSubLocationIds);

			if (venueItems) {
				for (const item of venueItems) {
					for (const [vid, sls] of Object.entries(subLocationsByVenue)) {
						const found = sls.some(
							(sl) =>
								(sl as Record<string, unknown>).id === item.sub_location_id,
						);
						if (found) {
							inventoryCountByVenue[vid] =
								(inventoryCountByVenue[vid] || 0) + 1;
							break;
						}
					}
				}
			}
		}

		// Assemble final response
		const venuesWithStats = (venues || []).map((venue) => ({
			...venue,
			sub_locations: subLocationsByVenue[venue.id] || [],
			open_task_count: openTasksByVenue[venue.id] || 0,
			urgent_task_count: urgentTasksByVenue[venue.id] || 0,
			upcoming_events_count: upcomingEventsByVenue[venue.id] || 0,
			staff_count: staffCountByVenue[venue.id] || 0,
			inventory_count: inventoryCountByVenue[venue.id] || 0,
		}));

		return NextResponse.json({ venues: venuesWithStats });
	} catch (error) {
		console.error("Error fetching venues:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/venues - Create a new venue
export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(request, "VENUES_WRITE");
		if (!auth.authorized) return auth.response;

		const body = await request.json();

		const {
			name,
			address,
			capacity,
			venue_type,
			contact_name,
			contact_phone,
			contact_email,
			notes,
		} = body;

		if (!name || !capacity) {
			return NextResponse.json(
				{ error: "Name and capacity are required" },
				{ status: 400 },
			);
		}

		const insertPayload: Record<string, unknown> = {
			name,
			address,
			capacity,
			contact_name: contact_name || null,
			contact_phone: contact_phone || null,
			contact_email: contact_email || null,
			notes: notes || null,
		};
		if (venue_type) {
			insertPayload.venue_type = venue_type;
		}

		const { data, error } = await supabase
			.from("venues")
			.insert(insertPayload)
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating venue:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
