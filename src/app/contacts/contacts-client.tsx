"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { SearchFilterBar } from "@/components/search-filter-bar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
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
import { cn } from "@/lib/utils";
import {
	Phone,
	Mail,
	Building2,
	Users,
	Search,
	ChevronRight,
	Plus,
	Pencil,
	Trash2,
	Loader2,
	Building,
} from "lucide-react";
import { ContactForm } from "@/components/contact-form";

// ── Types ───────────────────────────────────────────────────────────────

interface VenueAssociation {
	id: string;
	name: string;
}

interface ContactEntry {
	id: string;
	name: string;
	phone: string | null;
	email: string | null;
	role: string | null;
	staff_roles: string[];
	venues: VenueAssociation[];
	is_standalone?: boolean;
	company?: string | null;
}

// ── Contacts Client ───────────────────────────────────────────────────

export function ContactsClient({
	initialContacts,
}: {
	initialContacts?: ContactEntry[];
}) {
	const [contacts, setContacts] = useState<ContactEntry[]>(
		initialContacts || [],
	);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [sourceFilter, setSourceFilter] = useState<string>("");

	// Detail dialog
	const [selectedContact, setSelectedContact] = useState<ContactEntry | null>(
		null,
	);
	const [detailOpen, setDetailOpen] = useState(false);

	// Create / Edit dialog
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [editingContact, setEditingContact] = useState<ContactEntry | null>(
		null,
	);

	// Delete confirmation
	const [deletingContact, setDeletingContact] = useState<ContactEntry | null>(
		null,
	);
	const [isDeleting, setIsDeleting] = useState(false);

	// ── Data Fetching ─────────────────────────────────────────────────
	const fetchContacts = useCallback(async () => {
		setLoading(true);
		try {
			const response = await fetch("/api/contacts");
			const data = await response.json();
			setContacts(data.contacts || []);
		} catch (err) {
			console.error("Failed to fetch contacts:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchContacts();
	}, [fetchContacts]);

	// ── Filtering ─────────────────────────────────────────────────────
	const filtered = contacts.filter((c) => {
		if (sourceFilter && sourceFilter !== "all") {
			if (sourceFilter === "Staff" && c.staff_roles.length === 0) return false;
			if (sourceFilter === "Venue" && c.venues.length === 0) return false;
			if (sourceFilter === "Contact" && !c.is_standalone) return false;
		}
		if (!searchQuery) return true;
		const q = searchQuery.toLowerCase();
		return (
			c.name.toLowerCase().includes(q) ||
			(c.phone?.toLowerCase() || "").includes(q) ||
			(c.email?.toLowerCase() || "").includes(q) ||
			(c.role?.toLowerCase() || "").includes(q) ||
			c.venues.some((v) => v.name.toLowerCase().includes(q)) ||
			(c.company?.toLowerCase() || "").includes(q)
		);
	});

	// ── Handlers ──────────────────────────────────────────────────────
	const openDetail = (contact: ContactEntry) => {
		setSelectedContact(contact);
		setDetailOpen(true);
	};

	const handleCreateSuccess = () => {
		setShowCreateDialog(false);
		fetchContacts();
	};

	const handleEditStart = () => {
		setEditingContact(selectedContact);
		setDetailOpen(false);
	};

	const handleEditSuccess = () => {
		setEditingContact(null);
		fetchContacts();
	};

	const handleDeleteStart = () => {
		setDeletingContact(selectedContact);
		setDetailOpen(false);
	};

	const handleDeleteConfirm = async () => {
		if (!deletingContact) return;
		setIsDeleting(true);
		try {
			const response = await fetch(`/api/contacts/${deletingContact.id}`, {
				method: "DELETE",
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete contact");
			}
			setDeletingContact(null);
			setSelectedContact(null);
			fetchContacts();
		} catch (err) {
			console.error("Error deleting contact:", err);
		} finally {
			setIsDeleting(false);
		}
	};

	// ── Badges ────────────────────────────────────────────────────────
	const getSourceBadges = (contact: ContactEntry) => {
		const badges: { label: string; active: boolean; color: string }[] = [];
		if (contact.staff_roles.length > 0) {
			badges.push({
				label: "Staff",
				active: true,
				color: "border-cyan-600/50 text-cyan-400",
			});
		}
		if (contact.venues.length > 0) {
			badges.push({
				label: "Venue",
				active: true,
				color: "border-amber-600/50 text-amber-400",
			});
		}
		if (contact.is_standalone) {
			badges.push({
				label: "Contact",
				active: true,
				color: "border-emerald-600/50 text-emerald-400",
			});
		}
		return badges;
	};

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">Telephone Book</h1>
				<p className="text-zinc-400 mt-2">
					Contact directory for staff, venue managers, and partners
				</p>
			</div>

			{/* Search & Filters */}
			<Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
				<CardContent className="pt-6">
					<SearchFilterBar
						placeholder="Search by name, phone, email, or role..."
						searchValue={searchQuery}
						onSearchChange={setSearchQuery}
						filters={[
							{
								key: "source",
								label: "Filter by source",
								options: [
									{ value: "all", label: "All" },
									{ value: "Staff", label: "Staff" },
									{ value: "Venue", label: "Venue" },
									{ value: "Contact", label: "Contact" },
								],
								value: sourceFilter,
								onChange: setSourceFilter,
							},
						]}
					/>
					<div className="mt-4 flex items-center justify-between">
						<p className="text-sm text-zinc-500">
							{filtered.length} of {contacts.length} contacts
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowCreateDialog(true)}
							className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-violet-600/20 hover:border-violet-600/50"
						>
							<Plus className="h-4 w-4 mr-1.5" />
							Add Contact
						</Button>
					</div>
				</CardContent>
			</Card>

			{loading ? (
				<div className="flex justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-violet-400" />
				</div>
			) : filtered.length === 0 ? (
				<EmptyState
					icon={Search}
					title="No contacts found"
					description={
						searchQuery || sourceFilter
							? "Try adjusting your search or filters"
							: "No contacts available yet"
					}
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filtered.map((contact) => {
						const badges = getSourceBadges(contact);
						return (
							<Card
								key={contact.id}
								className={cn(
									"bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70",
									"hover:border-violet-600/30 transition-all cursor-pointer",
								)}
								onClick={() => openDetail(contact)}
							>
								<CardContent className="p-4">
									<div className="space-y-3">
										<div className="flex items-start justify-between">
											<div className="min-w-0 flex-1">
												<h3 className="font-semibold text-white truncate">
													{contact.name}
												</h3>
												{contact.role && (
													<p className="text-sm text-zinc-400 truncate">
														{contact.role}
													</p>
												)}
											</div>
											<div className="flex items-center gap-1 shrink-0 ml-2">
												{badges.map((badge) => (
													<Badge
														key={badge.label}
														variant="outline"
														className={cn(
															badge.color,
															"text-[10px] px-1.5 py-0",
														)}
													>
														{badge.label === "Staff" ? (
															<Users className="h-2.5 w-2.5 mr-0.5 inline" />
														) : badge.label === "Venue" ? (
															<Building2 className="h-2.5 w-2.5 mr-0.5 inline" />
														) : (
															<Building className="h-2.5 w-2.5 mr-0.5 inline" />
														)}
														{badge.label}
													</Badge>
												))}
											</div>
										</div>

										{contact.company && (
											<div className="flex items-center gap-1.5 text-sm text-zinc-400">
												<Building className="h-3.5 w-3.5 text-zinc-500" />
												<span>{contact.company}</span>
											</div>
										)}

										{contact.venues.length > 0 && (
											<div className="flex flex-wrap gap-1.5">
												{contact.venues.slice(0, 3).map((v) => (
													<Badge
														key={v.id}
														variant="secondary"
														className="bg-zinc-800 text-zinc-300 border border-zinc-700/50 text-[11px]"
													>
														<Building2 className="h-2.5 w-2.5 mr-1 inline text-zinc-500" />
														{v.name}
													</Badge>
												))}
												{contact.venues.length > 3 && (
													<span className="text-[11px] text-zinc-500 self-center">
														+{contact.venues.length - 3} more
													</span>
												)}
											</div>
										)}

										{contact.staff_roles.length > 0 && (
											<div className="flex flex-wrap gap-1.5">
												{contact.staff_roles.map((role, i) => (
													<Badge
														key={i}
														variant="outline"
														className="border-cyan-700/50 text-cyan-400 text-[11px]"
													>
														{role}
													</Badge>
												))}
											</div>
										)}

										<div className="space-y-1.5">
											{contact.phone && (
												<a
													href={`tel:${contact.phone}`}
													onClick={(e) => e.stopPropagation()}
													className="flex items-center gap-2 text-sm text-zinc-300 hover:text-violet-400 transition-colors group"
												>
													<Phone className="h-3.5 w-3.5 text-zinc-500 group-hover:text-violet-400" />
													<span>{contact.phone}</span>
												</a>
											)}
											{contact.email && (
												<a
													href={`mailto:${contact.email}`}
													onClick={(e) => e.stopPropagation()}
													className="flex items-center gap-2 text-sm text-zinc-300 hover:text-violet-400 transition-colors group"
												>
													<Mail className="h-3.5 w-3.5 text-zinc-500 group-hover:text-violet-400" />
													<span className="truncate">{contact.email}</span>
												</a>
											)}
										</div>

										<div className="flex items-center justify-between pt-1">
											{contact.phone && (
												<Button
													variant="outline"
													size="sm"
													className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-violet-600/20 hover:border-violet-600/50"
													onClick={(e) => {
														e.stopPropagation();
														window.open(`tel:${contact.phone}`, "_self");
													}}
												>
													<Phone className="h-3.5 w-3.5 mr-1.5" />
													Call
												</Button>
											)}
											<span className="text-xs text-zinc-600 flex items-center gap-1">
												Details
												<ChevronRight className="h-3 w-3" />
											</span>
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Contact Detail Dialog */}
			<Dialog open={detailOpen} onOpenChange={setDetailOpen}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg max-w-lg">
					<DialogHeader>
						<DialogTitle className="text-white text-xl">
							{selectedContact?.name}
						</DialogTitle>
					</DialogHeader>

					{selectedContact && (
						<div className="space-y-5">
							{/* Source badges */}
							<div className="flex items-center gap-2">
								{getSourceBadges(selectedContact).map((badge) => (
									<Badge
										key={badge.label}
										variant="outline"
										className={cn(badge.color, "text-xs")}
									>
										{badge.label}
									</Badge>
								))}
							</div>

							{/* Company for standalone contacts */}
							{selectedContact.company && (
								<div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
									<div className="h-9 w-9 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0">
										<Building className="h-4 w-4 text-emerald-400" />
									</div>
									<div>
										<p className="text-sm text-zinc-400">Company</p>
										<p className="text-white font-medium">
											{selectedContact.company}
										</p>
									</div>
								</div>
							)}

							{/* Phone & Email */}
							<div className="space-y-2">
								{selectedContact.phone && (
									<a
										href={`tel:${selectedContact.phone}`}
										className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors group"
									>
										<div className="h-9 w-9 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0">
											<Phone className="h-4 w-4 text-violet-400" />
										</div>
										<div>
											<p className="text-sm text-zinc-400">Phone</p>
											<p className="text-white font-medium group-hover:text-violet-400 transition-colors">
												{selectedContact.phone}
											</p>
										</div>
									</a>
								)}
								{selectedContact.email && (
									<a
										href={`mailto:${selectedContact.email}`}
										className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors group"
									>
										<div className="h-9 w-9 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0">
											<Mail className="h-4 w-4 text-violet-400" />
										</div>
										<div>
											<p className="text-sm text-zinc-400">Email</p>
											<p className="text-white font-medium group-hover:text-violet-400 transition-colors truncate">
												{selectedContact.email}
											</p>
										</div>
									</a>
								)}
							</div>

							{/* Staff Roles */}
							{selectedContact.staff_roles.length > 0 && (
								<div>
									<h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
										<Users className="h-4 w-4" />
										Staff Roles
									</h4>
									<div className="flex flex-wrap gap-2">
										{selectedContact.staff_roles.map((role, i) => (
											<Badge
												key={i}
												variant="outline"
												className="border-cyan-700/50 text-cyan-400 bg-cyan-950/20"
											>
												{role}
											</Badge>
										))}
									</div>
								</div>
							)}

							{/* Venues */}
							{selectedContact.venues.length > 0 && (
								<div>
									<h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
										<Building2 className="h-4 w-4" />
										Venues{" "}
										<span className="text-zinc-600">
											({selectedContact.venues.length})
										</span>
									</h4>
									<div className="space-y-1.5">
										{selectedContact.venues.map((v) => (
											<a
												key={v.id}
												href="/venues"
												className="flex items-center gap-3 p-2.5 bg-zinc-800/30 rounded-lg hover:bg-zinc-800 transition-colors"
											>
												<Building2 className="h-4 w-4 text-amber-400 shrink-0" />
												<span className="text-white text-sm">{v.name}</span>
											</a>
										))}
									</div>
								</div>
							)}

							{/* Call button */}
							{selectedContact.phone && (
								<Button
									className="w-full bg-violet-600 hover:bg-violet-700"
									onClick={() =>
										window.open(`tel:${selectedContact.phone}`, "_self")
									}
								>
									<Phone className="h-4 w-4 mr-2" />
									Call {selectedContact.name}
								</Button>
							)}

							{/* Edit / Delete for standalone contacts */}
							{selectedContact.is_standalone && (
								<div className="flex gap-3 pt-2 border-t border-zinc-800/70">
									<Button
										variant="outline"
										className="flex-1 border-zinc-700 text-zinc-300 hover:text-white hover:bg-violet-600/20 hover:border-violet-600/50"
										onClick={handleEditStart}
									>
										<Pencil className="h-4 w-4 mr-2" />
										Edit
									</Button>
									<Button
										variant="outline"
										className="flex-1 border-red-900/50 text-red-400 hover:text-red-300 hover:bg-red-950/30 hover:border-red-700/50"
										onClick={handleDeleteStart}
									>
										<Trash2 className="h-4 w-4 mr-2" />
										Delete
									</Button>
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Create Contact Dialog */}
			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg max-w-md">
					<DialogHeader>
						<DialogTitle className="text-white text-xl">
							Add New Contact
						</DialogTitle>
					</DialogHeader>
					<ContactForm
						mode="create"
						onSuccess={handleCreateSuccess}
						onCancel={() => setShowCreateDialog(false)}
					/>
				</DialogContent>
			</Dialog>

			{/* Edit Contact Dialog */}
			<Dialog
				open={editingContact !== null}
				onOpenChange={(open) => !open && setEditingContact(null)}
			>
				<DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg max-w-md">
					<DialogHeader>
						<DialogTitle className="text-white text-xl">
							Edit Contact
						</DialogTitle>
					</DialogHeader>
					{editingContact && (
						<ContactForm
							mode="edit"
							initialData={{
								id: editingContact.id,
								name: editingContact.name,
								phone: editingContact.phone || "",
								email: editingContact.email || "",
								role: editingContact.role || "",
								company: editingContact.company || "",
								notes: "",
							}}
							onSuccess={handleEditSuccess}
							onCancel={() => setEditingContact(null)}
						/>
					)}
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={deletingContact !== null}
				onOpenChange={(open) => !open && setDeletingContact(null)}
			>
				<AlertDialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-white">
							Delete Contact
						</AlertDialogTitle>
						<AlertDialogDescription className="text-zinc-400">
							Are you sure you want to delete{" "}
							<strong className="text-white">{deletingContact?.name}</strong>?
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							disabled={isDeleting}
							className="bg-red-600 hover:bg-red-700 text-white"
						>
							{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
