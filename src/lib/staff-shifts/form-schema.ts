import { z } from "zod";

export const shiftSchema = z.object({
	staff_id: z.string().min(1, "Staff member is required"),
	role: z.string().min(1, "Role is required"),
	sub_location_id: z.string().optional(),
	start_time: z.string().min(1, "Start time is required"),
	end_time: z.string().min(1, "End time is required"),
	break_minutes: z.number().min(0),
	status: z.enum(["scheduled", "confirmed", "completed", "cancelled"]),
});

export type ShiftFormValues = z.infer<typeof shiftSchema>;
