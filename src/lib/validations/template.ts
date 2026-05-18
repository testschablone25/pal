import { z } from "zod";

export const templateSlotSchema = z.object({
	role: z.string().min(1),
	sub_location_id: z.string().uuid().nullable().optional(),
	count: z.number().int().min(1),
	start_offset_minutes: z.number().int(), // relative to door_time
	duration_minutes: z.number().int().min(30),
	break_minutes: z.number().int().min(0).default(0),
});

export const shiftTemplateSchema = z.object({
	name: z.string().min(1),
	description: z.string().nullable().optional(),
	slots: z.array(templateSlotSchema).min(1),
});

export type ShiftTemplate = z.infer<typeof shiftTemplateSchema>;
export type TemplateSlot = z.infer<typeof templateSlotSchema>;
