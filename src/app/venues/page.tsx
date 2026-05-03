"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/page-skeleton";
import { useToast } from "@/hooks/use-toast";
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
	Building2,
	Pencil,
	Trash2,
	Loader2,
	Layers,
	AlertTriangle,
	ClipboardList,
	Package,
	ChevronDown,
	ChevronRight,
	Clock,
	X,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { statusBadgeClass, cn } from "@/lib/utils";
import { VenueExpandedView } from "@/components/venue-expanded-view";

// ============================================
// Types
// ============================================

interface SubLocation {
	id: string;
	venue_id: string;
	name: string;
	description: string | null;
	capacity: number | null;
	created_at: string;
}

interface Venue {
	id: string;
	name: string;
	address: string | null;
	capacity: number;
	venue_type: string | null;
	notes: string | null;
	contact_name: string | null;
	contact_phone: string | null;
	contact_email: string | null;
	created_at: string;
	sub_locations?: SubLocation[];
	open_task_count: number;
	urgent_task_count: number;
	upcoming_events_count: number;
	staff_count: number;
	inventory_count: number;
}

type VenueFormData = {
	name: string;
	address: string;
	capacity: number;
	venue_type: string;
	contact_name: string;
	contact_phone: string;
	contact_email: string;
	notes: string;
};

const VENUE_TYPES = [
	{ value: "", label: "Select type..." },
	{ value: "venue", label: "Venue" },
	{ value: "storage", label: "Lager (Storage)" },
	{ value: "office", label: "Office" },
	{ value: "mixed", label: "Mixed" },
];

const venueTypeLabel: Record<string, string> = {
	venue: "Venue",
	storage: "Lager",
	office: "Office",
	mixed: "Mixed",
};

// ============================================
// Venue Form
// ============================================

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
			<div className="grid grid-cols-2 gap-4">
				<div>
					<label className="text-sm text-zinc-400 mb-1 block">
						Contact Name
					</label>
					<Input
						value={formData.contact_name}
						onChange={(e) =>
							onFormChange({ ...formData, contact_name: e.target.value })
						}
						placeholder="Venue manager"
						className="bg-zinc-950 border-zinc-800"
					/>
				</div>
				<div>
					<label className="text-sm text-zinc-400 mb-1 block">
						Contact Phone
					</label>
					<Input
						value={formData.contact_phone}
						onChange={(e) =>
							onFormChange({ ...formData, contact_phone: e.target.value })
						}
						placeholder="+49 ..."
						className="bg-zinc-950 border-zinc-800"
					/>
				</div>
			</div>
			<div>
				<label className="text-sm text-zinc-400 mb-1 block">
					Contact Email
				</label>
				<Input
					type="email"
					value={formData.contact_email}
					onChange={(e) =>
						onFormChange({ ...formData, contact_email: e.target.value })
					}
					placeholder="contact@venue.com"
					className="bg-zinc-950 border-zinc-800"
				/>
			</div>
			<div>
				<label className="text-sm text-zinc-400 mb-1 block">Notes</label>
				<Textarea
					value={formData.notes}
					onChange={(e) => onFormChange({ ...formData, notes: e.target.value })}
					placeholder="Load-in instructions, emergency contacts, venue rules..."
					className="bg-zinc-950 border-zinc-800 min-h-[80px]"
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

// ============================================
// Main Venues Page
// ============================================

