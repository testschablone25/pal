// Time Booking Validation Schemas

import { z } from "zod";

// Filter params for GET /api/time-bookings
export const timeBookingFilterSchema = z.object({
	date_from: z.string().datetime().optional(),
	date_to: z.string().datetime().optional(),
	staff_id: z.string().uuid().optional(),
	limit: z.coerce.number().int().min(1).max(500).default(100),
	offset: z.coerce.number().int().min(0).default(0),
});

// Manager correction — optional fields, at least one must be provided
export const timeBookingUpdateSchema = z
	.object({
		clocked_in_at: z.string().datetime().optional(),
		clocked_out_at: z.string().datetime().nullable().optional(),
		notes: z.string().max(500).optional(),
	})
	.refine(
		(data) =>
			data.clocked_in_at !== undefined ||
			data.clocked_out_at !== undefined ||
			data.notes !== undefined,
		{ message: "At least one field must be provided" },
	);
