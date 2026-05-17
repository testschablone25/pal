"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Trash2, Plus, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubLocation {
	id: string;
	venue_id: string;
	name: string;
	description: string | null;
	capacity: number | null;
	created_at: string;
}

interface VenueSubLocationFormProps {
	venueId: string;
	venueName: string;
	subLocations: SubLocation[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubLocationChanged: () => void;
}

export function VenueSubLocationForm({
	venueId,
	venueName,
	subLocations,
	open,
	onOpenChange,
	onSubLocationChanged,
}: VenueSubLocationFormProps) {
	const { toast } = useToast();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [capacity, setCapacity] = useState("");
	const [creating, setCreating] = useState(false);

	const reset = () => {
		setName("");
		setDescription("");
		setCapacity("");
	};

	const handleAdd = async () => {
		if (!name.trim()) return;

		setCreating(true);
		try {
			const response = await fetch(`/api/venues/${venueId}/sublocations`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim() || undefined,
					capacity: capacity ? parseInt(capacity) : undefined,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to add sub-location");
			}

			reset();
			onOpenChange(false);
			onSubLocationChanged();
			toast({
				title: "Unterbereich erstellt",
				description: `${name.trim()} wurde erfolgreich erstellt.`,
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
			setCreating(false);
		}
	};

	const handleDelete = async (subLocationId: string, name: string) => {
		try {
			const response = await fetch(
				`/api/venues/${venueId}/sublocations/${subLocationId}`,
				{ method: "DELETE" },
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete sub-location");
			}

			onSubLocationChanged();
			toast({
				title: "Unterbereich gelöscht",
				description: `${name} wurde erfolgreich gelöscht.`,
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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
				<DialogHeader>
					<DialogTitle className="text-white">Add Sub-Location</DialogTitle>
					<DialogDescription className="text-zinc-400">
						Add a floor, area, or zone to {venueName}
					</DialogDescription>
				</DialogHeader>

				{/* Existing sub-locations */}
				{subLocations.length > 0 && (
					<div className="mb-4">
						<div className="flex items-center gap-1 text-sm text-zinc-400 mb-2">
							<Layers className="h-4 w-4" />
							<span>Existing ({subLocations.length})</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{subLocations.map((sl) => (
								<div
									key={sl.id}
									className="group flex items-center gap-1 px-2.5 py-1 bg-zinc-800/50 rounded-full text-sm text-zinc-300 border border-zinc-700/50"
								>
									<span>{sl.name}</span>
									{sl.capacity && (
										<span className="text-xs text-zinc-500">{sl.capacity}</span>
									)}
									<button
										onClick={() => handleDelete(sl.id, sl.name)}
										className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<Trash2 className="h-3 w-3" />
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Add new form */}
				<div className="space-y-4 py-2">
					<div>
						<label className="text-sm text-zinc-400 mb-1 block">Name *</label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
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
							value={description}
							onChange={(e) => setDescription(e.target.value)}
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
							value={capacity}
							onChange={(e) => setCapacity(e.target.value)}
							placeholder="Max capacity for this area"
							className="bg-zinc-950 border-zinc-800"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => {
							reset();
							onOpenChange(false);
						}}
						className="border-zinc-700"
					>
						Cancel
					</Button>
					<Button
						onClick={handleAdd}
						disabled={!name.trim() || creating}
						className="bg-violet-600 hover:bg-violet-700"
					>
						{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{creating ? "Adding..." : "Add"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
