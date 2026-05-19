"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import {
	Plus,
	Pencil,
	Trash2,
	Check,
	X,
	Disc3,
	Building2,
	Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────

interface LabelItem {
	id: string;
	name: string;
}

interface AgencyItem {
	id: string;
	name: string;
}

type TabType = "labels" | "agencies";

// ── Inline Editable Row ──────────────────────────

interface EditableRowProps {
	item: LabelItem | AgencyItem;
	onSave: (id: string, name: string) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
	type: "label" | "agency";
}

function EditableRow({ item, onSave, onDelete, type }: EditableRowProps) {
	const [editing, setEditing] = useState(false);
	const [editName, setEditName] = useState(item.name);
	const [saving, setSaving] = useState(false);
	const [showDelete, setShowDelete] = useState(false);

	const handleSave = async () => {
		const trimmed = editName.trim();
		if (!trimmed || trimmed === item.name) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(item.id, trimmed);
			setEditing(false);
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		setEditName(item.name);
		setEditing(false);
	};

	return (
		<>
			<div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/40 border border-zinc-700/50 rounded-md group hover:border-zinc-600/50 transition-colors">
				{type === "label" ? (
					<Disc3 className="h-4 w-4 text-amber-400/70 shrink-0" />
				) : (
					<Building2 className="h-4 w-4 text-blue-400/70 shrink-0" />
				)}

				{editing ? (
					<Input
						value={editName}
						onChange={(e) => setEditName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSave();
							if (e.key === "Escape") handleCancel();
						}}
						className="h-7 text-sm bg-zinc-900 border-zinc-700 flex-1 min-w-0"
						autoFocus
					/>
				) : (
					<span className="text-sm text-zinc-200 flex-1 min-w-0 truncate">
						{item.name}
					</span>
				)}

				<div className="flex items-center gap-1 shrink-0">
					{editing ? (
						<>
							<button
								onClick={handleSave}
								disabled={saving}
								className="p-1 text-green-400 hover:text-green-300 hover:bg-green-950/30 rounded transition-colors"
							>
								{saving ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : (
									<Check className="h-3.5 w-3.5" />
								)}
							</button>
							<button
								onClick={handleCancel}
								className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</>
					) : (
						<button
							onClick={() => {
								setEditName(item.name);
								setEditing(true);
							}}
							className="p-1 text-zinc-500 hover:text-violet-400 hover:bg-violet-950/30 rounded opacity-0 group-hover:opacity-100 transition-all"
						>
							<Pencil className="h-3.5 w-3.5" />
						</button>
					)}

					<button
						onClick={() => setShowDelete(true)}
						className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 rounded opacity-0 group-hover:opacity-100 transition-all"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>

			<AlertDialog open={showDelete} onOpenChange={setShowDelete}>
				<AlertDialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg max-w-sm">
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {type === "label" ? "Label" : "Agency"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete{" "}
							<strong className="text-zinc-200">{item.name}</strong>? This will
							remove it from all associated artists.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								await onDelete(item.id);
								setShowDelete(false);
							}}
							className="bg-red-600 hover:bg-red-700 text-white"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

// ── Main Manager Component ───────────────────────

interface LabelAgencyManagerProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: React.ReactNode;
}

