import { z } from "zod";

export const shiftStatusEnum = z.enum([
	"draft",
	"scheduled",
	"confirmed",
	"completed",
	"cancelled",
]);

export const shiftCreateSchema = z.object({
	event_id: z.string().uuid(),
	staff_id: z.string().uuid(),
	role: z.string().min(1),
	sub_location_id: z.string().uuid().nullable().optional(),
	start_time: z.string().datetime({ offset: true }),
	end_time: z.string().datetime({ offset: true }),
	break_minutes: z.number().int().min(0).default(0),
	status: shiftStatusEnum.default("draft"),
});

// Separate update schema: no defaults — only include fields the client explicitly sends
export const shiftUpdateSchema = z.object({
	event_id: z.string().uuid().optional(),
	staff_id: z.string().uuid().optional(),
	role: z.string().min(1).optional(),
	sub_location_id: z.string().uuid().nullable().optional(),
	start_time: z.string().datetime({ offset: true }).optional(),
	end_time: z.string().datetime({ offset: true }).optional(),
	break_minutes: z.number().int().min(0).optional(),
	status: shiftStatusEnum.optional(),
});

export const shiftFilterSchema = z.object({
	event_id: z.string().uuid().optional(),
	staff_id: z.string().uuid().optional(),
	sub_location_id: z.string().uuid().optional(),
	status: shiftStatusEnum.optional(),
	date_from: z.string().optional(),
	date_to: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(200).default(100),
	offset: z.coerce.number().int().min(0).default(0),
});

export type ShiftCreate = z.infer<typeof shiftCreateSchema>;
export type ShiftUpdate = z.infer<typeof shiftUpdateSchema>;
export type ShiftFilter = z.infer<typeof shiftFilterSchema>;
