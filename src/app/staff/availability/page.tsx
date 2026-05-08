"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { AlertTriangle } from "lucide-react";
import { StaffSubNav } from "@/components/staff/staff-sub-nav";

function AvailabilityPageInner() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const viewParam = searchParams.get("view");
	const [staffMemberId, setStaffMemberId] = useState<string | undefined>(
		undefined,
	);
	const [loadingStaff, setLoadingStaff] = useState(viewParam === "me");
	const [staffError, setStaffError] = useState<string | null>(null);

	// Determine initial view mode from URL
	const initialMode = viewParam === "me" ? "self" : "all";
	const [viewMode, setViewMode] = useState<"self" | "all">(initialMode);

	// When in "self" mode, fetch the current user's staff record.
	// Uses the dedicated /api/staff/me endpoint which does the matching
	// server-side (avoids fragile client-side getUser + profile_id matching).
	// No `fetchedRef` guard here — React 19 Strict Mode preserves useRef
	// values across unmount/remount, which would skip the second mount.
	useEffect(() => {
		if (viewMode !== "self") return;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000);

		fetch("/api/staff/me", { signal: controller.signal })
			.then((res) => {
				if (res.status === 404) {
					throw new Error(
						"No staff record found for your profile. Contact an admin to set up your staff profile.",
					);
				}
				if (!res.ok) {
					throw new Error(
						`Server responded with ${res.status}: ${res.statusText}`,
					);
				}
				return res.json() as Promise<{ id: string }>;
			})
			.then((data) => {
				setStaffMemberId(data.id);
				setStaffError(null);
				setLoadingStaff(false);
			})
			.catch((err) => {
				console.error("Failed to fetch staff/me:", err);
				const msg =
					err instanceof Error ? err.message : "Failed to load staff data.";
				setStaffError(msg);
				setLoadingStaff(false);
			})
			.finally(() => clearTimeout(timeoutId));

		return () => {
			controller.abort();
			clearTimeout(timeoutId);
		};
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

			<StaffSubNav />
			{loadingStaff ? (
				<div className="flex items-center justify-center py-12">
					<div className="text-zinc-400">Loading...</div>
				</div>
			) : staffError ? (
				<div className="rounded-lg bg-amber-950/20 backdrop-blur-sm border border-amber-800/30 p-6">
					<div className="flex items-start gap-3">
						<AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-semibold text-amber-300">
								{staffError}
							</p>
							<p className="text-xs text-zinc-500 mt-2">
								After setting up your staff profile, refresh this page to manage
								your availability.
							</p>
						</div>
					</div>
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