export function LabelAgencyManager({
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	trigger,
}: LabelAgencyManagerProps) {
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState<TabType>("labels");

	const [labels, setLabels] = useState<LabelItem[]>([]);
	const [agencies, setAgencies] = useState<AgencyItem[]>([]);
	const [loadingLabels, setLoadingLabels] = useState(false);
	const [loadingAgencies, setLoadingAgencies] = useState(false);

	// New item creation
	const [newLabelName, setNewLabelName] = useState("");
	const [creatingLabel, setCreatingLabel] = useState(false);
	const [newAgencyName, setNewAgencyName] = useState("");
	const [creatingAgency, setCreatingAgency] = useState(false);

	const isOpen = controlledOpen ?? open;
	const setIsOpen = controlledOnOpenChange ?? setOpen;

	// ── Data fetching ──

	const fetchLabels = useCallback(async () => {
		setLoadingLabels(true);
		try {
			const res = await fetch("/api/labels");
			const data = await res.json();
			setLabels(data.labels || []);
		} catch {
			toast({
				variant: "destructive",
				title: "Error",
				description: "Failed to load labels",
			});
		} finally {
			setLoadingLabels(false);
		}
	}, [toast]);

	const fetchAgencies = useCallback(async () => {
		setLoadingAgencies(true);
		try {
			const res = await fetch("/api/agencies");
			const data = await res.json();
			setAgencies(data.agencies || []);
		} catch {
			toast({
				variant: "destructive",
				title: "Error",
				description: "Failed to load agencies",
			});
		} finally {
			setLoadingAgencies(false);
		}
	}, [toast]);

	useEffect(() => {
		if (isOpen) {
			fetchLabels();
			fetchAgencies();
		}
	}, [isOpen, fetchLabels, fetchAgencies]);

	// ── Label CRUD ──

	const createLabel = async () => {
		const trimmed = newLabelName.trim();
		if (!trimmed) return;
		setCreatingLabel(true);
		try {
			const res = await fetch("/api/labels", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: trimmed }),
			});
			if (!res.ok) throw new Error("Failed to create label");
			const created = await res.json();
			setLabels((prev) =>
				[...prev, { id: created.id, name: created.name }].sort((a, b) =>
					a.name.localeCompare(b.name),
				),
			);
			setNewLabelName("");
			toast({
				title: "Label created",
				description: `"${trimmed}" has been added.`,
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Error",
				description:
					err instanceof Error ? err.message : "Failed to create label",
			});
		} finally {
			setCreatingLabel(false);
		}
	};

	const updateLabel = async (id: string, name: string) => {
		const res = await fetch(`/api/labels/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name }),
		});
		if (!res.ok) throw new Error("Failed to update label");
		setLabels((prev) =>
			prev
				.map((l) => (l.id === id ? { ...l, name } : l))
				.sort((a, b) => a.name.localeCompare(b.name)),
		);
		toast({ title: "Label updated" });
	};

	const deleteLabel = async (id: string) => {
		const res = await fetch(`/api/labels/${id}`, { method: "DELETE" });
		if (!res.ok) throw new Error("Failed to delete label");
		setLabels((prev) => prev.filter((l) => l.id !== id));
		toast({ title: "Label deleted" });
	};

	// ── Agency CRUD ──

	const createAgency = async () => {
		const trimmed = newAgencyName.trim();
		if (!trimmed) return;
		setCreatingAgency(true);
		try {
			const res = await fetch("/api/agencies", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: trimmed }),
			});
			if (!res.ok) throw new Error("Failed to create agency");
			const created = await res.json();
			setAgencies((prev) =>
				[...prev, { id: created.id, name: created.name }].sort((a, b) =>
					a.name.localeCompare(b.name),
				),
			);
			setNewAgencyName("");
			toast({
				title: "Agency created",
				description: `"${trimmed}" has been added.`,
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Error",
				description:
					err instanceof Error ? err.message : "Failed to create agency",
			});
		} finally {
			setCreatingAgency(false);
		}
	};

	const updateAgency = async (id: string, name: string) => {
		const res = await fetch(`/api/agencies/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name }),
		});
		if (!res.ok) throw new Error("Failed to update agency");
		setAgencies((prev) =>
			prev
				.map((a) => (a.id === id ? { ...a, name } : a))
				.sort((a, b) => a.name.localeCompare(b.name)),
		);
		toast({ title: "Agency updated" });
	};

	const deleteAgency = async (id: string) => {
		const res = await fetch(`/api/agencies/${id}`, { method: "DELETE" });
		if (!res.ok) throw new Error("Failed to delete agency");
		setAgencies((prev) => prev.filter((a) => a.id !== id));
		toast({ title: "Agency deleted" });
	};

	// ── Render helpers ──

	const labelList = (
		<div className="space-y-3">
			{/* Create new label */}
			<div className="flex items-center gap-2">
				<Input
					value={newLabelName}
					onChange={(e) => setNewLabelName(e.target.value)}
					placeholder="New label name..."
					className="h-9 text-sm bg-zinc-800 border-zinc-700 flex-1"
					onKeyDown={(e) => {
						if (e.key === "Enter") createLabel();
					}}
				/>
				<Button
					size="sm"
					onClick={createLabel}
					disabled={!newLabelName.trim() || creatingLabel}
					className="bg-violet-600 hover:bg-violet-700 shrink-0"
				>
					{creatingLabel ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Plus className="h-3.5 w-3.5" />
					)}
				</Button>
			</div>

			{/* Labels list */}
			{loadingLabels ? (
				<div className="flex items-center justify-center py-8">
					<Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
				</div>
			) : labels.length === 0 ? (
				<p className="text-sm text-zinc-500 text-center py-4">
					No labels yet. Create your first label above.
				</p>
			) : (
				<div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
					{labels.map((label) => (
						<EditableRow
							key={label.id}
							item={label}
							onSave={updateLabel}
							onDelete={deleteLabel}
							type="label"
						/>
					))}
				</div>
			)}
		</div>
	);

	const agencyList = (
		<div className="space-y-3">
			{/* Create new agency */}
			<div className="flex items-center gap-2">
				<Input
					value={newAgencyName}
					onChange={(e) => setNewAgencyName(e.target.value)}
					placeholder="New agency name..."
					className="h-9 text-sm bg-zinc-800 border-zinc-700 flex-1"
					onKeyDown={(e) => {
						if (e.key === "Enter") createAgency();
					}}
				/>
				<Button
					size="sm"
					onClick={createAgency}
					disabled={!newAgencyName.trim() || creatingAgency}
					className="bg-violet-600 hover:bg-violet-700 shrink-0"
				>
					{creatingAgency ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Plus className="h-3.5 w-3.5" />
					)}
				</Button>
			</div>

			{/* Agencies list */}
			{loadingAgencies ? (
				<div className="flex items-center justify-center py-8">
					<Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
				</div>
			) : agencies.length === 0 ? (
				<p className="text-sm text-zinc-500 text-center py-4">
					No agencies yet. Create your first agency above.
				</p>
			) : (
				<div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
					{agencies.map((agency) => (
						<EditableRow
							key={agency.id}
							item={agency}
							onSave={updateAgency}
							onDelete={deleteAgency}
							type="agency"
						/>
					))}
				</div>
			)}
		</div>
	);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						Manage Labels &amp; Agencies
					</DialogTitle>
				</DialogHeader>

				{/* Tab switcher */}
				<div className="flex gap-1 p-1 bg-zinc-800/60 rounded-lg">
					<button
						onClick={() => setTab("labels")}
						className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
							tab === "labels"
								? "bg-zinc-700 text-white shadow-sm"
								: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
						}`}
					>
						<Disc3 className="h-4 w-4 text-amber-400/70" />
						Labels
						{labels.length > 0 && (
							<Badge
								variant="outline"
								className="border-zinc-600 text-zinc-400 text-[10px] py-0 h-4 ml-0.5"
							>
								{labels.length}
							</Badge>
						)}
					</button>
					<button
						onClick={() => setTab("agencies")}
						className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
							tab === "agencies"
								? "bg-zinc-700 text-white shadow-sm"
								: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
						}`}
					>
						<Building2 className="h-4 w-4 text-blue-400/70" />
						Agencies
						{agencies.length > 0 && (
							<Badge
								variant="outline"
								className="border-zinc-600 text-zinc-400 text-[10px] py-0 h-4 ml-0.5"
							>
								{agencies.length}
							</Badge>
						)}
					</button>
				</div>

				{/* Tab content */}
				<div className="min-h-[200px]">
					{tab === "labels" ? labelList : agencyList}
				</div>

				{/* Refresh hint */}
				<p className="text-[10px] text-zinc-600 text-center">
					Changes are saved immediately.
				</p>
			</DialogContent>
		</Dialog>
	);
}
