"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
	AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { RunningOrder } from "@/components/running-order";
import { PerformanceForm } from "@/components/performance-form";
import { formatDateFull } from "@/lib/dates";
import {
	CalendarDays,
	Clock,
	MapPin,
	Users,
	Edit,
	Download,
	Share2,
	Trash2,
	Plus,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/page-skeleton";
import { statusBadgeClass } from "@/lib/utils";

interface Event {
	id: string;
	name: string;
	date: string;
	door_time: string | null;
	end_time: string | null;
	status: string;
	max_capacity: number | null;
	venues: {
		name: string;
		address: string;
		capacity: number;
	} | null;
}

export default function EventDetailPage() {
	const params = useParams();
	const router = useRouter();
	const eventId = params.id as string;
	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [addPerformanceOpen, setAddPerformanceOpen] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		fetchEvent();
	}, [eventId]);

	const fetchEvent = async () => {
		setLoading(true);
		try {
			const response = await fetch(`/api/events/${eventId}`);
			const data = await response.json();
			setEvent(data);
		} catch (error) {
			console.error("Failed to fetch event:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleDownloadItinerary = async () => {
		try {
			const response = await fetch(`/api/itinerary/${eventId}?format=pdf`);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `itinerary_${eventId}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		} catch (error) {
			console.error("Failed to download itinerary:", error);
		}
	};

	const handleDeleteEvent = async () => {
		try {
			await fetch(`/api/events/${eventId}`, { method: "DELETE" });
			router.push("/events");
		} catch (error) {
			console.error("Failed to delete event:", error);
		}
	};

	const handleAddPerformance = () => {
		setAddPerformanceOpen(true);
	};

	const handlePerformanceSuccess = (performance: any) => {
		setAddPerformanceOpen(false);
		setRefreshKey((prev) => prev + 1);
		toast({
			title: "Performance added",
			description: "The performance has been added to the running order.",
		});
	};

	const handlePerformanceError = (error: string) => {
		toast({
			variant: "destructive",
			title: "Error",
			description: error,
		});
	};

	if (loading) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
				<PageSkeleton rows={3} />
			</div>
		);
	}

	if (!event) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<CardContent className="py-12 text-center">
						<p className="text-zinc-400">Event not found</p>
						<Link href="/events">
							<Button className="mt-4 bg-violet-600 hover:bg-violet-700">
								Back to Events
							</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			{/* Header */}
			<div className="flex justify-between items-start mb-8">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-bold text-white">{event.name}</h1>
						<Badge className={statusBadgeClass(event.status)}>
							{event.status}
						</Badge>
					</div>
					<div className="flex flex-wrap items-center gap-4 text-zinc-400">
						<div className="flex items-center gap-1">
							<CalendarDays className="h-4 w-4" />
							<span>{formatDateFull(event.date)}</span>
						</div>
						{event.venues && (
							<div className="flex items-center gap-1">
								<MapPin className="h-4 w-4" />
								<span>{event.venues.name}</span>
							</div>
						)}
						{event.door_time && event.end_time && (
							<div className="flex items-center gap-1">
								<Clock className="h-4 w-4" />
								<span>
									{event.door_time} - {event.end_time}
								</span>
							</div>
						)}
						{event.max_capacity && (
							<div className="flex items-center gap-1">
								<Users className="h-4 w-4" />
								<span>Max {event.max_capacity}</span>
							</div>
						)}
					</div>
				</div>

				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={handleDownloadItinerary}
						className="border-zinc-700"
					>
						<Download className="h-4 w-4 mr-2" />
						Itinerary PDF
					</Button>
					<Button variant="outline" className="border-zinc-700">
						<Share2 className="h-4 w-4 mr-2" />
						Share
					</Button>
					<Link href={`/events/${eventId}/edit`}>
						<Button className="bg-violet-600 hover:bg-violet-700">
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</Button>
					</Link>
					<Button
						variant="destructive"
						onClick={() => setShowDeleteDialog(true)}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<AlertDialogHeader>
						<AlertDialogTitle>Löschen bestätigen</AlertDialogTitle>
						<AlertDialogDescription>
							Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht
							werden.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-zinc-700">
							Abbrechen
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteEvent}
							className="bg-red-600 hover:bg-red-700"
						>
							Löschen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Venue info */}
			{event.venues && (
				<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
					<CardHeader>
						<CardTitle className="text-lg">Venue</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-2">
							<MapPin className="h-5 w-5 text-violet-400" />
							<div>
								<p className="font-medium">{event.venues.name}</p>
								<p className="text-sm text-zinc-400">{event.venues.address}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Running Order */}
			<RunningOrder
				key={refreshKey}
				eventId={eventId}
				onAddPerformance={handleAddPerformance}
			/>

			{/* Add Performance Modal */}
			<Dialog open={addPerformanceOpen} onOpenChange={setAddPerformanceOpen}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<DialogHeader>
						<DialogTitle>Add Performance</DialogTitle>
					</DialogHeader>
					<PerformanceForm
						eventId={eventId}
						onSuccess={handlePerformanceSuccess}
						onError={handlePerformanceError}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}
