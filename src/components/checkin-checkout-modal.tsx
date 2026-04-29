"use client";

import { useState, useEffect } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/browser";
import { Loader2 } from "lucide-react";

interface SubLocation {
	id: string;
	venue_id: string;
	name: string;
	description: string | null;
}

interface Venue {
	id: string;
	name: string;
	sub_locations: SubLocation[];
}

interface CheckinCheckoutModalProps {
	itemId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

const ACTIONS = [
	{ value: "check_in", label: "Check In" },
	{ value: "check_out", label: "Check Out" },
	{ value: "transfer", label: "Transfer" },
];

export function CheckinCheckoutModal({
	itemId,
	open,
	onOpenChange,
	onSuccess,
}: CheckinCheckoutModalProps) {
	const [action, setAction] = useState("check_in");
	const [location, setLocation] = useState("");
	const [venues, setVenues] = useState<Venue[]>([]);
	const [selectedVenueId, setSelectedVenueId] = useState("");
	const [selectedSubLocationId, setSelectedSubLocationId] = useState("");
	const [subLocations, setSubLocations] = useState<SubLocation[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch venues with sub-locations when dialog opens
	useEffect(() => {
		if (open) {
			const fetchVenues = async () => {
				try {
					const response = await fetch("/api/venues");
					const data = await response.json();
					setVenues(data.venues || []);
				} catch (err) {
					console.error("Failed to fetch venues:", err);
				}
			};
			fetchVenues();

			// Reset state
			setAction("check_in");
			setLocation("");
			setSelectedVenueId("");
			setSelectedSubLocationId("");
			setSubLocations([]);
			setError(null);
		}
	}, [open]);

	const handleVenueChange = (venueId: string) => {
		setSelectedVenueId(venueId);
		setSelectedSubLocationId("");
		const venue = venues.find((v) => v.id === venueId);
		setSubLocations(venue?.sub_locations || []);
	};

	const handleSubLocationChange = (subLocationId: string) => {
		setSelectedSubLocationId(subLocationId);
		const venue = venues.find((v) => v.id === selectedVenueId);
		const subLoc = venue?.sub_locations?.find((sl) => sl.id === subLocationId);
		if (venue && subLoc) {
			setLocation(`${venue.name} > ${subLoc.name}`);
		}
	};

	const handleSubmit = async () => {
		// Require either a typed location or a venue+sub-location selection
		if (!location.trim() && !selectedSubLocationId) {
			setError("Location is required (type a location or select Venue > Area)");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			const moved_by = user?.id;

			if (!moved_by) {
				setError("You must be logged in");
				setLoading(false);
				return;
			}

			const payload: Record<string, string> = {
				location: location.trim() || "Unknown",
				action,
				moved_by,
			};

			if (selectedSubLocationId) {
				payload.sub_location_id = selectedSubLocationId;
			}

			const response = await fetch(`/api/items/${itemId}/location-history`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to log location");
			}

			onOpenChange(false);
			onSuccess();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-zinc-900 border-zinc-800 text-white">
				<DialogHeader>
					<DialogTitle>Log Location Change</DialogTitle>
					<DialogDescription className="text-zinc-400">
						Record a check-in, check-out, or transfer for this item.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Action</label>
						<Select value={action} onValueChange={setAction}>
							<SelectTrigger className="bg-zinc-950 border-zinc-800">
								<SelectValue placeholder="Select action" />
							</SelectTrigger>
							<SelectContent className="bg-zinc-900 border-zinc-800">
								{ACTIONS.map((a) => (
									<SelectItem key={a.value} value={a.value}>
										{a.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Venue Select */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Venue (optional)</label>
						<Select value={selectedVenueId} onValueChange={handleVenueChange}>
							<SelectTrigger className="bg-zinc-950 border-zinc-800">
								<SelectValue placeholder="Select venue..." />
							</SelectTrigger>
							<SelectContent className="bg-zinc-900 border-zinc-800">
								{venues.map((venue) => (
									<SelectItem key={venue.id} value={venue.id}>
										{venue.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Sub-Location Select */}
					{selectedVenueId && subLocations.length > 0 && (
						<div className="space-y-2">
							<label className="text-sm font-medium">Area / Sub-Location</label>
							<Select
								value={selectedSubLocationId}
								onValueChange={handleSubLocationChange}
							>
								<SelectTrigger className="bg-zinc-950 border-zinc-800">
									<SelectValue placeholder="Select area..." />
								</SelectTrigger>
								<SelectContent className="bg-zinc-900 border-zinc-800">
									{subLocations.map((sl) => (
										<SelectItem key={sl.id} value={sl.id}>
											{sl.name}
											{sl.description ? ` — ${sl.description}` : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Manual location input */}
					<div className="space-y-2">
						<label className="text-sm font-medium">
							Or type location manually
						</label>
						<Input
							value={location}
							onChange={(e) => setLocation(e.target.value)}
							placeholder="Enter custom location..."
							className="bg-zinc-950 border-zinc-800"
						/>
					</div>

					{error && <div className="text-red-500 text-sm">{error}</div>}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="border-zinc-800"
					>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={loading}
						className="bg-violet-600 hover:bg-violet-700"
					>
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Submit
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
