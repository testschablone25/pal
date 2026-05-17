// ── Venue Types ───────────────────────────────────────────────────────

export interface SubLocation {
	id: string;
	venue_id: string;
	name: string;
	description: string | null;
	capacity: number | null;
	created_at: string;
}

export interface Venue {
	id: string;
	name: string;
	address: string | null;
	capacity: number;
	venue_type: string | null;
	notes: string | null;
	contact_name: string | null;
	contact_phone: string | null;
	contact_email: string | null;
	created_at: string;
	is_pal_location: boolean;
	sub_locations?: SubLocation[];
	open_task_count: number;
	urgent_task_count: number;
	upcoming_events_count: number;
	staff_count: number;
	inventory_count: number;
}
