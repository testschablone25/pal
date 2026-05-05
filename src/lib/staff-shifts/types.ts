// Shared types for staff shifts module

export interface Event {
	id: string;
	name: string;
	date: string;
	door_time: string | null;
	end_time: string | null;
}

export interface StaffMember {
	id: string;
	role: string;
	contract_type: string;
	profiles?: {
		full_name: string | null;
	} | null;
}

export interface Shift {
	id: string;
	event_id: string;
	staff_id: string;
	role: string;
	start_time: string;
	end_time: string;
	break_minutes: number;
	status: "scheduled" | "confirmed" | "completed" | "cancelled";
	clocked_in_at?: string | null;
	clocked_out_at?: string | null;
	staff?: StaffMember;
}

export interface BulkShiftInput {
	staff_id: string;
	role: string;
	start_time: string;
	end_time: string;
	break_minutes?: number;
}

export interface Availability {
	id: string;
	staff_id: string;
	date: string;
	available: boolean;
	reason: string | null;
}

export interface ConflictingShift {
	id: string;
	staff_id: string;
	start_time: string;
	end_time: string;
	status: string;
	role: string;
}

export interface SwapRequest {
	id: string;
	shiftId: string;
	requestedByStaffId: string;
	requestedToStaffId: string;
	status: "pending" | "accepted" | "declined" | "approved";
	reason?: string;
	requestedByName?: string;
}

export const STAFF_ROLES = [
	"Bar Staff",
	"Security",
	"Door Staff",
	"Cloakroom",
	"Cleaner",
	"Manager",
	"Sound Engineer",
	"Lighting",
	"VIP Host",
	"Runner",
];

export const ROLE_COLORS: Record<string, string> = {
	"Bar Staff": "bg-blue-600",
	Security: "bg-red-600",
	"Door Staff": "bg-orange-600",
	Cloakroom: "bg-cyan-600",
	Cleaner: "bg-gray-600",
	Manager: "bg-yellow-600",
	"Sound Engineer": "bg-pink-600",
	Lighting: "bg-indigo-600",
	"VIP Host": "bg-rose-600",
	Runner: "bg-teal-600",
};