export default function VenuesPage() {
	const { toast } = useToast();
	const [venues, setVenues] = useState<Venue[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Expansion state
	const [expandedVenueId, setExpandedVenueId] = useState<string | null>(null);

	// Inline capacity editing
	const [editingCapacity, setEditingCapacity] = useState<string | null>(null);
	const [capacityValue, setCapacityValue] = useState("");

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
	const [newSubLocationCapacity, setNewSubLocationCapacity] = useState("");
	const [creatingSubLocation, setCreatingSubLocation] = useState(false);

	const [formData, setFormData] = useState<VenueFormData>({
		name: "",
		address: "",
		capacity: 0,
		venue_type: "",
		contact_name: "",
		contact_phone: "",
		contact_email: "",
		notes: "",
	});

	useEffect(() => {
		fetchVenues();
	}, []);

	// Close slide-over on Escape
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && expandedVenueId) {
				setExpandedVenueId(null);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [expandedVenueId]);

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
		setFormData({
			name: "",
			address: "",
			capacity: 0,
			venue_type: "",
			contact_name: "",
			contact_phone: "",
			contact_email: "",
			notes: "",
		});
	};

	// ===== Inline Capacity Editing =====

	const startCapacityEdit = (venue: Venue) => {
		setEditingCapacity(venue.id);
		setCapacityValue(String(venue.capacity));
	};

	const saveCapacityEdit = async (venueId: string) => {
		const num = parseInt(capacityValue);
		if (isNaN(num) || num <= 0) {
			setEditingCapacity(null);
			return;
		}

		try {
			const venue = venues.find((v) => v.id === venueId);
			if (!venue) return;

			const response = await fetch(`/api/venues/${venueId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: venue.name,
					address: venue.address,
					capacity: num,
					venue_type: venue.venue_type,
				}),
			});

			if (!response.ok) throw new Error("Failed to update capacity");

			setEditingCapacity(null);
			fetchVenues();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error ? err.message : "Fehler beim Aktualisieren.",
			});
		}
	};

	// ===== Expansion =====

	const toggleExpansion = (venueId: string) => {
		setExpandedVenueId(expandedVenueId === venueId ? null : venueId);
	};

	// ===== CRUD =====

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

	const openEditDialog = (venue: Venue) => {
		setEditingVenue(venue);
		setFormData({
			name: venue.name,
			address: venue.address || "",
			capacity: venue.capacity,
			venue_type: venue.venue_type || "",
			contact_name: venue.contact_name || "",
			contact_phone: venue.contact_phone || "",
			contact_email: venue.contact_email || "",
			notes: venue.notes || "",
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
				contact_name: formData.contact_name || null,
				contact_phone: formData.contact_phone || null,
				contact_email: formData.contact_email || null,
				notes: formData.notes || null,
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
			if (expandedVenueId === deletingVenue.id) {
				setExpandedVenueId(null);
			}
			fetchVenues();
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

	const openDeleteDialog = (venue: Venue) => {
		setDeletingVenue(venue);
		setShowDeleteDialog(true);
	};

	const openSubLocationDialog = (venue: Venue) => {
		setSubLocationVenue(venue);
		setNewSubLocationName("");
		setNewSubLocationDesc("");
		setNewSubLocationCapacity("");
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
						capacity: newSubLocationCapacity
							? parseInt(newSubLocationCapacity)
							: undefined,
					}),
				},
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to add sub-location");
			}

			setShowSubLocationDialog(false);
			fetchVenues();
			toast({
				title: "Unterbereich erstellt",
				description: `${newSubLocationName.trim()} wurde erfolgreich erstellt.`,
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error
						? err.message
						: "Fehler beim Erstellen des Unterbereichs.",
			});
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
			toast({
				title: "Unterbereich gelöscht",
				description: "Der Unterbereich wurde erfolgreich gelöscht.",
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error
						? err.message
						: "Fehler beim Löschen des Unterbereichs.",
			});
		}
	};

	// ===== Render =====

	if (loading) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
				<PageSkeleton rows={6} />
			</div>
		);
	}

	if (error) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
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
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			{/* Header */}
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
						<div>
							<label className="text-sm text-zinc-400 mb-1 block">
								Capacity (optional)
							</label>
							<Input
								type="number"
								min={1}
								value={newSubLocationCapacity}
								onChange={(e) => setNewSubLocationCapacity(e.target.value)}
								placeholder="Max capacity for this area"
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
				<EmptyState
					icon={Building2}
					title="Keine Veranstaltungsorte"
					description="Erstelle deinen ersten Veranstaltungsort"
					actionLabel="Veranstaltungsort hinzufuegen"
					onClick={() => setShowCreateDialog(true)}
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{venues.map((venue) => {
						const isExpanded = expandedVenueId === venue.id;
						const hasUrgent = venue.urgent_task_count > 0;
						const hasOpenTasks = venue.open_task_count > 0;

						return (
							<div key={venue.id}>
								{/* Venue Card */}
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
											{/* Top row: name, type, expand icon */}
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
															className={statusBadgeClass(
																venue.venue_type || "",
															)}
														>
															{venueTypeLabel[venue.venue_type] ||
																venue.venue_type}
														</Badge>
													)}
													<div className="flex items-center gap-1">
														{isExpanded ? (
															<ChevronDown className="h-4 w-4 text-zinc-500" />
														) : (
															<ChevronRight className="h-4 w-4 text-zinc-500" />
														)}
													</div>
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

											{/* Address */}
											{venue.address && (
												<div className="flex items-center text-sm text-zinc-400">
													<MapPin className="h-4 w-4 mr-1 shrink-0" />
													<span className="truncate">{venue.address}</span>
												</div>
											)}

											{/* Capacity (inline editable) */}
											<div className="flex items-center justify-between">
												<div
													className="flex items-center text-sm text-zinc-300"
													onClick={(e) => e.stopPropagation()}
												>
													<Users className="h-4 w-4 mr-1 shrink-0" />
													{editingCapacity === venue.id ? (
														<div className="flex items-center gap-1">
															<Input
																type="number"
																min={1}
																value={capacityValue}
																onChange={(e) =>
																	setCapacityValue(e.target.value)
																}
																onKeyDown={(e) => {
																	if (e.key === "Enter")
																		saveCapacityEdit(venue.id);
																	if (e.key === "Escape")
																		setEditingCapacity(null);
																}}
																className="w-20 h-7 bg-zinc-950 border-zinc-700 text-sm"
																autoFocus
															/>
															<Button
																size="sm"
																variant="ghost"
																className="h-7 text-xs text-green-400"
																onClick={() => saveCapacityEdit(venue.id)}
															>
																Save
															</Button>
														</div>
													) : (
														<button
															className="hover:text-white hover:bg-zinc-800 px-1 rounded transition-colors"
															onClick={(e) => {
																e.stopPropagation();
																startCapacityEdit(venue);
															}}
														>
															Capacity: {venue.capacity}
														</button>
													)}
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

											{/* Stats row */}
											<div className="flex items-center gap-3 text-xs text-zinc-500">
												{hasOpenTasks && (
													<span
														className={cn(
															"flex items-center gap-1",
															hasUrgent ? "text-red-400" : "text-zinc-400",
														)}
													>
														<ClipboardList className="h-3 w-3" />
														{venue.open_task_count} task
														{venue.open_task_count !== 1 ? "s" : ""}
														{hasUrgent && (
															<span className="text-red-400 font-medium">
																({venue.urgent_task_count} urgent)
															</span>
														)}
													</span>
												)}
												{venue.staff_count > 0 && (
													<span className="flex items-center gap-1 text-zinc-400">
														<Clock className="h-3 w-3" />
														{venue.staff_count} staff
													</span>
												)}
												{venue.upcoming_events_count > 0 && (
													<span className="flex items-center gap-1 text-zinc-400">
														<Building2 className="h-3 w-3" />
														{venue.upcoming_events_count} event
														{venue.upcoming_events_count !== 1 ? "s" : ""}
													</span>
												)}
												{venue.inventory_count > 0 && (
													<span className="flex items-center gap-1 text-zinc-400">
														<Package className="h-3 w-3" />
														{venue.inventory_count} items
													</span>
												)}
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
													<button
														className="text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 px-2 py-1 rounded transition-colors"
														onClick={(e) => {
															e.stopPropagation();
															openSubLocationDialog(venue);
														}}
													>
														<Plus className="h-3 w-3 mr-1 inline" />
														Add
													</button>
												</div>
												{venue.sub_locations &&
												venue.sub_locations.length > 0 ? (
													<div className="flex flex-wrap gap-2">
														{venue.sub_locations.map((sl) => (
															<div
																key={sl.id}
																className="group flex items-center gap-1 px-2.5 py-1 bg-zinc-800/50 rounded-full text-sm text-zinc-300 border border-zinc-700/50"
																title={
																	sl.description
																		? `${sl.description}${sl.capacity ? ` (${sl.capacity} cap.)` : ""}`
																		: sl.capacity
																			? `${sl.capacity} capacity`
																			: ""
																}
															>
																<span>{sl.name}</span>
																{sl.capacity && (
																	<span className="text-xs text-zinc-500">
																		{sl.capacity}
																	</span>
																)}
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		handleDeleteSubLocation(venue.id, sl.id);
																	}}
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
							</div>
						);
					})}
				</div>
			)}

			{/* ===== Slide-Over Panel ===== */}
			{expandedVenueId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					{/* Backdrop */}
					<div
						className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
						onClick={() => setExpandedVenueId(null)}
					/>

					{/* Modal */}
					<div className="relative w-full max-w-4xl max-h-[85vh] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-modal-in">
						{/* Panel Header */}
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

						{/* Panel Content */}
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
