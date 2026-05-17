"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Music, Plus } from "lucide-react";

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
	"Other",
];

interface QuickArtistCreateProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onArtistCreated: (artist: {
		id: string;
		name: string;
		genre: string | null;
		city: string | null;
	}) => void;
}

export function QuickArtistCreate({
	open,
	onOpenChange,
	onArtistCreated,
}: QuickArtistCreateProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [genre, setGenre] = useState("");
	const [city, setCity] = useState("");

	const handleCreate = async () => {
		if (!name.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const response = await fetch("/api/artists", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					genre: genre || null,
					city: city || null,
				}),
			});
			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.error || "Failed to create artist");
			}
			const artist = await response.json();
			onArtistCreated(artist);
			onOpenChange(false);
			setName("");
			setGenre("");
			setCity("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Music className="h-5 w-5 text-violet-400" />
						Create New Artist
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div>
						<label className="text-sm font-medium text-zinc-300 mb-1.5 block">
							Name *
						</label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Artist name"
							className="bg-zinc-900 border-zinc-700"
							autoFocus
						/>
					</div>
					<div>
						<label className="text-sm font-medium text-zinc-300 mb-1.5 block">
							Genre
						</label>
						<select
							value={genre}
							onChange={(e) => setGenre(e.target.value)}
							className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
						>
							<option value="">Select genre</option>
							{GENRES.map((g) => (
								<option key={g} value={g}>
									{g}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="text-sm font-medium text-zinc-300 mb-1.5 block">
							City
						</label>
						<Input
							value={city}
							onChange={(e) => setCity(e.target.value)}
							placeholder="Artist city"
							className="bg-zinc-900 border-zinc-700"
						/>
					</div>
					{error && <p className="text-sm text-red-400">{error}</p>}
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="border-zinc-700"
					>
						Cancel
					</Button>
					<Button
						onClick={handleCreate}
						disabled={!name.trim() || loading}
						className="bg-violet-600 hover:bg-violet-700"
					>
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						<Plus className="mr-1.5 h-4 w-4" />
						Create Artist
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
