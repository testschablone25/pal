// Task Attachments API
// File upload/download for tasks using Supabase Storage

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthenticatedClient } from "@/lib/api-auth";


interface Attachment {
	id: string;
	name: string;
	type: "image" | "video" | "file";
	url: string;
	size: number;
	uploaded_at: string;
	mime_type?: string;
}

// POST /api/tasks/[id]/attachments - Upload a file attachment
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "TASKS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id: taskId } = await params;

		// Verify task exists
		const { data: task, error: taskError } = await supabase
			.from("tasks")
			.select("id")
			.eq("id", taskId)
			.single();

		if (taskError || !task) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		// Parse multipart form data
		const formData = await request.formData();
		const file = formData.get("file") as File | null;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		// Validate file size (max 10MB)
		const MAX_SIZE = 10 * 1024 * 1024; // 10MB
		if (file.size > MAX_SIZE) {
			return NextResponse.json(
				{ error: "File size exceeds 10MB limit" },
				{ status: 400 },
			);
		}

		// Detect type
		let attachmentType: "image" | "video" | "file" = "file";
		if (file.type.startsWith("image/")) {
			attachmentType = "image";
		} else if (file.type.startsWith("video/")) {
			attachmentType = "video";
		}

		// Generate unique path: {taskId}/{timestamp}_{filename}
		const timestamp = Date.now();
		const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
		const filePath = `${taskId}/${timestamp}_${safeFilename}`;

		// Upload to Supabase Storage
		const { error: uploadError } = await supabase.storage
			.from("task-attachments")
			.upload(filePath, file, {
				contentType: file.type,
				upsert: false,
			});

		if (uploadError) {
			console.error("Storage upload failed:", uploadError);
			return NextResponse.json(
				{ error: "Failed to upload file" },
				{ status: 500 },
			);
		}

		// Get public URL
		const { data: publicUrlData } = supabase.storage
			.from("task-attachments")
			.getPublicUrl(filePath);

		const publicUrl = publicUrlData.publicUrl;

		// Build attachment object
		const attachment: Attachment = {
			id: crypto.randomUUID(),
			name: file.name,
			type: attachmentType,
			url: publicUrl,
			size: file.size,
			uploaded_at: new Date().toISOString(),
			mime_type: file.type,
		};

		// Append to task's attachments JSONB array
		const { data: currentTask } = await supabase
			.from("tasks")
			.select("attachments")
			.eq("id", taskId)
			.single();

		const currentAttachments: Attachment[] = Array.isArray(
			currentTask?.attachments,
		)
			? currentTask.attachments
			: [];

		const updatedAttachments = [...currentAttachments, attachment];

		const { error: updateError } = await supabase
			.from("tasks")
			.update({ attachments: updatedAttachments })
			.eq("id", taskId);

		if (updateError) {
			console.error("Failed to update task attachments:", updateError);
			// Clean up uploaded file if DB update fails
			await supabase.storage.from("task-attachments").remove([filePath]);
			return NextResponse.json(
				{ error: "Failed to save attachment metadata" },
				{ status: 500 },
			);
		}

		return NextResponse.json(attachment, { status: 201 });
	} catch (error) {
		console.error("Error uploading attachment:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// DELETE /api/tasks/[id]/attachments?attachment_id=xxx - Remove an attachment
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const auth = await requireAuth(request, "TASKS_WRITE");
		if (!auth.authorized) return auth.response;
		const supabase = getAuthenticatedClient(request);

		const { id: taskId } = await params;
		const attachmentId = request.nextUrl.searchParams.get("attachment_id");

		if (!attachmentId) {
			return NextResponse.json(
				{ error: "attachment_id query parameter is required" },
				{ status: 400 },
			);
		}

		// Fetch current task attachments
		const { data: task, error: taskError } = await supabase
			.from("tasks")
			.select("attachments")
			.eq("id", taskId)
			.single();

		if (taskError || !task) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		const currentAttachments: Attachment[] = Array.isArray(task.attachments)
			? task.attachments
			: [];

		const attachmentToRemove = currentAttachments.find(
			(a) => a.id === attachmentId,
		);

		if (!attachmentToRemove) {
			return NextResponse.json(
				{ error: "Attachment not found" },
				{ status: 404 },
			);
		}

		// Remove from storage
		const urlParts = attachmentToRemove.url.split("/");
		const storagePath = urlParts.slice(-2).join("/"); // {taskId}/{timestamp}_{filename}
		const { error: storageError } = await supabase.storage
			.from("task-attachments")
			.remove([storagePath]);

		if (storageError) {
			console.error("Storage delete failed:", storageError);
			// Continue with metadata removal even if storage delete fails
		}

		// Remove from task's attachments array
		const updatedAttachments = currentAttachments.filter(
			(a) => a.id !== attachmentId,
		);

		const { error: updateError } = await supabase
			.from("tasks")
			.update({ attachments: updatedAttachments })
			.eq("id", taskId);

		if (updateError) {
			console.error("Failed to update task attachments:", updateError);
			return NextResponse.json(
				{ error: "Failed to remove attachment metadata" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting attachment:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
