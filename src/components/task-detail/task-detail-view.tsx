"use client";

import { useCallback, useMemo, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
	Dialog,
	DialogContent,
	DialogClose,
	DialogTitle,
} from "@/components/ui/dialog";
import { TaskHistoryTimeline } from "@/components/task-history-timeline";
import { cn, statusBadgeClass } from "@/lib/utils";
import { formatDateShort } from "@/lib/dates";
import {
	Calendar,
	User,
	CornerDownRight,
	History,
	MessageSquare,
	Paperclip,
	File,
	Video,
	Pencil,
	X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { TaskDetailItems } from "./task-detail-items";
import { TaskDetailActions } from "./task-detail-actions";
import { TaskDetailComments } from "./task-detail-comments";
import { TaskDetailSubtasks } from "./task-detail-subtasks";
import { TaskDetailMeta } from "./task-detail-meta";
import type { Task, Comment, Profile, Event } from "./types";

// Simple markdown image and video renderer
// Uses regex to detect ![alt](url) and raw video URLs
function DescriptionRenderer({
	content,
	onImageClick,
}: {
	content: string;
	onImageClick: (url: string) => void;
}) {
	const parts = useMemo(() => {
		// Split content into segments of text, images, and video
		const segments: { type: "text" | "image" | "video"; value: string }[] = [];

		// Regex for markdown image syntax: ![alt](url)
		const imageRegex = /!\[([^\]]*)\]\(([^)]+\)?)\)/g;
		// Process line by line
		const lines = content.split("\n");
		for (const line of lines) {
			const imgMatch = line.match(imageRegex);
			if (imgMatch) {
				// Extract individual image matches from this line
				let lineRemaining = line;
				let img;
				const localRegex = /!\[([^\]]*)\]\(([^)]+\)?)\)/g;
				while ((img = localRegex.exec(lineRemaining)) !== null) {
					if (img.index > 0) {
						segments.push({
							type: "text",
							value: lineRemaining.slice(0, img.index),
						});
					}
					segments.push({ type: "image", value: img[2] });
					lineRemaining = lineRemaining.slice(img.index + img[0].length);
				}
				if (lineRemaining) {
					segments.push({ type: "text", value: lineRemaining });
				}
			} else {
				// Check for standalone video URL lines
				const trimmed = line.trim();
				const vidMatch = trimmed.match(
					/^(https?:\/\/[^\s]+\.(mp4|webm|mov))$/i,
				);
				if (vidMatch) {
					if (
						segments.length > 0 &&
						segments[segments.length - 1].type === "text"
					) {
						// Add newline separator
						segments.push({ type: "text", value: "\n" });
					}
					segments.push({ type: "video", value: vidMatch[1] });
				} else {
					segments.push({ type: "text", value: line + "\n" });
				}
			}
		}

		return segments;
	}, [content]);

	return (
		<>
			{parts.map((part, i) => {
				if (part.type === "image") {
					return (
						<button
							key={i}
							type="button"
							onClick={() => onImageClick(part.value)}
							className="block max-w-full p-0 border-none bg-transparent cursor-zoom-in"
						>
							<img
								src={part.value}
								alt=""
								className="max-w-full max-h-[300px] w-auto h-auto rounded-lg my-2 object-contain"
								loading="lazy"
							/>
						</button>
					);
				}
				if (part.type === "video") {
					return (
						<video
							key={i}
							src={part.value}
							controls
							className="max-w-full max-h-[300px] w-auto rounded-lg my-2"
						>
							<track kind="captions" label="No captions" />
						</video>
					);
				}
				return (
					<span key={i} className="whitespace-pre-wrap">
						{part.value}
					</span>
				);
			})}
		</>
	);
}

const PRIORITIES = [
	{ value: "low" as const, labelEn: "Low", labelDe: "Niedrig" },
	{ value: "medium" as const, labelEn: "Medium", labelDe: "Mittel" },
	{ value: "high" as const, labelEn: "High", labelDe: "Hoch" },
	{ value: "urgent" as const, labelEn: "Urgent", labelDe: "Dringend" },
];

const STATUSES = [
	{ value: "todo" as const, labelEn: "To Do", labelDe: "To Do" },
	{
		value: "in_progress" as const,
		labelEn: "In Progress",
		labelDe: "In Bearbeitung",
	},
	{
		value: "pending_approval" as const,
		labelEn: "Pending Approval",
		labelDe: "Freigabe ausstehend",
	},
	{ value: "done" as const, labelEn: "Done", labelDe: "Erledigt" },
	{ value: "cancelled" as const, labelEn: "Cancelled", labelDe: "Abgebrochen" },
];

interface TaskDetailViewProps {
	task: Task;
	fullTask: Task | null;
	currentUserId: string | null;

