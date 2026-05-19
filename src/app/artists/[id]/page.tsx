"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	ArrowLeft,
	MapPin,
	Music,
	Mail,
	Phone,
	ExternalLink,
	Pencil,
	Calendar,
	Clock,
	Plus,
	Trash2,
	Loader2,
	Ticket,
	Disc3,
	Building2,
} from "lucide-react";
import Link from "next/link";
import { RiderViewer } from "@/components/rider-viewer";

interface Performance {
	id: string;
	event_id: string;
	artist_id: string;
	start_time: string;
	end_time: string;
	stage: string;
	order_index: number;
	events?: {
		id: string;
		name: string;
		date: string;
		venue_id: string;
	};
}

interface EventOption {
	id: string;
	name: string;
	date: string;
	venues?: { name: string } | null;
}

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
	tech_rider: Record<string, unknown> | null;
	hospitality_rider: Record<string, unknown> | null;
	labels: Label[];
	agencies: Agency[];
	created_at: string;
	updated_at: string;
}

export default function ArtistDetailPage() {
	const params = useParams();
	const router = useRouter();
	const [artist, setArtist] = useState<Artist | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Performance / event assignment state
	const [performances, setPerformances] = useState<Performance[]>([]);
	const [loadingPerformances, setLoadingPerformances] = useState(false);
	const [availableEvents, setAvailableEvents] = useState<EventOption[]>([]);
	const [loadingEvents, setLoadingEvents] = useState(false);
	const [showAssignDialog, setShowAssignDialog] = useState(false);
	const [assigning, setAssigning] = useState(false);
	const [assignError, setAssignError] = useState<string | null>(null);

	// Assign form state
	const [selectedEventId, setSelectedEventId] = useState("");
	const [startTime, setStartTime] = useState("22:00");
	const [endTime, setEndTime] = useState("23:00");
	const [stage, setStage] = useState("main");

	useEffect(() => {
		const fetchArtist = async () => {
			try {
				const response = await fetch(`/api/artists/${params.id}`);
				if (!response.ok) throw new Error("Artist not found");
				const data = await response.json();
				setArtist(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load artist");
			} finally {
				setLoading(false);
			}
		};

		if (params.id) fetchArtist();
	}, [params.id]);

	// Fetch performances for this artist
	const fetchPerformances = useCallback(async () => {
		if (!params.id) return;
		setLoadingPerformances(true);
		try {
			const response = await fetch(`/api/performances?artist_id=${params.id}`);
			if (response.ok) {
				const data = await response.json();
				// Fetch event names for each performance
				const perfsWithEvents = await Promise.all(
					(data.performances || []).map(async (perf: Performance) => {
						try {
							const evResp = await fetch(`/api/events/${perf.event_id}`);
							if (evResp.ok) {
								const evData = await evResp.json();
								return { ...perf, events: evData };
							}
						} catch {
							// ignore
						}
						return perf;
					}),
				);
				setPerformances(perfsWithEvents);
			}
		} catch (err) {
			console.error("Failed to fetch performances:", err);
		} finally {
			setLoadingPerformances(false);
		}
	}, [params.id]);

	useEffect(() => {
		fetchPerformances();
	}, [fetchPerformances]);

	// Fetch available events for the assign dialog
	const fetchAvailableEvents = async () => {
		setLoadingEvents(true);
		try {
			const response = await fetch("/api/events?limit=100");
			if (response.ok) {
				const data = await response.json();
				setAvailableEvents(data.events || []);
			}
		} catch (err) {
			console.error("Failed to fetch events:", err);
		} finally {
			setLoadingEvents(false);
		}
	};

	const openAssignDialog = () => {
		setSelectedEventId("");
		setStartTime("22:00");
		setEndTime("23:00");
		setStage("main");
		setAssignError(null);
		fetchAvailableEvents();
		setShowAssignDialog(true);
	};

	// Assign artist to event
	const handleAssign = async () => {
		if (!selectedEventId || !startTime || !endTime) {
			setAssignError("Please fill all required fields");
			return;
		}

		setAssigning(true);
		setAssignError(null);
		try {
			const response = await fetch("/api/performances", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					event_id: selectedEventId,
					artist_id: params.id,
					start_time: startTime,
					end_time: endTime,
					stage,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to assign artist");
			}

			setShowAssignDialog(false);
			fetchPerformances();
		} catch (err) {
			setAssignError(
				err instanceof Error ? err.message : "Failed to assign artist",
			);
		} finally {
			setAssigning(false);
		}
	};

	// Remove artist from event
	const handleRemovePerformance = async (perfId: string) => {
		try {
			const response = await fetch(`/api/performances/${perfId}`, {
				method: "DELETE",
			});
			if (response.ok) {
				setPerformances((prev) => prev.filter((p) => p.id !== perfId));
			}
		} catch (err) {
			console.error("Failed to remove performance:", err);
		}
	};

	const formatEventDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	if (loading) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
				<div className="flex items-center gap-4 mb-8">
					<Skeleton className="h-10 w-10 bg-zinc-800" />
					<Skeleton className="h-10 w-64 bg-zinc-800" />
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2">
						<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
							<CardContent className="pt-6 space-y-6">
								<Skeleton className="h-8 w-3/4 bg-zinc-800" />
								<Skeleton className="h-24 w-full bg-zinc-800" />
								<Skeleton className="h-24 w-full bg-zinc-800" />
							</CardContent>
						</Card>
					</div>
					<div>
						<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
							<CardContent className="pt-6 space-y-4">
								<Skeleton className="h-6 w-full bg-zinc-800" />
								<Skeleton className="h-6 w-full bg-zinc-800" />
								<Skeleton className="h-6 w-full bg-zinc-800" />
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	if (error || !artist) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
					<CardContent className="py-12 text-center">
						<p className="text-red-400">{error || "Artist not found"}</p>
						<Button
							variant="outline"
							className="mt-4 border-zinc-800"
							onClick={() => router.push("/artists")}
						>
							Back to Artists
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div className="flex items-center gap-4">
					<Button
						variant="outline"
						size="icon"
						className="border-zinc-800"
						onClick={() => router.push("/artists")}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<h1 className="text-3xl font-bold text-white">{artist.name}</h1>
						<div className="flex items-center gap-3 mt-1">
							{artist.genre && (
								<Badge
									variant="outline"
									className="border-violet-600/50 text-violet-400"
								>
									<Music className="h-3 w-3 mr-1" />
									{artist.genre}
								</Badge>
							)}
							{artist.city && (
								<span className="text-zinc-400 text-sm flex items-center">
									<MapPin className="h-4 w-4 mr-1" />
									{artist.city}
								</span>
							)}
						</div>
						{/* Labels & Agencies */}
						<div className="flex flex-wrap items-center gap-2 mt-1.5">
							{artist.labels && artist.labels.length > 0 && (
								<>
									{artist.labels.map((l) => (
										<Badge
											key={l.id}
											variant="outline"
											className="border-amber-600/40 text-amber-400 text-[11px]"
										>
											<Disc3 className="h-3 w-3 mr-1" />
											{l.name}
										</Badge>
									))}
								</>
							)}
							{artist.agencies && artist.agencies.length > 0 && (
								<>
									{artist.agencies.map((a) => (
										<Badge
											key={a.id}
											variant="outline"
											className="border-blue-600/40 text-blue-400 text-[11px]"
										>
											<Building2 className="h-3 w-3 mr-1" />
											{a.name}
										</Badge>
									))}
								</>
							)}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						className="border-violet-600/50 text-violet-400 hover:bg-violet-950/50"
						onClick={openAssignDialog}
					>
						<Plus className="h-4 w-4 mr-2" />
						Assign to Event
					</Button>
					<Link href={`/artists/${artist.id}/edit`}>
						<Button className="bg-violet-600 hover:bg-violet-700">
							<Pencil className="h-4 w-4 mr-2" />
							Edit
						</Button>
					</Link>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Event Assignments */}
					<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle className="text-white flex items-center gap-2">
								<Ticket className="h-5 w-5 text-violet-400" />
								Event Assignments
								{performances.length > 0 && (
									<Badge
										variant="outline"
										className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] ml-2"
									>
										{performances.length}
									</Badge>
								)}
							</CardTitle>
							<Button
								size="sm"
								variant="outline"
								className="border-violet-600/50 text-violet-400 hover:bg-violet-950/50"
								onClick={openAssignDialog}
							>
								<Plus className="h-3 w-3 mr-1" />
								Assign
							</Button>
						</CardHeader>
						<CardContent>
							{loadingPerformances ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
								</div>
							) : performances.length === 0 ? (
								<div className="text-center py-8 text-zinc-500">
									<Ticket className="h-10 w-10 mx-auto mb-3 opacity-40" />
									<p>Not assigned to any events yet</p>
									<p className="text-sm mt-1">
										Click &quot;Assign to Event&quot; to book this artist
									</p>
								</div>
							) : (
								<div className="space-y-2">
									{performances.map((perf) => {
										const eventName =
											perf.events?.name || `Event ${perf.event_id.slice(0, 6)}`;
										const eventDate = perf.events?.date
											? formatEventDate(perf.events.date)
											: "Unknown date";

										return (
											<div
												key={perf.id}
												className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-violet-700/40 transition-colors cursor-pointer"
												onClick={() => router.push(`/events/${perf.event_id}`)}
											>
												<div className="flex items-center gap-3 min-w-0">
													<Calendar className="h-4 w-4 text-violet-400 flex-shrink-0" />
													<div className="min-w-0">
														<p className="text-white font-medium truncate">
															{eventName}
														</p>
														<div className="flex items-center gap-2 mt-0.5">
															<span className="text-xs text-zinc-400">
																{eventDate}
															</span>
															<span className="text-xs text-zinc-600">·</span>
															<span className="text-xs text-zinc-400 flex items-center gap-1">
																<Clock className="h-3 w-3" />
																{perf.start_time?.slice(0, 5)} —{" "}
																{perf.end_time?.slice(0, 5)}
															</span>
															<span className="text-xs text-zinc-600">·</span>
															<Badge
																variant="outline"
																className="border-zinc-700 text-zinc-400 text-[10px] capitalize py-0"
															>
																{perf.stage}
															</Badge>
														</div>
													</div>
												</div>
												<Button
													variant="ghost"
													size="icon"
													className="text-red-400 hover:bg-red-950/50 flex-shrink-0 ml-2"
													onClick={(e) => {
														e.stopPropagation();
														handleRemovePerformance(perf.id);
													}}
													title="Remove from event"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>

					{artist.bio && (
						<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
							<CardHeader>
								<CardTitle className="text-white">Biography</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-zinc-300 whitespace-pre-wrap">
									{artist.bio}
								</p>
							</CardContent>
						</Card>
					)}

					{/* Rider Viewer */}
					<RiderViewer
						artistId={artist.id}
						artistName={artist.name}
						techRider={artist.tech_rider as never}
						hospitalityRider={artist.hospitality_rider as never}
						onRiderUpdated={() => window.location.reload()}
					/>

					{artist.promo_pack_url && (
						<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
							<CardHeader>
								<CardTitle className="text-white">Promo Materials</CardTitle>
							</CardHeader>
							<CardContent>
								<a
									href={artist.promo_pack_url}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center text-violet-400 hover:text-violet-300"
								>
									<ExternalLink className="h-4 w-4 mr-2" />
									View Promo Pack
								</a>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{artist.fee !== null && (
						<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
							<CardHeader>
								<CardTitle className="text-white">Booking Fee</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-2xl font-bold text-violet-400">
									€{artist.fee.toLocaleString()}
								</p>
							</CardContent>
						</Card>
					)}

					<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
						<CardHeader>
							<CardTitle className="text-white">Contact</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{artist.contact_email && (
								<a
									href={`mailto:${artist.contact_email}`}
									className="flex items-center text-zinc-300 hover:text-white"
								>
									<Mail className="h-4 w-4 mr-2 text-zinc-400" />
									{artist.contact_email}
								</a>
							)}
							{artist.contact_phone && (
								<a
									href={`tel:${artist.contact_phone}`}
									className="flex items-center text-zinc-300 hover:text-white"
								>
									<Phone className="h-4 w-4 mr-2 text-zinc-400" />
									{artist.contact_phone}
								</a>
							)}
							{!artist.contact_email && !artist.contact_phone && (
								<p className="text-zinc-400 text-sm">No contact information</p>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Assign to Event Dialog */}
			<Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
					<DialogHeader>
						<DialogTitle className="text-white flex items-center gap-2">
							<Ticket className="h-5 w-5 text-violet-400" />
							Assign {artist.name} to Event
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						{assignError && (
							<div className="p-3 bg-red-950/50 border border-red-700 rounded-lg text-red-400 text-sm">
								{assignError}
							</div>
						)}

						{/* Event selector */}
						<div>
							<Label className="text-sm text-zinc-400">Event *</Label>
							<Select
								value={selectedEventId}
								onValueChange={setSelectedEventId}
								disabled={loadingEvents}
							>
								<SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
									<SelectValue placeholder="Select an event..." />
								</SelectTrigger>
								<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 max-h-60">
									{loadingEvents ? (
										<div className="flex items-center justify-center py-4">
											<Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
										</div>
									) : availableEvents.length === 0 ? (
										<p className="text-zinc-500 text-sm text-center py-4">
											No events available
										</p>
									) : (
										availableEvents.map((event) => (
											<SelectItem key={event.id} value={event.id}>
												<div className="flex items-center gap-2">
													<span>{event.name}</span>
													<span className="text-xs text-zinc-500">
														{formatEventDate(event.date)}
													</span>
												</div>
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>

						{/* Time inputs */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label className="text-sm text-zinc-400">Start Time *</Label>
								<Input
									type="time"
									value={startTime}
									onChange={(e) => setStartTime(e.target.value)}
									className="bg-zinc-950 border-zinc-800 mt-1"
								/>
							</div>
							<div>
								<Label className="text-sm text-zinc-400">End Time *</Label>
								<Input
									type="time"
									value={endTime}
									onChange={(e) => setEndTime(e.target.value)}
									className="bg-zinc-950 border-zinc-800 mt-1"
								/>
							</div>
						</div>

						{/* Stage selector */}
						<div>
							<Label className="text-sm text-zinc-400">Stage</Label>
							<Select value={stage} onValueChange={setStage}>
								<SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70">
									<SelectItem value="main">Main Stage</SelectItem>
									<SelectItem value="second">Second Stage</SelectItem>
									<SelectItem value="outdoor">Outdoor</SelectItem>
									<SelectItem value="vip">VIP Area</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Actions */}
						<div className="flex gap-3 pt-2">
							<Button
								variant="outline"
								className="flex-1 border-zinc-700"
								onClick={() => setShowAssignDialog(false)}
							>
								Cancel
							</Button>
							<Button
								className="flex-1 bg-violet-600 hover:bg-violet-700"
								onClick={handleAssign}
								disabled={assigning || !selectedEventId}
							>
								{assigning ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Assigning...
									</>
								) : (
									"Assign to Event"
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
