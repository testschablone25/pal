"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, Users, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SearchFilterBar } from "@/components/search-filter-bar";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/empty-state";

// ── Types ─────────────────────────────────────────────────────────────

interface StaffMember {
	id: string;
	profile_id: string | null;
	role: string;
	contract_type: "permanent" | "freelance" | "minor";
	is_minor: boolean;
	created_at: string;
	profiles: {
		id: string;
		full_name: string | null;
		email: string | null;
	} | null;
}

// ── Client Component ──────────────────────────────────────────────────

export function StaffClient({
	initialStaff,
	initialTotal,
}: {
	initialStaff: Array<Record<string, unknown>>;
	initialTotal: number;
}) {
	const { toast } = useToast();
	const [staff, setStaff] = useState<Array<Record<string, unknown>>>(initialStaff);
	const [total] = useState(initialTotal);
	const [searchName, setSearchName] = useState("");
	const [filterRole, setFilterRole] = useState<string>("");
	const [filterContractType, setFilterContractType] = useState<string>("");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Client-side filtering
	const filtered = useMemo(() => {
		return staff.filter((s) => {
			const profile = s.profiles as StaffMember["profiles"] | null;
			const name = profile?.full_name || profile?.email || "";
			const role = (s.role as string) || "";
			const contract = (s.contract_type as string) || "";

			if (searchName && !name.toLowerCase().includes(searchName.toLowerCase()))
				return false;
			if (filterRole && filterRole !== "all" && role !== filterRole)
				return false;
			if (
				filterContractType &&
				filterContractType !== "all" &&
				contract !== filterContractType
			)
				return false;
			return true;
		});
	}, [staff, searchName, filterRole, filterContractType]);

	const handleDelete = async () => {
		if (!staffToDelete) return;
		setDeleting(true);
		try {
			const response = await fetch(`/api/staff/${staffToDelete.id}`, {
				method: "DELETE",
			});
			if (!response.ok) throw new Error("Failed to delete");
			setStaff((prev) => prev.filter((s) => s.id !== staffToDelete.id));
			setDeleteDialogOpen(false);
			setStaffToDelete(null);
			toast({ title: "Staff member deleted" });
		} catch {
			toast({
				variant: "destructive",
				title: "Error",
				description: "Failed to delete staff member.",
			});
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold text-white flex items-center gap-3">
						<Users className="h-7 w-7 text-zinc-400" />
						Staff
					</h1>
					<p className="text-zinc-400 mt-2">
						Manage staff members and their roles
					</p>
				</div>
				<Link href="/staff/new">
					<Button className="bg-violet-600 hover:bg-violet-700">
						<Plus className="h-4 w-4 mr-2" />
						Add Staff
					</Button>
				</Link>
			</div>

			{/* Search & Filters */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
				<CardContent className="pt-6">
					<SearchFilterBar
						placeholder="Search by name or email..."
						searchValue={searchName}
						onSearchChange={setSearchName}
						filters={[
							{
								key: "role",
								label: "Role",
								options: [
									{ value: "all", label: "All Roles" },
									{ value: "Bar Staff", label: "Bar Staff" },
									{ value: "Security", label: "Security" },
									{ value: "Technician", label: "Technician" },
									{ value: "Manager", label: "Manager" },
								],
								value: filterRole,
								onChange: setFilterRole,
							},
							{
								key: "contract",
								label: "Contract",
								options: [
									{ value: "all", label: "All Types" },
									{ value: "permanent", label: "Permanent" },
									{ value: "freelance", label: "Freelance" },
									{ value: "minor", label: "Minor" },
								],
								value: filterContractType,
								onChange: setFilterContractType,
							},
						]}
					/>
				</CardContent>
			</Card>

			<p className="text-sm text-zinc-500 mb-4">
				{filtered.length} of {total} staff members
			</p>

			{/* Staff Table */}
			{filtered.length === 0 ? (
				<EmptyState
					icon={Users}
					title="No staff found"
					description={
						searchName || filterRole || filterContractType
							? "Try adjusting your search or filters"
							: "Add your first staff member"
					}
					actionLabel="Add Staff"
					onClick={() => {}}
				/>
			) : (
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow className="border-zinc-800 hover:bg-zinc-900">
									<TableHead className="text-zinc-400">Name</TableHead>
									<TableHead className="text-zinc-400">Role</TableHead>
									<TableHead className="text-zinc-400">Contract</TableHead>
									<TableHead className="text-zinc-400">Minor</TableHead>
									<TableHead className="text-zinc-400 text-right">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.map((s) => {
									const profile = s.profiles as StaffMember["profiles"] | null;
									return (
										<TableRow
											key={s.id as string}
											className="border-zinc-800 hover:bg-zinc-800/50"
										>
											<TableCell>
												<Link
													href={`/staff/${s.id}/edit`}
													className="text-white hover:text-violet-400 transition-colors"
												>
													{profile?.full_name ||
														profile?.email ||
														"Unknown"}
												</Link>
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className="border-zinc-700 text-zinc-300"
												>
													{s.role as string}
												</Badge>
											</TableCell>
											<TableCell className="text-zinc-300">
												{(s.contract_type as string) || "-"}
											</TableCell>
											<TableCell>
												{(s.is_minor as boolean) ? (
													<Badge className="bg-amber-600">Yes</Badge>
												) : (
													<span className="text-zinc-500">No</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-1">
													<Link href={`/staff/${s.id}/edit`}>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 text-zinc-400 hover:text-white"
														>
															<Edit className="h-4 w-4" />
														</Button>
													</Link>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-zinc-400 hover:text-red-400"
														onClick={() => {
															setStaffToDelete(s as unknown as StaffMember);
															setDeleteDialogOpen(true);
														}}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* Delete Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className="bg-zinc-900/70 border-zinc-800/70">
					<DialogHeader>
						<DialogTitle className="text-white">Delete Staff Member</DialogTitle>
						<DialogDescription className="text-zinc-400">
							Are you sure you want to delete this staff member?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
							className="border-zinc-700"
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleting}
						>
							{deleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
