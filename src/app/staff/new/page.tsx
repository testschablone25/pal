import { StaffForm } from "@/components/staff-form";

export default function NewStaffPage() {
	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">Add Staff Member</h1>
				<p className="text-zinc-400 mt-2">
					Register a new team member to your nightclub staff
				</p>
			</div>
			<StaffForm mode="create" />
		</div>
	);
}
