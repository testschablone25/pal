"use client";

import { useState, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Search,
	Plus,
	Edit,
	Trash2,
	Users,
	Clock,
	Calendar,
} from "lucide-react";
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

interface StaffMember {
	id: string;
	profile_id: string | null;
	role: string;
	contract_type: "permanent" | "freelance" | "minor";
	is_minor: boolean;
	created_at: string;
	profiles?: {
		id: string;
		full_name: string | null;
		email: string | null;
		phone: string | null;
	} | null;
}

interface StaffListResponse {
	staff: StaffMember[];
	total: number;
	limit: number;
	offset: number;
}

const STAFF_ROLES = [
	"Bar Staff",
	"Security",
	"Door Staff",
	"Cloakroom",
	"Cleaner",
	"Manager",
	"Sound Engineer",
	"Lighting",
	"VIP Host",
	"Runner",
];

const CONTRACT_TYPES = [
	{ value: "permanent", label: "Permanent" },
	{ value: "freelance", label: "Freelance" },
	{ value: "minor", label: "Minor" },
];

export default function StaffPage() {
	const { toast } = useToast();
	const [staff, setStaff] = useState<StaffMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchName, setSearchName] = useState("");
	const [filterRole, setFilterRole] = useState<string>("");
	const [filterContractType, setFilterContractType] = useState<string>("");
	const [total, setTotal] = useState(0);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
	const [deleting, setDeleting] = useState(false);

	const fetchStaff = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (searchName) params.append("name", searchName);
			if (filterRole) params.append("role", filterRole);
			if (filterContractType)
				params.append("contract_type", filterContractType);

			const response = await fetch(`/api/staff?${params.toString()}`);
			const data: StaffListResponse = await response.json();
			setStaff(data.staff || []);
			setTotal(data.total);
		} catch (error) {
			console.error("Failed to fetch staff:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStaff();
	}, []);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		fetchStaff();
	};

	const clearFilters = () => {
		setSearchName("");
		setFilterRole("");
		setFilterContractType("");
		fetchStaff();
	};

	const handleDeleteClick = (staffMember: StaffMember) => {
		setStaffToDelete(staffMember);
		setDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!staffToDelete) return;

		setDeleting(true);
		try {
			const response = await fetch(`/api/staff/${staffToDelete.id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to delete staff member");
			}

			setDeleteDialogOpen(false);
			setStaffToDelete(null);
			fetchStaff();
			toast({
				title: "Mitarbeiter gelöscht",
				description: "Der Mitarbeiter wurde erfolgreich gelöscht.",
			});
		} catch (error) {
			console.error("Error deleting staff:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Löschen des Mitarbeiters.",
			});
		} finally {
			setDeleting(false);
		}
	};

	const getContractTypeBadge = (type: string) => {
		return (
			<Badge variant="outline" className="border-zinc-700 text-zinc-400 capitalize">
				{type}
			</Badge>
		);
	};

	const getRoleBadge = (role: string) => {
		return (
			<Badge variant="outline" className="border-zinc-700 text-zinc-400">
				{role}
			</Badge>
		);
	};

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">Staff Management</h1>
				<p className="text-zinc-400 mt-2">
					Manage your nightclub staff, schedules, and availability
				</p>
			</div>

			{/* Quick Actions */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<Link href="/staff/new">
					<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 hover:border-zinc-700 transition-all cursor-pointer">
						<CardContent className="pt-6">
							<div className="flex items-center gap-4">
									<Users className="h-5 w-5 text-zinc-400" />
								<div>
									<h3 className="font-semibold text-white">Add Staff</h3>
									<p className="text-sm text-zinc-400">
										Register new team member
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</Link>

				<Link href="/staff/shifts">
					<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 hover:border-zinc-700 transition-all cursor-pointer">
						<CardContent className="pt-6">
							<div className="flex items-center gap-4">
									<Clock className="h-5 w-5 text-zinc-400" />
								<div>
									<h3 className="font-semibold text-white">Shift Schedule</h3>
									<p className="text-sm text-zinc-400">
										Plan and assign shifts
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</Link>

				<Link href="/staff/availability">
					<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 hover:border-zinc-700 transition-all cursor-pointer">
						<CardContent className="pt-6">
							<div className="flex items-center gap-4">
									<Calendar className="h-5 w-5 text-zinc-400" />
								<div>
									<h3 className="font-semibold text-white">{total} Staff</h3>
									<p className="text-sm text-zinc-400">Manage availability</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</Link>
			</div>

			{/* Search and Filters */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
				<CardContent className="pt-6">
					<SearchFilterBar
						placeholder="Search by name..."
						searchValue={searchName}
						onSearchChange={setSearchName}
						filters={[
							{
								key: "role",
								label: "Filter by role",
								options: STAFF_ROLES.map((role) => ({
									value: role,
									label: role,
								})),
								value: filterRole,
								onChange: setFilterRole,
							},
							{
								key: "contract_type",
								label: "Contract type",
								options: CONTRACT_TYPES.map((t) => ({
									value: t.value,
									label: t.label,
								})),
								value: filterContractType,
								onChange: setFilterContractType,
							},
						]}
					/>
				</CardContent>
			</Card>

			{/* Staff Table */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-white">Staff Directory</CardTitle>
					<Link href="/staff/new">
						<Button className="bg-violet-600 hover:bg-violet-700">
							<Plus className="h-4 w-4 mr-2" />
							Add Staff
						</Button>
					</Link>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="space-y-4">
							{[...Array(5)].map((_, i) => (
								<div key={i} className="flex items-center gap-4">
									<Skeleton className="h-12 w-12 rounded-full bg-zinc-800" />
									<div className="space-y-2 flex-1">
										<Skeleton className="h-4 w-1/4 bg-zinc-800" />
										<Skeleton className="h-3 w-1/3 bg-zinc-800" />
									</div>
								</div>
							))}
						</div>
					) : staff.length === 0 ? (
						<EmptyState
							icon={Users}
							title="Keine Mitarbeiter gefunden"
							description="Füge dein erstes Teammitglied hinzu"
							actionLabel="Mitarbeiter hinzufügen"
							actionHref="/staff/new"
						/>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="border-zinc-700">
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
								{staff.map((member) => (
									<TableRow key={member.id} className="border-zinc-700">
										<TableCell>
											<div>
												<p className="font-medium text-white">
													{member.profiles?.full_name || "No name"}
												</p>
												<p className="text-sm text-zinc-400">
													{member.profiles?.email || "No email"}
												</p>
											</div>
										</TableCell>
										<TableCell>{getRoleBadge(member.role)}</TableCell>
										<TableCell>
											{getContractTypeBadge(member.contract_type)}
										</TableCell>
										<TableCell>
											{member.is_minor ? (
												<Badge variant="outline" className="border-zinc-700 text-zinc-400">
													Yes
												</Badge>
											) : (
												<span className="text-zinc-500">No</span>
											)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Link href={`/staff/${member.id}/edit`}>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
													>
														<Edit className="h-4 w-4" />
													</Button>
												</Link>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-600/10"
													onClick={() => handleDeleteClick(member)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<DialogHeader>
						<DialogTitle className="text-white">
							Delete Staff Member
						</DialogTitle>
						<DialogDescription className="text-zinc-400">
							Are you sure you want to delete{" "}
							<span className="text-white font-medium">
								{staffToDelete?.profiles?.full_name || "this staff member"}
							</span>
							? This action cannot be undone.
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
							onClick={handleDeleteConfirm}
							disabled={deleting}
							className="bg-red-600 hover:bg-red-700"
						>
							{deleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
