"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { StaffForm } from "@/components/staff-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface StaffMember {
	id: string;
	full_name: string | null;
	profile_id: string | null;
	role: string;
	contract_type: "permanent" | "freelance";
	hourly_rate: number | null;
	profiles: {
		full_name: string | null;
		email: string | null;
	} | null;
}

export default function EditStaffPage() {
	const params = useParams();
	const [staff, setStaff] = useState<StaffMember | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchStaff = async () => {
			try {
				const response = await fetch(`/api/staff/${params.id}`);
				if (!response.ok) {
					throw new Error("Staff member not found");
				}
				const data = await response.json();
				setStaff(data);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load staff member",
				);
			} finally {
				setLoading(false);
			}
		};

		if (params.id) {
			fetchStaff();
		}
	}, [params.id]);

	if (loading) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
				<div className="mb-8">
					<Skeleton className="h-10 w-64 bg-zinc-800" />
					<Skeleton className="h-5 w-96 mt-2 bg-zinc-800" />
				</div>
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
					<CardContent className="pt-6 space-y-6">
						<Skeleton className="h-10 w-full bg-zinc-800" />
						<Skeleton className="h-10 w-full bg-zinc-800" />
						<Skeleton className="h-10 w-full bg-zinc-800" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error || !staff) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
					<CardContent className="py-12 text-center">
						<p className="text-red-400">{error || "Staff member not found"}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">Edit Staff Member</h1>
				<p className="text-zinc-400 mt-2">Update staff member information</p>
			</div>
			<StaffForm staff={staff} mode="edit" />
		</div>
	);
}
