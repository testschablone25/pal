"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
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
import {
	Plus,
	Building2,
	Pencil,
	Trash2,
	Loader2,
	AlertTriangle,
	ChevronDown,
	ChevronRight,
	X,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { VenueExpandedView } from "@/components/venue-expanded-view";
import {
	VenueForm,
	defaultVenueFormData,
	type VenueFormData,
} from "@/components/venues/venue-form";
import { VenueSubLocationForm } from "@/components/venues/venue-sub-location-form";
import { VenueStats } from "@/components/venues/venue-stats";
import type { Venue, SubLocation } from "./types";

// ── Client Venues Page ────────────────────────────────────────────────

export function VenuesClient({ initialVenues }: { initialVenues: Venue[] }) {
	const { toast } = useToast();
	const [venues, setVenues] = useState<Venue[]>(initialVenues);
	const [expandedVenueId, setExpandedVenueId] = useState<string | null>(null);

	// Create / Edit / Delete dialogs
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [creating, setCreating] = useState(false);
	const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
	const [showEditDialog, setShowEditDialog] = useState(false);
	const [saving, setSaving] = useState(false);
	const [deletingVenue, setDeletingVenue] = useState<Venue | null>(null);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [subLocationVenue, setSubLocationVenue] = useState<Venue | null>(null);
	const [showSubLocationDialog, setShowSubLocationDialog] = useState(false);

	const [palFilter, setPalFilter] = useState<"all" | "pal" | "external">("all");
	const [formData, setFormData] = useState<VenueFormData>(
		defaultVenueFormData(),
	);

	// ── Re-fetch ────────────────────────────────────────────────────────
	const fetchVenues = async () => {
		try {
			const response = await fetch("/api/venues");
			if (response.ok) {
				const data = await response.json();
				setVenues(data.venues || []);
			}
		} catch {
			// silent — keep current data
		}
	};

	const resetForm = () => setFormData(defaultVenueFormData());

	// ── Create ──────────────────────────────────────────────────────────
	const handleCreateVenue = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name || !formData.capacity) return;
		setCreating(true);
		try {
			const payload: Record<string, unknown> = {
				name: formData.name,
				address: formData.address,
				capacity: formData.capacity,
			};
			if (formData.venue_type) payload.venue_type = formData.venue_type;

			const response = await fetch("/api/venues", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!response.ok) throw new Error("Failed to create venue");

			resetForm();
			setShowCreateDialog(false);
			await fetchVenues();
			toast({
				title: "Veranstaltungsort erstellt",
				description: `${formData.name} wurde erfolgreich erstellt.`,
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error
						? err.message
						: "Fehler beim Erstellen des Veranstaltungsorts.",
			});
		} finally {
			setCreating(false);
		}
	};

	// ── Edit ────────────────────────────────────────────────────────────
	const openEditDialog = (venue: Venue) => {
		setEditingVenue(venue);
		setFormData(
			defaultVenueFormData({
				name: venue.name,
				address: venue.address || "",
				capacity: venue.capacity,
				venue_type: venue.venue_type || "",
				contact_name: venue.contact_name || "",
				contact_phone: venue.contact_phone || "",
				contact_email: venue.contact_email || "",
				notes: venue.notes || "",
			}),
		);
		setShowEditDialog(true);
	};

	const handleEditVenue = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingVenue || !formData.name || !formData.capacity) return;
		setSaving(true);
		try {
			const payload: Record<string, unknown> = {
				name: formData.name,
				address: formData.address,
				capacity: formData.capacity,
				contact_name: formData.contact_name || null,
				contact_phone: formData.contact_phone || null,
				contact_email: formData.contact_email || null,
				notes: formData.notes || null,
			};
			if (formData.venue_type) payload.venue_type = formData.venue_type;

			const response = await fetch(`/api/venues/${editingVenue.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!response.ok) throw new Error("Failed to update venue");

			setShowEditDialog(false);
			setEditingVenue(null);
			resetForm();
			await fetchVenues();
			toast({
				title: "Veranstaltungsort aktualisiert",
				description: `${formData.name} wurde erfolgreich aktualisiert.`,
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error
						? err.message
						: "Fehler beim Aktualisieren des Veranstaltungsorts.",
			});
		} finally {
			setSaving(false);
		}
	};

	// ── Delete ──────────────────────────────────────────────────────────
	const handleDeleteVenue = async () => {
		if (!deletingVenue) return;
		setDeleting(true);
		try {
			const response = await fetch(`/api/venues/${deletingVenue.id}`, {
				method: "DELETE",
			});
			if (!response.ok) throw new Error("Failed to delete venue");

			setShowDeleteDialog(false);
			setDeletingVenue(null);
			if (expandedVenueId === deletingVenue.id) setExpandedVenueId(null);
			await fetchVenues();
			toast({
				title: "Veranstaltungsort gelöscht",
				description: `${deletingVenue.name} wurde erfolgreich gelöscht.`,
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error
						? err.message
						: "Fehler beim Löschen des Veranstaltungsorts.",
			});
		} finally {
			setDeleting(false);
		}
	};

	const toggleExpansion = (venueId: string) => {
		setExpandedVenueId(expandedVenueId === venueId ? null : venueId);
	};

	const openDeleteDialog = (venue: Venue) => {
		setDeletingVenue(venue);
		setShowDeleteDialog(true);
	};

	const openSubLocationDialog = (venue: Venue) => {
		setSubLocationVenue(venue);
		setShowSubLocationDialog(true);
	};

	// ── Render ──────────────────────────────────────────────────────────
	const filteredVenues =
		palFilter === "all"
			? venues
			: venues.filter((v) =>
					palFilter === "pal"
						? v.is_pal_location === true
						: v.is_pal_location === false,
				);

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">Venues</h1>
				<p className="text-zinc-400 mt-2">
					Manage your nightclub venues and locations
				</p>
			</div>

			{/* Create Dialog */}
			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<DialogHeader>
						<DialogTitle className="text-white">Add New Venue</DialogTitle>
						<DialogDescription className="text-zinc-400">
							Create a new venue location
						</DialogDescription>
					</DialogHeader>
					<VenueForm
						formData={formData}
						onFormChange={setFormData}
						onSubmit={handleCreateVenue}
						onCancel={() => {
							resetForm();
							setShowCreateDialog(false);
						}}
						submitLabel="Create Venue"
						submitting={creating}
					/>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<DialogHeader>
						<DialogTitle className="text-white">Edit Venue</DialogTitle>
						<DialogDescription className="text-zinc-400">
							Update venue details
						</DialogDescription>
					</DialogHeader>
					<VenueForm
						formData={formData}
						onFormChange={setFormData}
						onSubmit={handleEditVenue}
						onCancel={() => {
							resetForm();
							setShowEditDialog(false);
							setEditingVenue(null);
						}}
						submitLabel="Save Changes"
						submitting={saving}
					/>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-white">
							Delete Venue
						</AlertDialogTitle>
						<AlertDialogDescription className="text-zinc-400">
							Are you sure you want to delete{" "}
							<strong className="text-zinc-200">{deletingVenue?.name}</strong>?
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteVenue}
							disabled={deleting}
							className="bg-red-600 hover:bg-red-700 text-white"
						>
							{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Sub-Location Dialog */}
			{subLocationVenue && (
				<VenueSubLocationForm
					venueId={subLocationVenue.id}
					venueName={subLocationVenue.name}
					subLocations={subLocationVenue.sub_locations || []}
					open={showSubLocationDialog}
					onOpenChange={setShowSubLocationDialog}
					onSubLocationChanged={fetchVenues}
				/>
			)}

			{/* Header Actions */}
			<div className="flex justify-between items-center mb-6">
				<p className="text-sm text-zinc-400">{venues.length} venues</p>
				<Button
					className="bg-violet-600 hover:bg-violet-700"
					onClick={() => setShowCreateDialog(true)}
				>
					<Plus className="h-4 w-4 mr-2" />
					Add Venue
				</Button>
			</div>

			{/* PAL / External Filter */}
			<div className="flex items-center gap-2 mb-6">
				{(["all", "pal", "external"] as const).map((f) => (
					<button
						key={f}
						onClick={() => setPalFilter(f)}
						className={cn(
							"px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
							palFilter === f
								? "bg-violet-600 text-white"
								: "bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700 border border-zinc-700/50",
						)}
					>
						{f === "all" ? "All" : f === "pal" ? "PAL Locations" : "External"}
					</button>
				))}
			</div>

			{/* Venues Grid */}
			{filteredVenues.length === 0 ? (
				<EmptyState
					icon={Building2}
					title="Keine Veranstaltungsorte"
					description={
						palFilter !== "all"
							? "Keine Veranstaltungsorte in dieser Kategorie"
							: "Erstelle deinen ersten Veranstaltungsort"
					}
					actionLabel="Veranstaltungsort hinzufuegen"
					onClick={() => setShowCreateDialog(true)}
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredVenues.map((venue) => {
						const isExpanded = expandedVenueId === venue.id;
						const hasUrgent = venue.urgent_task_count > 0;

						return (
							<div key={venue.id}>
								<Card
									className={cn(
										"bg-zinc-900 transition-all cursor-pointer",
										hasUrgent
											? "border-l-4 border-l-red-500 border-t-zinc-800 border-r-zinc-800 border-b-zinc-800 hover:border-l-red-400"
											: "border-zinc-800 hover:border-violet-600/50",
										isExpanded && "ring-1 ring-violet-600/30",
									)}
									onClick={() => toggleExpansion(venue.id)}
								>
									<CardContent className="pt-6 pb-4">
										<div className="space-y-3">
											<div className="flex items-start justify-between">
												<div className="flex items-center gap-2 flex-wrap">
													{hasUrgent && (
														<AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
													)}
													<h3 className="text-lg font-semibold text-white">
														{venue.name}
													</h3>
													{venue.venue_type && (
														<Badge
															variant="outline"
															className="border-zinc-600 text-zinc-300"
														>
															{venue.venue_type}
														</Badge>
													)}
													{isExpanded ? (
														<ChevronDown className="h-4 w-4 text-zinc-500" />
													) : (
														<ChevronRight className="h-4 w-4 text-zinc-500" />
													)}
												</div>
												<div
													className="flex gap-1"
													onClick={(e) => e.stopPropagation()}
												>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
														onClick={() => openEditDialog(venue)}
													>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-600/10"
														onClick={() => openDeleteDialog(venue)}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</div>

											<VenueStats
												venueId={venue.id}
												name={venue.name}
												venueType={venue.venue_type}
												capacity={venue.capacity}
												address={venue.address}
												openTaskCount={venue.open_task_count}
												urgentTaskCount={venue.urgent_task_count}
												staffCount={venue.staff_count}
												upcomingEventsCount={venue.upcoming_events_count}
												inventoryCount={venue.inventory_count}
												subLocations={venue.sub_locations || []}
												onCapacityChange={fetchVenues}
												onAddSubLocation={() => setSubLocationVenue(venue)}
												onDeleteSubLocation={(subLocationId) => {
													fetch(
														`/api/venues/${venue.id}/sublocations/${subLocationId}`,
														{ method: "DELETE" },
													)
														.then(() => fetchVenues())
														.catch(() =>
															toast({
																variant: "destructive",
																title: "Fehler",
																description:
																	"Fehler beim Löschen des Unterbereichs.",
															}),
														);
												}}
											/>
										</div>
									</CardContent>
								</Card>
							</div>
						);
					})}
				</div>
			)}

			{/* Slide-Over Panel */}
			{expandedVenueId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
						onClick={() => setExpandedVenueId(null)}
					/>
					<div className="relative w-full max-w-4xl max-h-[85vh] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-modal-in">
						<div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
							<h2 className="text-lg font-semibold text-white truncate">
								{venues.find((v) => v.id === expandedVenueId)?.name || "Venue"}
							</h2>
							<button
								onClick={() => setExpandedVenueId(null)}
								className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto p-6">
							<VenueExpandedView
								venueId={expandedVenueId}
								onCapacityChange={fetchVenues}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
