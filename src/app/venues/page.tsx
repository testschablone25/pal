"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Plus,
	MapPin,
	Users,
	Building,
	Pencil,
	Trash2,
	Loader2,
	Layers,
} from "lucide-react";

interface SubLocation {
	id: string;
	venue_id: string;
	name: string;
	description: string | null;
	created_at: string;
}

interface Venue {
	id: string;
	name: string;
	address: string | null;
	capacity: number;
	venue_type: string | null;
	created_at: string;
	sub_locations?: SubLocation[];
}

type VenueFormData = {
	name: string;
	address: string;
	capacity: number;
	venue_type: string;
};

const VENUE_TYPES = [
	{ value: "", label: "Select type..." },
	{ value: "venue", label: "Venue" },
	{ value: "storage", label: "Lager (Storage)" },
	{ value: "office", label: "Office" },
	{ value: "mixed", label: "Mixed" },
];

const venueTypeBadge: Record<string, string> = {
	venue: "bg-blue-600/20 text-blue-400 border-blue-600/50",
	storage: "bg-amber-600/20 text-amber-400 border-amber-600/50",
	office: "bg-emerald-600/20 text-emerald-400 border-emerald-600/50",
	mixed: "bg-purple-600/20 text-purple-400 border-purple-600/50",
};

const venueTypeLabel: Record<string, string> = {
	venue: "Venue",
	storage: "Lager",
	office: "Office",
	mixed: "Mixed",
};

interface VenueFormProps {
	formData: VenueFormData;
	onFormChange: (data: VenueFormData) => void;
	onSubmit: (e: React.FormEvent) => Promise<void>;
	onCancel: () => void;
	submitLabel: string;
	submitting: boolean;
}