	// Comments
	comments: Comment[];
	loadingComments: boolean;
	onCommentsChange: (comments: Comment[]) => void;

	// Subtasks
	subtasks: Task[];
	onNavigateToTask: (taskId: string) => void;
	onCreateSubtask: (title: string) => Promise<void>;

	// Actions
	onEditRequest: () => void;
	onApprove: () => Promise<void>;
	onReject: (reason: string) => Promise<void>;
	onToggleBlock: (reason: string) => Promise<void>;
	onDelete: () => Promise<void>;

	// Items
	onAddItems?: (itemIds: string[]) => Promise<void>;

	// Loading states
	deleting?: boolean;
	approving?: boolean;
	rejecting?: boolean;
	blocking?: boolean;

	// Meta
	onFieldSave: (field: string, value: string) => Promise<void>;
	profiles: Profile[];
	parentTaskTitle: string | null;
}

export function TaskDetailView({
	task,
	fullTask,
	currentUserId,
	comments,
	loadingComments,
	onCommentsChange,
	subtasks,
	onNavigateToTask,
	onCreateSubtask,
	onEditRequest,
	onApprove,
	onReject,
	onToggleBlock,
	onDelete,
	onAddItems,
	deleting,
	approving,
	rejecting,
	blocking,
	onFieldSave,
	profiles,
	parentTaskTitle,
}: TaskDetailViewProps) {
	const { t, locale } = useI18n();
	const [editingDescription, setEditingDescription] = useState(false);
	const [editDescriptionValue, setEditDescriptionValue] = useState("");
	const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
	const [localAttachments, setLocalAttachments] = useState<
		Array<{ id: string; name: string; type: string; url: string }>
	>([]);
	const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<Set<string>>(
		new Set(),
	);

	const handleDeleteAttachment = useCallback(
		async (attachmentId: string, e: React.MouseEvent) => {
			e.stopPropagation();
			try {
				const response = await fetch(
					`/api/tasks/${task.id}/attachments?attachment_id=${attachmentId}`,
					{ method: "DELETE" },
				);
				if (!response.ok) {
					console.error("Failed to delete attachment");
					return;
				}
				// Remove from local attachments if it was just pasted
				setLocalAttachments((prev) =>
					prev.filter((a) => a.id !== attachmentId),
				);
				// Track deleted server-side attachment IDs for display filtering
				setDeletedAttachmentIds((prev) => {
					const next = new Set(prev);
					next.add(attachmentId);
					return next;
				});
			} catch (err) {
				console.error("Failed to delete attachment:", err);
			}
		},
		[task.id],
	);
	const editRef = useRef<HTMLDivElement>(null);
	const editHtmlRef = useRef<string>("");

	// Convert markdown to HTML for contentEditable rendering
	const markdownToHtml = useCallback((md: string) => {
		return md
			.replace(
				/!\[([^\]]*)\]\(([^)]+)\)/g,
				'<img src="$2" alt="$1" class="inline-block max-h-32 rounded my-1" contenteditable="false" />',
			)
			.replace(/\n/g, "<br />");
	}, []);

	// Convert HTML back to markdown for saving
	const htmlToMarkdown = useCallback((html: string) => {
		const div = document.createElement("div");
		div.innerHTML = html;
		// Replace <img> tags with markdown
		const imgs = div.querySelectorAll("img");
		for (const img of imgs) {
			const alt = img.getAttribute("alt") || "";
			const src = img.getAttribute("src") || "";
			img.replaceWith(document.createTextNode(`![${alt}](${src})`));
		}
		// Replace HTML entities and tags with plain text
		return div.innerHTML
			.replace(/&nbsp;/g, " ")
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<div>/gi, "\n")
			.replace(/<\/div>/gi, "")
			.trim();
	}, []);

	// Start editing: populate contentEditable with rendered HTML
	const startEditing = useCallback(() => {
		const md = task.description || "";
		setEditDescriptionValue(md);
		setEditingDescription(true);
		// After render, populate the contentEditable div
		requestAnimationFrame(() => {
			if (editRef.current) {
				const html = markdownToHtml(md);
				editRef.current.innerHTML = html;
				editHtmlRef.current = html;
			}
		});
	}, [task.description, markdownToHtml]);

	// Save: serialize contentEditable back to markdown — calls API directly to bypass prop chain
	const saveDescription = useCallback(async () => {
		let md = "";
		if (editRef.current) {
			const currentHtml = editRef.current.innerHTML;
			md = htmlToMarkdown(currentHtml);
			editHtmlRef.current = currentHtml;
		} else if (editHtmlRef.current) {
			md = htmlToMarkdown(editHtmlRef.current);
		} else {
			md = editDescriptionValue;
		}
		try {
			const response = await fetch(`/api/tasks/${task.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ description: md || null }),
			});
			if (!response.ok) {
				console.error("Failed to save description");
				return;
			}
			const updated = await response.json();
			// Notify parent via onFieldSave to keep inline edit in sync
			onFieldSave("description", md).catch(() => {});
			setLocalDescription(updated.description ?? md);
		} finally {
			setEditingDescription(false);
		}
	}, [htmlToMarkdown, onFieldSave, editDescriptionValue, task.id]);
	const [localDescription, setLocalDescription] = useState<string | null>(null);

	const handleDescriptionPaste = useCallback(
		async (e: React.ClipboardEvent<HTMLDivElement>) => {
			const items = e.clipboardData?.items;
			if (!items) return;

			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
					e.preventDefault();
					const file = item.getAsFile();
					if (!file) continue;

					try {
						const formData = new FormData();
						formData.append("file", file);
						const response = await fetch(`/api/tasks/${task.id}/attachments`, {
							method: "POST",
							body: formData,
						});
						if (!response.ok) continue;
						const attachment = await response.json();

						// Append to local attachments so gallery updates immediately
						setLocalAttachments((prev) => [
							...prev,
							{
								id: attachment.id,
								name: attachment.name,
								type: file.type.startsWith("image/") ? "image" : "video",
								url: attachment.url,
							},
						]);

						// Insert <img> tag at cursor position in contentEditable div
						const sel = window.getSelection();
						if (sel && sel.rangeCount > 0) {
							const range = sel.getRangeAt(0);
							const img = document.createElement("img");
							img.src = attachment.url;
							img.alt = attachment.name;
							img.className = "inline-block max-h-32 rounded my-1";
							img.contentEditable = "false";
							range.deleteContents();
							range.insertNode(img);
							// Move cursor after the image
							range.setStartAfter(img);
							range.collapse(true);
							sel.removeAllRanges();
							sel.addRange(range);
						}
					} catch {
						// Ignore paste errors silently
					}
					return;
				}
			}
		},
		[task.id],
	);

	return (
		<div className="space-y-6">
			{/* Image Lightbox */}
			<Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
				<DialogContent className="max-w-4xl bg-zinc-950/95 border-zinc-800 p-2">
					<DialogTitle className="sr-only">Image Preview</DialogTitle>
					<DialogClose className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80">
						<X className="h-4 w-4" />
					</DialogClose>
					{lightboxUrl && (
						<img
							src={lightboxUrl}
							alt=""
							className="w-full h-auto max-h-[85vh] object-contain rounded"
						/>
					)}
				</DialogContent>
			</Dialog>

			{/* Parent breadcrumb */}
			{(fullTask?.parent_task ||
				task.parent_task ||
				(task.parent_task_id && parentTaskTitle)) && (
				<button
					onClick={() => onNavigateToTask(task.parent_task_id!)}
					className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-violet-400 transition-colors mb-2 group"
				>
					<CornerDownRight className="h-3.5 w-3.5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
					<span className="truncate">
						{fullTask?.parent_task?.title ||
							task.parent_task?.title ||
							parentTaskTitle}
					</span>
					{(fullTask?.parent_task?.status || task.parent_task?.status) && (
						<Badge
							variant="outline"
							className="bg-zinc-800 text-zinc-500 border-zinc-700 text-[10px]"
						>
							{fullTask?.parent_task?.status || task.parent_task?.status}
						</Badge>
					)}
				</button>
			)}

			{/* Header */}
			<div>
				<h3 className="text-xl font-semibold text-white">{task.title}</h3>
				<div className="flex items-center gap-2 flex-wrap mt-2">
					<Badge variant="outline" className={statusBadgeClass(task.status)}>
						{STATUSES.find((s) => s.value === task.status)?.labelEn}
					</Badge>
					<Badge variant="outline" className={statusBadgeClass(task.priority)}>
						{PRIORITIES.find((p) => p.value === task.priority)?.labelEn}
					</Badge>
					{task.event && (
						<Badge
							variant="outline"
							className="bg-violet-600/20 text-violet-400 border-violet-600/50"
						>
							{task.event.name}
						</Badge>
					)}
					{task.blocked && (
						<Badge variant="outline" className={statusBadgeClass("blocked")}>
							{t("action.blocked")}
						</Badge>
					)}
					{task.needs_approval && task.status !== "pending_approval" && (
						<Badge
							variant="outline"
							className={statusBadgeClass("pending_approval")}
						>
							{t("action.needs_approval")}
						</Badge>
					)}
				</div>
			</div>

			{/* Approval & blocked banners */}
			<TaskDetailActions
				task={task}
				currentUserId={currentUserId}
				onApprove={onApprove}
				onReject={onReject}
				onToggleBlock={onToggleBlock}
				onEditRequest={onEditRequest}
				onDelete={onDelete}
				deleting={deleting}
				approving={approving}
				rejecting={rejecting}
				blocking={blocking}
			/>

			{/* Description — with inline edit toggle */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<h4 className="text-sm font-medium text-zinc-400">
						{t("detail.description")}
					</h4>
					{!editingDescription && (
						<button
							type="button"
							onClick={startEditing}
							className="text-zinc-500 hover:text-zinc-300 transition-colors"
							title="Edit description"
						>
							<Pencil className="h-3.5 w-3.5" />
						</button>
					)}
				</div>
				{editingDescription ? (
					<div className="space-y-2">
						<div
							ref={editRef}
							contentEditable
							suppressContentEditableWarning
							onPaste={handleDescriptionPaste}
							onInput={(e) => {
								const html = e.currentTarget.innerHTML;
								editHtmlRef.current = html;
								setEditDescriptionValue(htmlToMarkdown(html));
							}}
							className="w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-violet-500 min-h-[100px] resize-y"
						/>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={saveDescription}
								className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded transition-colors"
							>
								Save
							</button>
							<button
								type="button"
								onClick={() => setEditingDescription(false)}
								className="text-xs text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
							>
								Cancel
							</button>
						</div>
					</div>
				) : (localDescription ?? fullTask?.description ?? task.description) ? (
					<div className="text-zinc-300 whitespace-pre-wrap text-sm space-y-2">
						<DescriptionRenderer
							content={
								localDescription ??
								fullTask?.description ??
								task.description ??
								""
							}
							onImageClick={setLightboxUrl}
						/>
					</div>
				) : (
					<p className="text-zinc-500 text-sm italic">
						{t("detail.no_description")}
					</p>
				)}
			</div>

			{/* Attachment Gallery */}
			{(() => {
				const serverAttachments =
					fullTask?.attachments || task.attachments || [];
				const allAttachments = [
					...serverAttachments.filter(
						(a: { id: string }) => !deletedAttachmentIds.has(a.id),
					),
					...localAttachments,
				];
				if (allAttachments.length === 0) return null;
				return (
					<div>
						<h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
							<Paperclip className="h-3.5 w-3.5" />
							Attachments ({allAttachments.length})
						</h4>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{allAttachments.map((att) => (
								<div
									key={att.id}
									onClick={() => {
										if (att.type === "image") setLightboxUrl(att.url);
										else window.open(att.url, "_blank");
									}}
									className="group relative rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors bg-zinc-950 cursor-zoom-in"
								>
									{/* Delete button overlay */}
									<div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
										<button
											type="button"
											onClick={(e) => handleDeleteAttachment(att.id, e)}
											className="rounded-full bg-red-600/80 hover:bg-red-600 p-1 text-white"
											title="Delete attachment"
										>
											<X className="h-3 w-3" />
										</button>
									</div>
									{att.type === "image" ? (
										<img
											src={att.url}
											alt={att.name}
											className="w-full h-24 object-cover"
										/>
									) : att.type === "video" ? (
										<div className="w-full h-24 flex items-center justify-center bg-zinc-900">
											<Video className="h-8 w-8 text-zinc-500" />
										</div>
									) : (
										<div className="w-full h-24 flex items-center justify-center bg-zinc-900">
											<File className="h-8 w-8 text-zinc-500" />
										</div>
									)}
									<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
										<p className="text-xs text-white truncate">{att.name}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				);
			})()}

			{/* Linked Items */}
			<TaskDetailItems
				taskItems={task.task_items || []}
				onAddItems={onAddItems}
			/>

			{/* Meta info (assignee, events, dates) */}
			<TaskDetailMeta
				task={fullTask || task}
				profiles={profiles}
				onFieldSave={onFieldSave}
			/>

			{/* Subtasks */}
			<TaskDetailSubtasks
				subtasks={subtasks}
				onNavigate={onNavigateToTask}
				onCreateSubtask={onCreateSubtask}
			/>

			{/* Comments */}
			<Separator className="bg-zinc-800" />
			<div>
				<h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
					<MessageSquare className="h-4 w-4" />
					{t("detail.comments")} ({comments.length})
				</h4>
				<TaskDetailComments
					taskId={task.id}
					comments={comments}
					loading={loadingComments}
					currentUserId={currentUserId}
					onCommentsChange={onCommentsChange}
				/>
			</div>

			{/* History */}
			<Separator className="bg-zinc-800" />
			<div>
				<h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
					<History className="h-4 w-4" />
					{t("history.title")}
				</h4>
				<TaskHistoryTimeline taskId={task.id} />
			</div>
		</div>
	);
}
