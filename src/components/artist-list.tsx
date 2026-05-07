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
import { Plus, MapPin, Music, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";
import { SearchFilterBar } from "@/components/search-filter-bar";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";

interface Artist {
	id: string;
	name: string;
	city: string | null;
	fee: number | null;
	genre: string | null;
	contact_email: string | null;
	contact_phone: string | null;
	created_at: string;
}

interface ArtistListResponse {
	artists: Artist[];
	total: number;
	limit: number;
	offset: number;
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
	const [total, setTotal] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);
	const pageSize = 24;
	const totalPages = Math.ceil(total / pageSize);

	// Delete state
	const [deletingArtist, setDeletingArtist] = useState<Artist | null>(null);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const fetchArtists = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (searchName) params.append("name", searchName);
			if (filterGenre) params.append("genre", filterGenre);
			if (filterCity) params.append("city", filterCity);
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
	}, [searchName, filterGenre, filterCity, currentPage]);

	const clearFilters = () => {
		setSearchName("");
		setFilterGenre("");
		setFilterCity("");
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
			if (!response.ok) throw new Error("Failed to delete artist");

			setShowDeleteDialog(false);
			setDeletingArtist(null);
			await fetchArtists();
			toast({
				title: "Artist deleted",
				description: `${deletingArtist.name} has been removed.`,
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
					actionHref="/artists/new"
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{artists.map((artist) => (
						<Link
							key={artist.id}
							href={`/artists/${artist.id}`}
							className="block group"
						>
							<Card className="bg-zinc-900 border-zinc-800 hover:border-violet-600/50 transition-all cursor-pointer">
								<CardContent className="pt-6 pb-4">
									<div className="space-y-3">
										{/* Top row: name + fee + actions */}
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0 flex-1">
												<h3 className="text-lg font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
													{artist.name}
												</h3>
											</div>
											<div className="flex items-center gap-1 shrink-0">
												{artist.fee && (
													<span className="text-violet-400 font-medium text-sm mr-1">
														€{artist.fee.toLocaleString()}
													</span>
												)}
												<Link
													href={`/artists/${artist.id}`}
													onClick={(e) => e.stopPropagation()}
												>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
														title="View artist"
													>
														<ExternalLink className="h-4 w-4" />
													</Button>
												</Link>
												<Link
													href={`/artists/${artist.id}/edit`}
													onClick={(e) => e.stopPropagation()}
												>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
													>
														<Pencil className="h-4 w-4" />
													</Button>
												</Link>
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
									</div>
								</CardContent>
							</Card>
						</Link>
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
							Any event performances for this artist will also be removed.
							This action cannot be undone.
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
