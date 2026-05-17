"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getInitials, formatDate, type Comment } from "./types";

interface TaskDetailCommentsProps {
	taskId: string;
	comments: Comment[];
	loading: boolean;
	currentUserId: string | null;
	onCommentsChange: (comments: Comment[]) => void;
}

export function TaskDetailComments({
	taskId,
	comments,
	loading,
	currentUserId,
	onCommentsChange,
}: TaskDetailCommentsProps) {
	const { toast } = useToast();
	const [newComment, setNewComment] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const handleAddComment = async () => {
		if (!newComment.trim()) return;
		setSubmitting(true);
		try {
			const response = await fetch(`/api/tasks/${taskId}/comments`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: newComment, author_id: currentUserId }),
			});
			if (!response.ok) throw new Error("Failed to add comment");
			const comment = await response.json();
			onCommentsChange([...comments, comment]);
			setNewComment("");
			toast({
				title: "Kommentar hinzugefügt",
				description: "Der Kommentar wurde erfolgreich hinzugefügt.",
			});
		} catch (error) {
			console.error("Error adding comment:", error);
			toast({
				variant: "destructive",
				title: "Fehler",
				description:
					error instanceof Error
						? error.message
						: "Fehler beim Hinzufügen des Kommentars.",
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div>
			<div className="space-y-4 mb-4">
				{loading ? (
					<div className="flex items-center justify-center py-4">
						<Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
					</div>
				) : comments.length === 0 ? (
					<p className="text-sm text-zinc-500 text-center py-4">
						No comments yet.
					</p>
				) : (
					comments.map((comment) => (
						<div key={comment.id} className="flex gap-3">
							<Avatar className="h-8 w-8 shrink-0">
								<AvatarImage src={comment.author?.avatar_url || undefined} />
								<AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
									{getInitials(comment.author?.full_name || null)}
								</AvatarFallback>
							</Avatar>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 mb-1">
									<span className="text-sm font-medium text-zinc-300">
										{comment.author?.full_name || "Unknown"}
									</span>
									<span className="text-xs text-zinc-500">
										{formatDate(comment.created_at)}
									</span>
								</div>
								<p className="text-sm text-zinc-400 whitespace-pre-wrap">
									{comment.content}
								</p>
							</div>
						</div>
					))
				)}
			</div>

			<div className="flex gap-2">
				<Textarea
					value={newComment}
					onChange={(e) => setNewComment(e.target.value)}
					placeholder="Add a comment..."
					className="bg-zinc-950 border-zinc-800 min-h-[80px]"
				/>
			</div>
			<div className="flex justify-end mt-2">
				<Button
					onClick={handleAddComment}
					disabled={!newComment.trim() || submitting}
					size="sm"
					className="bg-violet-600 hover:bg-violet-700"
				>
					{submitting ? (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					) : (
						<Send className="h-4 w-4 mr-2" />
					)}
					Send
				</Button>
			</div>
		</div>
	);
}