function VenueForm({
	formData,
	onFormChange,
	onSubmit,
	onCancel,
	submitLabel,
	submitting,
}: VenueFormProps) {
	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div>
				<label className="text-sm text-zinc-400 mb-1 block">Venue Name *</label>
				<Input
					value={formData.name}
					onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
					placeholder="e.g., Club Neon"
					className="bg-zinc-950 border-zinc-800"
					autoFocus
					required
				/>
			</div>
			<div>
				<label className="text-sm text-zinc-400 mb-1 block">Address</label>
				<Input
					value={formData.address}
					onChange={(e) =>
						onFormChange({ ...formData, address: e.target.value })
					}
					placeholder="Street address"
					className="bg-zinc-950 border-zinc-800"
				/>
			</div>
			<div>
				<label className="text-sm text-zinc-400 mb-1 block">Venue Type</label>
				<Select
					value={formData.venue_type}
					onValueChange={(v) => onFormChange({ ...formData, venue_type: v })}
				>
					<SelectTrigger className="bg-zinc-950 border-zinc-800">
						<SelectValue placeholder="Select venue type" />
					</SelectTrigger>
					<SelectContent className="bg-zinc-900 border-zinc-800">
						{VENUE_TYPES.filter((t) => t.value).map((type) => (
							<SelectItem key={type.value} value={type.value}>
								{type.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div>
				<label className="text-sm text-zinc-400 mb-1 block">Capacity *</label>
				<Input
					type="number"
					min={1}
					value={formData.capacity || ""}
					onChange={(e) =>
						onFormChange({
							...formData,
							capacity: parseInt(e.target.value) || 0,
						})
					}
					placeholder="Max capacity"
					className="bg-zinc-950 border-zinc-800"
					required
				/>
			</div>
			<div className="flex gap-2 pt-4">
				<Button
					type="submit"
					className="bg-violet-600 hover:bg-violet-700"
					disabled={submitting}
				>
					{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					{submitLabel}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					className="border-zinc-800"
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}

export default function VenuesPage() {
	const [venues, setVenues] = useState<Venue[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Create dialog
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [creating, setCreating] = useState(false);

	// Edit dialog
	const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
	const [showEditDialog, setShowEditDialog] = useState(false);
	const [saving, setSaving] = useState(false);

	// Delete dialog
	const [deletingVenue, setDeletingVenue] = useState<Venue | null>(null);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleting, setDeleting] = useState(false);

	// Sub-location dialog
	const [subLocationVenue, setSubLocationVenue] = useState<Venue | null>(null);
	const [showSubLocationDialog, setShowSubLocationDialog] = useState(false);
	const [newSubLocationName, setNewSubLocationName] = useState("");
	const [newSubLocationDesc, setNewSubLocationDesc] = useState("");
	const [creatingSubLocation, setCreatingSubLocation] = useState(false);

	const [formData, setFormData] = useState<VenueFormData>({
		name: "",
		address: "",
		capacity: 0,
		venue_type: "",
	});

	useEffect(() => {
		fetchVenues();
	}, []);

	const fetchVenues = async () => {
		try {
			const response = await fetch("/api/venues");
			if (!response.ok) throw new Error("Failed to fetch venues");
			const data = await response.json();
			setVenues(data.venues || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load venues");
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setFormData({ name: "", address: "", capacity: 0, venue_type: "" });
	};

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
			if (formData.venue_type) {
				payload.venue_type = formData.venue_type;
			}

			const response = await fetch("/api/venues", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to create venue");
			}

			resetForm();
			setShowCreateDialog(false);
			fetchVenues();
		} catch (err) {
			console.error("Failed to create venue:", err);
		} finally {
			setCreating(false);
		}
	};

	const openEditDialog = (venue: Venue) => {
		setEditingVenue(venue);
		setFormData({
			name: venue.name,
			address: venue.address || "",
			capacity: venue.capacity,
			venue_type: venue.venue_type || "",
		});
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
			};
			if (formData.venue_type) {
				payload.venue_type = formData.venue_type;
			}

			const response = await fetch(`/api/venues/${editingVenue.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to update venue");
			}

			setShowEditDialog(false);
			setEditingVenue(null);
			resetForm();
			fetchVenues();
		} catch (err) {
			console.error("Failed to update venue:", err);
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteVenue = async () => {
		if (!deletingVenue) return;

		setDeleting(true);
		try {
			const response = await fetch(`/api/venues/${deletingVenue.id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete venue");
			}

			setShowDeleteDialog(false);
			setDeletingVenue(null);
			fetchVenues();
		} catch (err) {
			console.error("Failed to delete venue:", err);
		} finally {
			setDeleting(false);
		}
	};

	const openDeleteDialog = (venue: Venue) => {
		setDeletingVenue(venue);
		setShowDeleteDialog(true);
	};

	const openSubLocationDialog = (venue: Venue) => {
		setSubLocationVenue(venue);
		setNewSubLocationName("");
		setNewSubLocationDesc("");
		setShowSubLocationDialog(true);
	};

	const handleAddSubLocation = async () => {
		if (!subLocationVenue || !newSubLocationName.trim()) return;

		setCreatingSubLocation(true);
		try {
			const response = await fetch(
				`/api/venues/${subLocationVenue.id}/sublocations`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: newSubLocationName.trim(),
						description: newSubLocationDesc.trim() || undefined,
					}),
				},
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to add sub-location");
			}

			setShowSubLocationDialog(false);
			fetchVenues();
		} catch (err) {
			console.error("Failed to add sub-location:", err);
		} finally {
			setCreatingSubLocation(false);
		}
	};

	const handleDeleteSubLocation = async (
		venueId: string,
		subLocationId: string,
	) => {
		try {
			const response = await fetch(
				`/api/venues/${venueId}/sublocations/${subLocationId}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete sub-location");
			}

			fetchVenues();
		} catch (err) {
			console.error("Failed to delete sub-location:", err);
		}
	};

	if (loading) {
		return (
			<div className="container mx-auto py-8 px-4">
				<div className="mb-8">
					<Skeleton className="h-10 w-64 bg-zinc-800" />
					<Skeleton className="h-5 w-96 mt-2 bg-zinc-800" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{[...Array(6)].map((_, i) => (
						<Card key={i} className="bg-zinc-900 border-zinc-800">
							<CardContent className="pt-6 space-y-3">
								<Skeleton className="h-6 w-3/4 bg-zinc-800" />
								<Skeleton className="h-4 w-1/2 bg-zinc-800" />
								<Skeleton className="h-4 w-1/3 bg-zinc-800" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container mx-auto py-8 px-4">
				<Card className="bg-zinc-900 border-zinc-800">
					<CardContent className="py-12 text-center">
						<p className="text-red-400">{error}</p>
						<Button
							variant="outline"
							className="mt-4 border-zinc-800"
							onClick={() => window.location.reload()}
						>
							Retry
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 px-4">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">Venues</h1>
				<p className="text-zinc-400 mt-2">
					Manage your nightclub venues and locations
				</p>
			</div>

			{/* Create Dialog */}
			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent className="bg-zinc-900 border-zinc-800">
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
				<DialogContent className="bg-zinc-900 border-zinc-800">
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
				<AlertDialogContent className="bg-zinc-900 border-zinc-800">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-white">
							Delete Venue
						</AlertDialogTitle>
						<AlertDialogDescription className="text-zinc-400">
							Are you sure you want to delete{" "}
							<strong className="text-zinc-200">{deletingVenue?.name}</strong>?
							This action cannot be undone. Events associated with this venue
							may be affected.
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

			{/* Add Sub-Location Dialog */}
			<Dialog
				open={showSubLocationDialog}
				onOpenChange={setShowSubLocationDialog}
			>
				<DialogContent className="bg-zinc-900 border-zinc-800">
					<DialogHeader>
						<DialogTitle className="text-white">Add Sub-Location</DialogTitle>
						<DialogDescription className="text-zinc-400">
							Add a floor, area, or zone to {subLocationVenue?.name}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">Name *</label>
							<Input
								value={newSubLocationName}
								onChange={(e) => setNewSubLocationName(e.target.value)}
								placeholder="e.g., KERN, ORB, ORBIT"
								className="bg-zinc-950 border-zinc-800"
								autoFocus
							/>
						</div>
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Description
							</label>
							<Input
								value={newSubLocationDesc}
								onChange={(e) => setNewSubLocationDesc(e.target.value)}
								placeholder="e.g., Main dancefloor, Bar area"
								className="bg-zinc-950 border-zinc-800"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowSubLocationDialog(false)}
							className="border-zinc-800"
						>
							Cancel
						</Button>
						<Button
							onClick={handleAddSubLocation}
							disabled={!newSubLocationName.trim() || creatingSubLocation}
							className="bg-violet-600 hover:bg-violet-700"
						>
							{creatingSubLocation && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Add
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

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

			{/* Venues Grid */}
			{venues.length === 0 ? (
				<Card className="bg-zinc-900 border-zinc-800">
					<CardContent className="py-12 text-center">
						<Building className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
						<p className="text-zinc-400">No venues yet</p>
						<Button
							className="mt-4 bg-violet-600 hover:bg-violet-700"
							onClick={() => setShowCreateDialog(true)}
						>
							Add your first venue
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{venues.map((venue) => (
						<Card
							key={venue.id}
							className="bg-zinc-900 border-zinc-800 hover:border-violet-600/50 transition-colors"
						>
							<CardContent className="pt-6">
								<div className="space-y-3">
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-2">
											<h3 className="text-lg font-semibold text-white">
												{venue.name}
											</h3>
											{venue.venue_type && (
												<Badge
													variant="outline"
													className={venueTypeBadge[venue.venue_type] || ""}
												>
													{venueTypeLabel[venue.venue_type] || venue.venue_type}
												</Badge>
											)}
										</div>
										<div className="flex gap-1">
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
									{venue.address && (
										<div className="flex items-center text-sm text-zinc-400">
											<MapPin className="h-4 w-4 mr-1" />
											{venue.address}
										</div>
									)}
									<div className="flex items-center justify-between">
										<div className="flex items-center text-sm text-zinc-300">
											<Users className="h-4 w-4 mr-1" />
											Capacity: {venue.capacity}
										</div>
										<Badge
											variant="outline"
											className="border-violet-600/50 text-violet-400"
										>
											{venue.capacity > 500
												? "Large"
												: venue.capacity > 200
													? "Medium"
													: "Small"}
										</Badge>
									</div>

									{/* Sub-Locations Section */}
									<div className="border-t border-zinc-800 pt-3 mt-3">
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center gap-1 text-sm text-zinc-400">
												<Layers className="h-4 w-4" />
												<span>Sub-Locations</span>
												<span className="text-zinc-600">
													({(venue.sub_locations || []).length})
												</span>
											</div>
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
												onClick={() => openSubLocationDialog(venue)}
											>
												<Plus className="h-3 w-3 mr-1" />
												Add
											</Button>
										</div>
										{venue.sub_locations && venue.sub_locations.length > 0 ? (
											<div className="flex flex-wrap gap-2">
												{venue.sub_locations.map((sl) => (
													<div
														key={sl.id}
														className="group flex items-center gap-1 px-2.5 py-1 bg-zinc-800/50 rounded-full text-sm text-zinc-300 border border-zinc-700/50"
														title={sl.description || ""}
													>
														<span>{sl.name}</span>
														<button
															onClick={() =>
																handleDeleteSubLocation(venue.id, sl.id)
															}
															className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
														>
															<Trash2 className="h-3 w-3" />
														</button>
													</div>
												))}
											</div>
										) : (
											<p className="text-xs text-zinc-600 italic">
												No sub-locations — add floors, areas, or zones
											</p>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
