// Shift Templates System
// Phase 3 - Nightclub Booking System

export interface ShiftTemplate {
	id: string;
	name: string;
	description: string;
	role: string;
	startTimeOffset: number; // minutes from event start (negative = before door_time)
	durationMinutes: number;
	breakMinutes: number;
}

export interface ShiftTemplateWithStaff extends ShiftTemplate {
	staffIds: string[];
}

export const SHIFT_TEMPLATES: ShiftTemplate[] = [
	{
		id: "bar-pre",
		name: "Bar Setup",
		description: "Pre-opening bar setup",
		role: "Bar Staff",
		startTimeOffset: -60,
		durationMinutes: 480,
		breakMinutes: 30,
	},
	{
		id: "bar-main",
		name: "Bar Main",
		description: "Main bar shift during club hours",
		role: "Bar Staff",
		startTimeOffset: 0,
		durationMinutes: 480,
		breakMinutes: 30,
	},
	{
		id: "bar-close",
		name: "Bar Close",
		description: "Bar closing and cleanup",
		role: "Bar Staff",
		startTimeOffset: 240,
		durationMinutes: 360,
		breakMinutes: 0,
	},
	{
		id: "door-pre",
		name: "Door Setup",
		description: "Pre-opening door setup",
		role: "Door Staff",
		startTimeOffset: -60,
		durationMinutes: 360,
		breakMinutes: 0,
	},
	{
		id: "door-main",
		name: "Door Main",
		description: "Main door shift",
		role: "Door Staff",
		startTimeOffset: 0,
		durationMinutes: 480,
		breakMinutes: 30,
	},
	{
		id: "security-pre",
		name: "Security Setup",
		description: "Pre-opening security",
		role: "Security",
		startTimeOffset: -60,
		durationMinutes: 480,
		breakMinutes: 30,
	},
	{
		id: "security-main",
		name: "Security Main",
		description: "Main security shift",
		role: "Security",
		startTimeOffset: 0,
		durationMinutes: 480,
		breakMinutes: 30,
	},
	{
		id: "cloakroom",
		name: "Cloakroom",
		description: "Cloakroom attendant",
		role: "Cloakroom",
		startTimeOffset: 0,
		durationMinutes: 480,
		breakMinutes: 30,
	},
	{
		id: "sound-engineer",
		name: "Sound Engineer",
		description: "Sound engineer shift",
		role: "Sound Engineer",
		startTimeOffset: -120,
		durationMinutes: 480,
		breakMinutes: 30,
	},
	{
		id: "lighting",
		name: "Lighting Tech",
		description: "Lighting technician",
		role: "Lighting",
		startTimeOffset: -120,
		durationMinutes: 480,
		breakMinutes: 30,
	},
	{
		id: "vip-host",
		name: "VIP Host",
		description: "VIP host shift",
		role: "VIP Host",
		startTimeOffset: 0,
		durationMinutes: 360,
		breakMinutes: 0,
	},
	{
		id: "runner",
		name: "Runner",
		description: "General runner shift",
		role: "Runner",
		startTimeOffset: 0,
		durationMinutes: 480,
		breakMinutes: 30,
	},
	{
		id: "cleaner-pre",
		name: "Pre-Event Clean",
		description: "Pre-event cleaning",
		role: "Cleaner",
		startTimeOffset: -120,
		durationMinutes: 240,
		breakMinutes: 0,
	},
	{
		id: "cleaner-post",
		name: "Post-Event Clean",
		description: "Post-event cleanup",
		role: "Cleaner",
		startTimeOffset: 360,
		durationMinutes: 240,
		breakMinutes: 0,
	},
];

// Group templates by role for UI display
export function groupTemplatesByRole(
	templates: ShiftTemplate[],
): Map<string, ShiftTemplate[]> {
	const groups = new Map<string, ShiftTemplate[]>();

	for (const template of templates) {
		const existing = groups.get(template.role) || [];
		existing.push(template);
		groups.set(template.role, existing);
	}

	return groups;
}

export function getTemplatesByRole(role: string): ShiftTemplate[] {
	return SHIFT_TEMPLATES.filter((t) => t.role === role);
}

export function getUniqueRoles(): string[] {
	return [...new Set(SHIFT_TEMPLATES.map((t) => t.role))];
}

// Calculate start/end times based on an event door_time
export function calculateTemplateTimes(
	template: ShiftTemplate,
	eventDate: string,
	doorTimeUtc: string,
): { start_time: string; end_time: string } {
	const doorDateTime = new Date(`${eventDate}T${doorTimeUtc}`);

	const startTime = new Date(
		doorDateTime.getTime() + template.startTimeOffset * 60 * 1000,
	);
	const endTime = new Date(
		startTime.getTime() + template.durationMinutes * 60 * 1000,
	);

	return {
		start_time: startTime.toISOString(),
		end_time: endTime.toISOString(),
	};
}
