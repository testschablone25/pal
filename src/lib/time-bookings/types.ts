// Shared types for time bookings module

export interface TimeBooking {
	id: string;
	staff_id: string;
	clocked_in_at: string;
	clocked_out_at: string | null;
	notes: string | null;
	corrected_by: string | null;
	created_at: string;
	updated_at: string;
	staff?: {
		id: string;
		role: string;
		profiles?: {
			id: string;
			full_name: string | null;
		} | null;
	} | null;
	corrector?: {
		id: string;
		full_name: string | null;
	} | null;
}

export interface StaffForKiosk {
	id: string;
	role: string;
	profiles?: {
		id: string;
		full_name: string | null;
		email: string | null;
	} | null;
}
