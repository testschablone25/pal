"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { createClient } from "@/lib/supabase/browser";

function AvailabilityPageInner() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const viewParam = searchParams.get("view");
	const [staffMemberId, setStaffMemberId] = useState<string | undefined>(
		undefined,
	);
	const [loadingStaff, setLoadingStaff] = useState(viewParam === "me");
	const fetchedRef = useRef(false);

	// Determine initial view mode from URL
	const initialMode = viewParam === "me" ? "self" : "all";
	const [viewMode, setViewMode] = useState<"self" | "all">(initialMode);

	// When in "self" mode, fetch staff to find current user's staff record
	useEffect(() => {
		if (viewMode === "self" && !fetchedRef.current) {
			fetchedRef.current = true;
			fetch("/api/staff")
				.then((res) => res.json())
				.then(async (data) => {
					const staffList = data.staff || [];
					if (staffList.length > 0) {
						// Match the logged-in user's profile_id to find their staff record
						const supabase = createClient();
						const {
							data: { user },
						} = await supabase.auth.getUser();
						if (user) {
							const myStaffRecord = staffList.find(
								(s: Record<string, unknown>) => s.profile_id === user.id,
							);
							if (myStaffRecord) {
								setStaffMemberId(myStaffRecord.id as string);
							}
						}
					}
					setLoadingStaff(false);
				})
				.catch((err) => {
					console.error("Failed to fetch staff:", err);
					setLoadingStaff(false);
				});
		} else if (viewMode === "all") {
			// Reset so re-selecting "self" refetches
			fetchedRef.current = false;
		}
	}, [viewMode]);

	const handleViewModeChange = (mode: "self" | "all") => {
		setViewMode(mode);
		// Update URL to reflect view mode
		const params = new URLSearchParams(searchParams.toString());
		if (mode === "self") {
			params.set("view", "me");
		} else {
			params.delete("view");
		}
		const newSearch = params.toString();
		const url = newSearch
			? `/staff/availability?${newSearch}`
			: "/staff/availability";
		router.push(url, { scroll: false });
	};

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">Staff Availability</h1>
				<p className="text-zinc-400 mt-2">
					Manage staff availability and time-off requests
				</p>
			</div>
			{loadingStaff ? (
				<div className="flex items-center justify-center py-12">
					<div className="text-zinc-400">Loading...</div>
				</div>
			) : (
				<AvailabilityCalendar
					viewMode={viewMode}
					staffMemberId={staffMemberId}
					onViewModeChange={handleViewModeChange}
				/>
			)}
		</div>
	);
}

export default function AvailabilityPage() {
	return (
		<Suspense
			fallback={
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-white">
							Staff Availability
						</h1>
						<p className="text-zinc-400 mt-2">
							Manage staff availability and time-off requests
						</p>
					</div>
					<div className="flex items-center justify-center py-12">
						<div className="text-zinc-400">Loading...</div>
					</div>
				</div>
			}
		>
			<AvailabilityPageInner />
		</Suspense>
	);
}
