"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageSkeleton } from "@/components/page-skeleton";
import { PaginationControls } from "@/components/pagination-controls";
import {
	Plus,
	MapPin,
	Music,
	Pencil,
	Trash2,
	Loader2,
	Mail,
	Disc3,
	Building2,
} from "lucide-react";
import { SearchFilterBar } from "@/components/search-filter-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { LabelAgencyManager } from "@/components/label-agency-manager";
import { ArtistForm } from "@/components/artist-form";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";

interface Label {
	id: string;
	name: string;
}

interface Agency {
	id: string;
	name: string;
}

interface Artist {
	id: string;
	name: string;
	city: string | null;
	fee: number | null;
	genre: string | null;
	bio: string | null;
	contact_email: string | null;
	contact_phone: string | null;
	promo_pack_url: string | null;
	created_at: string;
	performance_count: number;
	labels: Label[];
	agencies: Agency[];
}

interface ArtistListResponse {
	artists: Artist[];
	total: number;
	limit: number;
	offset: number;
}

interface LabelOption {
	id: string;
	name: string;
}

interface AgencyOption {
	id: string;
	name: string;
}

const GENRES = [
	"Techno",
	"House",
	"Drum & Bass",
	"Trance",
	"Hard Techno",
	"Minimal",
	"Tech House",
	"Progressive",
	"Electro",
	"Dubstep",
];

