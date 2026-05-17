"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Calendar, List } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { GuestList, FlatEvent } from "./page";

// ── Client Component ──────────────────────────────────────────────────

export function GuestListsClient({
	initialGuestLists,
	initialEvents,
}: {
	initialGuestLists: GuestList[];
	initialEvents: FlatEvent[];
}) {
	const { toast } = useToast();
	const [guestLists, setGuestLists] = useState<GuestList[]>(initialGuestLists);
	const [events] = useState<FlatEvent[]>(initialEvents);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newListName, setNewListName] = useState("");
	const [newListEventId, setNewListEventId] = useState("");

	// ── Create handler ──────────────────────────────────────────────────
	const handleCreateList = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newListName || !newListEventId) return;

		try {
			const response = await fetch("/api/guest-lists", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: newListName,
					event_id: newListEventId,
				}),
			});

			if (!response.ok) throw new Error("Failed to create guest list");

			setNewListName("");
			setNewListEventId("");
			setShowCreateForm(false);

			// Re-fetch to get updated list with server-generated data
			const refetch = await fetch("/api/guest-lists");
			if (refetch.ok) {
				const data = await refetch.json();
				setGuestLists(data.data || []);
			}

			toast({
				title: "Gästeliste erstellt",
				description: `${newListName} wurde erfolgreich erstellt.`,
			});
		} catch (err) {
			console.error("Failed to create guest list:", err);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					err instanceof Error
						? err.message
						: "Fehler beim Erstellen der Gästeliste.",
			});
		}
	};

	// ── Helpers ─────────────────────────────────────────────────────────
	const getStatusCounts = (entries: { status: string }[]) => {
		const counts = { pending: 0, checked_in: 0, cancelled: 0 };
		entries.forEach((entry) => {
			if (entry.status in counts) {
				counts[entry.status as keyof typeof counts]++;
			}
		});
		return counts;
	};

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">Guest Lists</h1>
				<p className="text-zinc-400 mt-2">
					Manage guest lists and entries for your events
				</p>
			</div>

			{/* Create Form */}
			{showCreateForm && (
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
					<CardHeader>
						<CardTitle className="text-white">Create New Guest List</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleCreateList} className="space-y-4">
							<div>
								<label className="text-sm text-zinc-400 mb-1 block">
									List Name
								</label>
								<Input
									value={newListName}
									onChange={(e) => setNewListName(e.target.value)}
									placeholder="e.g., VIP, Press, Team"
									className="bg-zinc-950 border-zinc-800"
									required
								/>
							</div>
							<div>
								<label className="text-sm text-zinc-400 mb-1 block">
									Event
								</label>
								<select
									value={newListEventId}
									onChange={(e) => setNewListEventId(e.target.value)}
									className="w-full bg-zinc-950 border-zinc-800 p-2 text-white rounded"
									required
								>
									<option value="">Select an event</option>
									{events.map((event) => (
										<option key={event.id} value={event.id}>
											{event.name}
										</option>
									))}
								</select>
							</div>
							<div className="flex gap-2">
								<Button
									type="submit"
									className="bg-violet-600 hover:bg-violet-700"
								>
									Create List
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => setShowCreateForm(false)}
									className="border-zinc-700"
								>
									Cancel
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			)}

			{/* Header Actions */}
			<div className="flex justify-between items-center mb-6">
				<p className="text-sm text-zinc-400">{guestLists.length} guest lists</p>
				<Button
					className="bg-violet-600 hover:bg-violet-700"
					onClick={() => setShowCreateForm(true)}
				>
					<Plus className="h-4 w-4 mr-2" />
					New Guest List
				</Button>
			</div>

			{/* Guest Lists Grid */}
			{guestLists.length === 0 ? (
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<CardContent className="py-12 text-center">
						<List className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
						<p className="text-zinc-400">No guest lists yet</p>
						<Button
							className="mt-4 bg-violet-600 hover:bg-violet-700"
							onClick={() => setShowCreateForm(true)}
						>
							Create your first guest list
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{guestLists.map((list) => {
						const counts = getStatusCounts(list.entries || []);
						return (
							<Link key={list.id} href={`/guest-lists/${list.id}`}>
								<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 hover:border-violet-600/50 transition-colors cursor-pointer h-full">
									<CardContent className="pt-6">
										<div className="space-y-3">
											<h3 className="text-lg font-semibold text-white">
												{list.name}
											</h3>
											{list.event && (
												<div className="flex items-center text-sm text-zinc-400">
													<Calendar className="h-4 w-4 mr-1" />
													{list.event.name}
												</div>
											)}
											<div className="flex items-center gap-4 text-sm">
												<span className="flex items-center text-zinc-300">
													<Users className="h-4 w-4 mr-1" />
													{list.entries?.length || 0} guests
												</span>
											</div>
											<div className="flex gap-2">
												<Badge
													variant="outline"
													className="border-yellow-600/50 text-yellow-400"
												>
													{counts.pending} pending
												</Badge>
												<Badge
													variant="outline"
													className="border-green-600/50 text-green-400"
												>
													{counts.checked_in} checked in
												</Badge>
											</div>
										</div>
									</CardContent>
								</Card>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}
