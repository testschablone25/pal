// Time Bookings — iPad Kiosk
// /time-bookings — Staff clock in/out page

import { createAdminClient } from "@/lib/supabase/admin";
import { KioskView } from "@/components/time-bookings/kiosk-view";
import { StaffSubNav } from "@/components/staff/staff-sub-nav";
import type { StaffForKiosk } from "@/lib/time-bookings/types";

export default async function TimeBookingsPage() {
	const supabase = await createAdminClient();

	const { data: staff } = await supabase
		.from("staff")
		.select(
			`
			id,
			role,
			profiles:profile_id (
				id,
				full_name,
				email
			)
		`,
		)
		.order("role", { ascending: true });

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-4">
				<h1 className="text-3xl font-bold text-white">Time Bookings</h1>
				<p className="text-zinc-400 mt-1">
					Clock in and out — tap your name on the kiosk
				</p>
			</div>
			<StaffSubNav />
			<KioskView staff={(staff as unknown as StaffForKiosk[]) ?? []} />
		</div>
	);
}
