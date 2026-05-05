"use client";

import { useState, useCallback, useEffect } from "react";
import { QrCode, FormInput, LayoutDashboard, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { QRScanner } from "@/components/qr-scanner";
import { GuestEntryForm } from "@/components/guest-entry-form";
import { CapacityDashboard } from "@/components/capacity-dashboard";
import { GuestInfoPopup } from "@/components/guest-info-popup";

interface GuestData {
	id: string;
	guest_name: string;
	guest_email?: string;
	guest_phone?: string;
	category: "presale" | "guestlist" | "walkin";
	plus_ones: number;
	status: string;
	checked_in_at?: string;
	guest_list?: {
		name: string;
		event: {
			name: string;
			date: string;
		};
	};
}

interface Event {
	id: string;
	name: string;
	date: string;
	status: string;
}

interface GuestList {
	id: string;
	name: string;
	event_id: string;
}

export default function DoorScannerPage() {
	const [activeTab, setActiveTab] = useState("scanner");
	const [guestData, setGuestData] = useState<GuestData | null>(null);
	const [isPopupOpen, setIsPopupOpen] = useState(false);
	const [isCheckInLoading, setIsCheckInLoading] = useState(false);
	const [isCheckInSuccess, setIsCheckInSuccess] = useState(false);
	const [isCheckInError, setIsCheckInError] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [manualToken, setManualToken] = useState("");
	const [isManualLoading, setIsManualLoading] = useState(false);

	// Event state
	const [events, setEvents] = useState<Event[]>([]);
	const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
	const [guestLists, setGuestLists] = useState<GuestList[]>([]);
	const [selectedGuestListId, setSelectedGuestListId] = useState<string | null>(
		null,
	);
	const [isLoadingEvents, setIsLoadingEvents] = useState(true);
	const [isLoadingGuestLists, setIsLoadingGuestLists] = useState(false);

	// Fetch today's published events on mount
	useEffect(() => {
		const fetchEvents = async () => {
			setIsLoadingEvents(true);
			try {
				const today = new Date().toISOString().split("T")[0];
				const response = await fetch(
					`/api/events?date_from=${today}&date_to=${today}&status=published&limit=100`,
				);
				const result = await response.json();
				const fetchedEvents: Event[] = result.events || [];
				setEvents(fetchedEvents);
				if (fetchedEvents.length > 0) {
					setSelectedEventId(fetchedEvents[0].id);
				}
			} catch (err) {
				console.error("Failed to fetch events:", err);
			} finally {
				setIsLoadingEvents(false);
			}
		};
		fetchEvents();
	}, []);

	// Fetch guest lists when selected event changes
	useEffect(() => {
		if (!selectedEventId) {
			setGuestLists([]);
			setSelectedGuestListId(null);
			return;
		}

		const fetchGuestLists = async () => {
			setIsLoadingGuestLists(true);
			try {
				const response = await fetch(
					`/api/guest-lists?event_id=${selectedEventId}`,
				);
				const result = await response.json();
				const fetchedLists: GuestList[] = result.data || [];
				setGuestLists(fetchedLists);
				if (fetchedLists.length > 0) {
					setSelectedGuestListId(fetchedLists[0].id);
				} else {
					setSelectedGuestListId(null);
				}
			} catch (err) {
				console.error("Failed to fetch guest lists:", err);
				setGuestLists([]);
				setSelectedGuestListId(null);
			} finally {
				setIsLoadingGuestLists(false);
			}
		};
		fetchGuestLists();
	}, [selectedEventId]);

	// Handle event selection change
	const handleEventChange = (eventId: string) => {
		setSelectedEventId(eventId);
	};

	// Handle QR scan
	const handleScan = useCallback(async (decodedText: string) => {
		setIsCheckInLoading(true);
		setIsCheckInSuccess(false);
		setIsCheckInError(false);
		setErrorMessage("");

		try {
			const response = await fetch("/api/checkin", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ qr_token: decodedText }),
			});

			const result = await response.json();

			if (response.ok) {
				setGuestData(result.data);
				setIsCheckInSuccess(true);
			} else if (response.status === 409) {
				// Already checked in
				setGuestData(result.entry);
				setErrorMessage(result.error);
				setIsCheckInError(true);
			} else if (response.status === 401) {
				// Invalid token
				setErrorMessage(result.error);
				setIsCheckInError(true);
			} else {
				throw new Error(result.error || "Check-in failed");
			}
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "An error occurred",
			);
			setIsCheckInError(true);
		} finally {
			setIsCheckInLoading(false);
			setIsPopupOpen(true);
		}
	}, []);

	// Handle manual entry
	const handleManualCheckIn = async () => {
		if (!manualToken.trim()) return;

		setIsManualLoading(true);
		await handleScan(manualToken.trim());
		setManualToken("");
		setIsManualLoading(false);
	};

	// Close popup and reset state
	const handleClosePopup = () => {
		setIsPopupOpen(false);
		setGuestData(null);
		setIsCheckInSuccess(false);
		setIsCheckInError(false);
		setErrorMessage("");
	};

	// Handle guest entry success
	const handleGuestAdded = (entry: GuestData) => {
		console.log("Guest added:", entry);
	};

	const selectedEvent = events.find((e) => e.id === selectedEventId);

	return (
		<div className="min-h-screen bg-black text-white p-4 md:p-8">
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold mb-2">Door Control</h1>
					<p className="text-zinc-400">Scan QR codes or manage guest entries</p>
				</div>

				{/* Event Selection */}
				<Card className="mb-6 bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<CardContent className="pt-6">
						{isLoadingEvents ? (
							<div className="flex items-center gap-2 text-zinc-400">
								<Loader2 className="w-4 h-4 animate-spin" />
								<span>Loading events...</span>
							</div>
						) : events.length === 0 ? (
							<div className="text-zinc-400">
								<p className="font-medium">No events today</p>
								<p className="text-sm mt-1">
									There are no published events scheduled for today.
								</p>
							</div>
						) : (
							<div className="space-y-2">
								<Label htmlFor="event-select" className="text-zinc-300">
									Select Event
								</Label>
								<Select
									value={selectedEventId || ""}
									onValueChange={handleEventChange}
								>
									<SelectTrigger
										id="event-select"
										className="bg-zinc-800 border-zinc-700 text-white"
									>
										<SelectValue placeholder="Choose an event..." />
									</SelectTrigger>
									<SelectContent className="bg-zinc-800 border-zinc-700 text-white">
										{events.map((event) => (
											<SelectItem key={event.id} value={event.id}>
												{event.name} — {event.date}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{selectedEvent && (
									<p className="text-sm text-zinc-500 mt-1">
										{selectedEvent.name} — {selectedEvent.date}
										{isLoadingGuestLists && (
											<span className="ml-2 inline-flex items-center gap-1">
												<Loader2 className="w-3 h-3 animate-spin" />
												Loading guest lists...
											</span>
										)}
										{!isLoadingGuestLists && guestLists.length === 0 && (
											<span className="ml-2 text-amber-400">
												No guest lists found for this event
											</span>
										)}
									</p>
								)}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Main Tabs */}
				{selectedEventId ? (
					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						className="space-y-6"
					>
						<TabsList className="grid w-full grid-cols-3 bg-zinc-800">
							<TabsTrigger value="scanner" className="gap-2">
								<QrCode className="w-4 h-4" />
								Scanner
							</TabsTrigger>
							<TabsTrigger value="manual" className="gap-2">
								<FormInput className="w-4 h-4" />
								Manual Entry
							</TabsTrigger>
							<TabsTrigger value="dashboard" className="gap-2">
								<LayoutDashboard className="w-4 h-4" />
								Dashboard
							</TabsTrigger>
						</TabsList>

						{/* Scanner Tab */}
						<TabsContent value="scanner">
							<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
								<CardHeader>
									<CardTitle className="text-white">QR Code Scanner</CardTitle>
								</CardHeader>
								<CardContent>
									{isCheckInLoading ? (
										<div className="flex flex-col items-center justify-center py-12">
											<Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
											<p className="text-zinc-400">Processing check-in...</p>
										</div>
									) : (
										<QRScanner
											onScan={handleScan}
											enabled={activeTab === "scanner"}
										/>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						{/* Manual Entry Tab */}
						<TabsContent value="manual" className="space-y-6">
							{/* Manual QR token entry */}
							<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
								<CardHeader>
									<CardTitle className="text-white">Manual Check-in</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="manual-token" className="text-zinc-300">
											Enter QR Token or Guest ID
										</Label>
										<div className="flex gap-2">
											<Input
												id="manual-token"
												placeholder="Enter token or scan manually"
												value={manualToken}
												onChange={(e) => setManualToken(e.target.value)}
												className="bg-zinc-800 border-zinc-700 text-white"
												onKeyDown={(e) =>
													e.key === "Enter" && handleManualCheckIn()
												}
											/>
											<Button
												onClick={handleManualCheckIn}
												disabled={isManualLoading || !manualToken.trim()}
											>
												{isManualLoading ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													"Check In"
												)}
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Walk-in form */}
							<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
								<CardHeader>
									<CardTitle className="text-white">
										Add Walk-in Guest
									</CardTitle>
								</CardHeader>
								<CardContent>
									{selectedGuestListId ? (
										<GuestEntryForm
											guestListId={selectedGuestListId}
											onSuccess={handleGuestAdded}
											onError={(error) =>
												console.error("Error adding guest:", error)
											}
										/>
									) : (
										<p className="text-zinc-500 text-sm">
											{isLoadingGuestLists
												? "Loading guest lists..."
												: "No guest list available for this event. Create a guest list first."}
										</p>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						{/* Dashboard Tab */}
						<TabsContent value="dashboard">
							<CapacityDashboard
								eventId={selectedEventId}
								refreshInterval={10000}
							/>
						</TabsContent>
					</Tabs>
				) : (
					!isLoadingEvents &&
					events.length === 0 && (
						<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
							<CardContent className="py-12 text-center">
								<p className="text-zinc-400 text-lg">
									No events scheduled for today
								</p>
								<p className="text-zinc-600 text-sm mt-2">
									Publish an event to start using the door control system.
								</p>
							</CardContent>
						</Card>
					)
				)}

				{/* Guest Info Popup */}
				<GuestInfoPopup
					guest={guestData}
					isOpen={isPopupOpen}
					onClose={handleClosePopup}
					isCheckInSuccess={isCheckInSuccess}
					isCheckInError={isCheckInError}
					errorMessage={errorMessage}
				/>
			</div>
		</div>
	);
}