export function ArtistList() {
	const { toast } = useToast();
	const [artists, setArtists] = useState<Artist[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchName, setSearchName] = useState("");
	const [filterGenre, setFilterGenre] = useState<string>("");
	const [filterCity, setFilterCity] = useState("");
	const [filterLabelId, setFilterLabelId] = useState<string>("");
	const [filterAgencyId, setFilterAgencyId] = useState<string>("");
	const [total, setTotal] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);
	const pageSize = 24;
	const totalPages = Math.ceil(total / pageSize);

	// Lists for filter dropdowns
	const [labelOptions, setLabelOptions] = useState<LabelOption[]>([]);
	const [agencyOptions, setAgencyOptions] = useState<AgencyOption[]>([]);

	const router = useRouter();

	// Create / Edit / Delete state
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
	const [showEditDialog, setShowEditDialog] = useState(false);
	const [deletingArtist, setDeletingArtist] = useState<Artist | null>(null);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleting, setDeleting] = useState(false);

	// Load labels and agencies for filters
	useEffect(() => {
		Promise.all([
			fetch("/api/labels").then((r) => r.json()),
			fetch("/api/agencies").then((r) => r.json()),
		])
			.then(([labelData, agencyData]) => {
				setLabelOptions(labelData.labels || []);
				setAgencyOptions(agencyData.agencies || []);
			})
			.catch(() => {});
	}, []);

	const fetchArtists = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (searchName) params.append("name", searchName);
			if (filterGenre) params.append("genre", filterGenre);
			if (filterCity) params.append("city", filterCity);
			if (filterLabelId) params.append("label_id", filterLabelId);
			if (filterAgencyId) params.append("agency_id", filterAgencyId);
			params.append("limit", String(pageSize));
			params.append("offset", String((currentPage - 1) * pageSize));

			const response = await fetch(`/api/artists?${params.toString()}`);
			const data: ArtistListResponse = await response.json();
			setArtists(data.artists || []);
			setTotal(data.total);
		} catch (error) {
			console.error("Failed to fetch artists:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchArtists();
	}, [
		searchName,
		filterGenre,
		filterCity,
		filterLabelId,
		filterAgencyId,
		currentPage,
	]);

	const clearFilters = () => {
		setSearchName("");
		setFilterGenre("");
		setFilterCity("");
		setFilterLabelId("");
		setFilterAgencyId("");
		setCurrentPage(1);
		setArtists([]);
		fetchArtists();
	};

	const handleDelete = async () => {
		if (!deletingArtist) return;
		setDeleting(true);
		try {
			const response = await fetch(`/api/artists/${deletingArtist.id}`, {
				method: "DELETE",
			});
			if (!response.ok) {
				const body = await response.json();
				throw new Error(body.error || "Failed to delete artist");
			}

			// Remove from local state immediately
			setArtists((prev) => prev.filter((a) => a.id !== deletingArtist.id));
			setTotal((prev) => Math.max(0, prev - 1));

			setShowDeleteDialog(false);
			const deletedName = deletingArtist.name;
			setDeletingArtist(null);
			toast({
				title: "Artist deleted",
				description: `${deletedName} has been removed.`,
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Error",
				description:
					err instanceof Error ? err.message : "Failed to delete artist",
			});
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Search and Filters */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
				<CardContent className="pt-6">
					<div className="space-y-4">
						<SearchFilterBar
							placeholder="Search artists..."
							searchValue={searchName}
							onSearchChange={setSearchName}
							filters={[
								{
									key: "genre",
									label: "Genre",
									options: GENRES.map((genre) => ({
										value: genre.toLowerCase(),
										label: genre,
									})),
									value: filterGenre,
									onChange: setFilterGenre,
								},
								{
									key: "label",
									label: "Label",
									options: labelOptions.map((l) => ({
										value: l.id,
										label: l.name,
									})),
									value: filterLabelId,
									onChange: setFilterLabelId,
								},
								{
									key: "agency",
									label: "Agency",
									options: agencyOptions.map((a) => ({
										value: a.id,
										label: a.name,
									})),
									value: filterAgencyId,
									onChange: setFilterAgencyId,
								},
							]}
						/>
						<div className="flex gap-3">
							<div className="flex-1 md:max-w-[200px]">
								<input
									placeholder="City"
									value={filterCity}
									onChange={(e) => setFilterCity(e.target.value)}
									className="w-full h-10 px-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-md placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-600/50"
								/>
							</div>
							<LabelAgencyManager
								trigger={
									<Button
										type="button"
										variant="outline"
										className="border-zinc-700 text-xs"
									>
										<Disc3 className="h-4 w-4 mr-1.5" />
										Labels &amp; Agencies
									</Button>
								}
							/>
							<Button
								type="button"
								variant="outline"
								onClick={clearFilters}
								className="border-zinc-700"
							>
								Clear
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Section header + count */}
			<div className="flex justify-between items-center">
				<div className="flex items-center gap-2">
					<Music className="h-4 w-4 text-zinc-400" />
					<p className="text-sm text-zinc-400">
						{loading ? "Loading..." : `${total} artists found`}
					</p>
				</div>
				<Link href="/artists/new">
					<Button className="bg-violet-600 hover:bg-violet-700">
						<Plus className="h-4 w-4 mr-2" />
						Add Artist
					</Button>
				</Link>
			</div>

			{loading ? (
				<PageSkeleton rows={6} />
			) : artists.length === 0 ? (
				<EmptyState
					icon={Music}
					title="Keine Künstler gefunden"
					description="Füge deinen ersten Künstler hinzu"
					actionLabel="Künstler hinzufügen"
					onClick={() => setShowCreateDialog(true)}
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{artists.map((artist) => (
						<div key={artist.id} className="group">
							<div
								onClick={() => router.push(`/artists/${artist.id}`)}
								onKeyDown={(e) => {
									if (e.key === "Enter")
										router.push(`/artists/${artist.id}`);
								}}
								className="cursor-pointer"
							>
								<Card className="bg-zinc-900 border-zinc-800 hover:border-violet-600/50 transition-all">
									<CardContent className="pt-6 pb-4">
										<div className="space-y-3">
											{/* Top row: name + actions */}
											<div className="flex items-start justify-between gap-2">
												<div className="min-w-0 flex-1">
													<h3 className="text-lg font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
														{artist.name}
													</h3>
												</div>
												<div className="flex items-center gap-1 shrink-0">
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
														onClick={(e) => {
															e.preventDefault();
															e.stopPropagation();
															setEditingArtist(artist);
															setShowEditDialog(true);
														}}
													>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-600/10"
														onClick={(e) => {
															e.preventDefault();
															e.stopPropagation();
															setDeletingArtist(artist);
															setShowDeleteDialog(true);
														}}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</div>

											{/* Genre badge + city */}
											<div className="flex flex-wrap items-center gap-2">
												{artist.genre && (
													<Badge
														variant="outline"
														className="border-violet-600/50 text-violet-400"
													>
														{artist.genre}
													</Badge>
												)}
												{artist.city && (
													<div className="flex items-center text-sm text-zinc-400">
														<MapPin className="h-4 w-4 mr-1" />
														{artist.city}
													</div>
												)}
											</div>

											{/* Labels */}
											{artist.labels && artist.labels.length > 0 && (
												<div className="flex flex-wrap items-center gap-1.5">
													<Disc3 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
													{artist.labels.map((label) => (
														<Badge
															key={label.id}
															variant="outline"
															className="border-amber-600/40 text-amber-400 text-[11px] px-1.5 py-0"
														>
															{label.name}
														</Badge>
													))}
												</div>
											)}

											{/* Agencies */}
											{artist.agencies && artist.agencies.length > 0 && (
												<div className="flex flex-wrap items-center gap-1.5">
													<Building2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
													{artist.agencies.map((agency) => (
														<Badge
															key={agency.id}
															variant="outline"
															className="border-blue-600/40 text-blue-400 text-[11px] px-1.5 py-0"
														>
															{agency.name}
														</Badge>
													))}
												</div>
											)}

											{/* Contact email */}
											{artist.contact_email && (
												<div className="flex items-center text-sm text-zinc-500">
													<Mail className="h-3.5 w-3.5 mr-1.5 shrink-0" />
													<span className="truncate">
														{artist.contact_email}
													</span>
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							</div>
						</div>
					))}
				</div>
			)}

			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				totalItems={total}
				onPageChange={(page) => {
					setCurrentPage(page);
					window.scrollTo({ top: 0, behavior: "smooth" });
				}}
				className="mt-6"
			/>

			{/* Create Artist Dialog */}
			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg max-w-xl">
					<DialogHeader>
						<DialogTitle className="text-white">Add New Artist</DialogTitle>
						<DialogDescription className="text-zinc-400">
							Create a new artist or DJ
						</DialogDescription>
					</DialogHeader>
					<ArtistForm
						mode="create"
						variant="inline"
						onSuccess={() => {
							setShowCreateDialog(false);
							fetchArtists();
						}}
					/>
				</DialogContent>
			</Dialog>

			{/* Edit Artist Dialog */}
			<Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg max-w-xl">
					<DialogHeader>
						<DialogTitle className="text-white">Edit Artist</DialogTitle>
						<DialogDescription className="text-zinc-400">
							Update artist information
						</DialogDescription>
					</DialogHeader>
					{editingArtist && (
						<ArtistForm
							artist={{
								id: editingArtist.id,
								name: editingArtist.name,
								city: editingArtist.city,
								fee: editingArtist.fee,
								genre: editingArtist.genre,
								contact_email: editingArtist.contact_email,
								contact_phone: editingArtist.contact_phone,
							}}
							mode="edit"
							variant="inline"
							onSuccess={() => {
								setShowEditDialog(false);
								setEditingArtist(null);
								fetchArtists();
							}}
						/>
					)}
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-white">
							Delete Artist
						</AlertDialogTitle>
						<AlertDialogDescription className="text-zinc-400">
							Are you sure you want to delete{" "}
							<strong className="text-zinc-200">{deletingArtist?.name}</strong>?
							Any event performances for this artist will also be removed. This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={deleting}
							className="bg-red-600 hover:bg-red-700 text-white"
						>
							{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
