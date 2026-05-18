import { z } from "zod";

export const availabilityUpsertSchema = z.object({
	staff_id: z.string().uuid(),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	available: z.boolean(),
	reason: z.string().nullable().optional(),
});

export type AvailabilityUpsert = z.infer<typeof availabilityUpsertSchema>;
