// Time Bookings — Manager Dashboard
// /time-bookings/dashboard — view, correct, and export time bookings

import { DashboardView } from "@/components/time-bookings/dashboard-view";
import { StaffSubNav } from "@/components/staff/staff-sub-nav";

export default function TimeBookingsDashboardPage() {
	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">
					Zeiterfassung — Dashboard
				</h1>
				<p className="text-zinc-400 mt-2">
					View, correct, and export staff time bookings
				</p>
			</div>
			<StaffSubNav />
			<DashboardView />
		</div>
	);
}
