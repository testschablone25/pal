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
	sub_location_id?: string | null;
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
	"Tech Lead",
	"Backoffice",
	"Booking",
	"Gastro",
	"Night Management",
	"Trainee",
	"Awareness",
	"Social Media",
	"Label",
	"Staff",
	"Extern",
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
	"Tech Lead": "bg-purple-600",
	Backoffice: "bg-teal-600",
	Booking: "bg-amber-600",
	Gastro: "bg-orange-600",
	"Night Management": "bg-indigo-600",
	Trainee: "bg-zinc-600",
	Awareness: "bg-emerald-600",
	"Social Media": "bg-pink-600",
	Label: "bg-violet-600",
	Staff: "bg-cyan-600",
	Extern: "bg-orange-500",
};

const FALLBACK_COLORS = [
	"bg-blue-500",
	"bg-emerald-500",
	"bg-amber-500",
	"bg-rose-500",
	"bg-cyan-500",
	"bg-violet-500",
	"bg-orange-500",
	"bg-teal-500",
	"bg-indigo-500",
	"bg-pink-500",
	"bg-lime-500",
	"bg-sky-500",
];

/** Get a deterministic color for any role name, even if not in ROLE_COLORS */
export function getRoleColor(role: string): string {
	if (ROLE_COLORS[role]) return ROLE_COLORS[role];
	// Deterministic hash: sum char codes, pick from fallback palette
	let hash = 0;
	for (let i = 0; i < role.length; i++) {
		hash = ((hash << 5) - hash + role.charCodeAt(i)) | 0;
	}
	return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}
