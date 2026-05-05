"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, ShieldX, AlertTriangle, Unlock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "./types";

interface TaskDetailActionsProps {
	task: Task;
	currentUserId: string | null;
	onApprove: () => Promise<void>;
	onReject: (reason: string) => Promise<void>;
	onToggleBlock: (reason: string) => Promise<void>;
	onEditRequest: () => void;
	onDelete: () => Promise<void>;
	editing?: boolean;
	deleting?: boolean;
	approving?: boolean;
	rejecting?: boolean;
	blocking?: boolean;
}

export function TaskDetailActions({
	task,
	currentUserId,
	onApprove,
	onReject,
	onToggleBlock,
	onEditRequest,
	onDelete,
	editing,
	deleting,
	approving,
	rejecting,
	blocking,
}: TaskDetailActionsProps) {
	const { t } = useI18n();
	const { toast } = useToast();
	const [rejectReason, setRejectReason] = useState("");
	const [showRejectInput, setShowRejectInput] = useState(false);
	const [blockReason, setBlockReason] = useState("");
	const [showBlockInput, setShowBlockInput] = useState(false);

	const handleRejectSubmit = async () => {
		if (!rejectReason.trim()) return;
		await onReject(rejectReason.trim());
		setShowRejectInput(false);
		setRejectReason("");
	};

	const handleBlockSubmit = async () => {
		if (!blockReason.trim()) return;
		await onToggleBlock(blockReason.trim());
		setShowBlockInput(false);
		setBlockReason("");
	};

	const handleUnblock = async () => {
		await onToggleBlock("");
	};

	return (
		<div className="space-y-4">
			{/* Approval section */}
			{task.status === "pending_approval" && (
				<div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
					<div className="flex items-center gap-2 mb-3">
						<ShieldCheck className="h-4 w-4 text-yellow-400" />
						<span className="text-sm font-medium text-yellow-400">
							{t("approval.title")}
						</span>
					</div>
					<p className="text-sm text-zinc-400 mb-3">
						{t("approval.description")}
					</p>
					{showRejectInput ? (
						<div className="space-y-2">
							<Textarea
								value={rejectReason}
								onChange={(e) => setRejectReason(e.target.value)}
								placeholder={t("approval.reject_placeholder")}
								className="bg-zinc-950 border-zinc-800 min-h-[80px]"
							/>
							<div className="flex gap-2">
								<Button
									onClick={handleRejectSubmit}
									disabled={!rejectReason.trim() || rejecting}
									size="sm"
									className="bg-red-600 hover:bg-red-700"
								>
									{rejecting ? (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									) : (
										<ShieldX className="h-4 w-4 mr-2" />
									)}
									{t("action.confirm_reject")}
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setShowRejectInput(false);
										setRejectReason("");
									}}
									className="border-zinc-700"
								>
									{t("app.cancel")}
								</Button>
							</div>
						</div>
					) : (
						<div className="flex gap-2">
							<Button
								onClick={onApprove}
								disabled={approving}
								size="sm"
								className="bg-green-600 hover:bg-green-700"
							>
								{approving ? (
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								) : (
									<ShieldCheck className="h-4 w-4 mr-2" />
								)}
								{t("action.approve")}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowRejectInput(true)}
								className="border-red-800 text-red-400 hover:text-red-300 hover:bg-red-600/10"
							>
								<ShieldX className="h-4 w-4 mr-2" />
								{t("action.reject")}
							</Button>
						</div>
					)}
				</div>
			)}

			{/* Blocked reason display */}
			{task.blocked && task.blocked_reason && (
				<div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3">
					<div className="flex items-center gap-2 mb-1">
						<AlertTriangle className="h-4 w-4 text-red-400" />
						<span className="text-sm font-medium text-red-400">
							{t("action.blocked")}
						</span>
					</div>
					<p className="text-sm text-zinc-400">{task.blocked_reason}</p>
				</div>
			)}

			{/* Action buttons */}
			<div className="flex gap-2 flex-wrap">
				<Button
					variant="outline"
					size="sm"
					onClick={onEditRequest}
					className="border-zinc-700"
				>
					<ShieldCheck className="h-4 w-4 mr-2" />
					{t("app.edit")}
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={onDelete}
					disabled={deleting}
					className="border-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-600/10"
				>
					{deleting ? (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					) : (
						<ShieldX className="h-4 w-4 mr-2" />
					)}
					{t("app.delete")}
				</Button>

				{task.status === "in_progress" && !task.blocked && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowBlockInput(true)}
						className="border-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-600/10"
					>
						<AlertTriangle className="h-4 w-4 mr-2" />
						{t("action.block_task")}
					</Button>
				)}

				{task.blocked && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleUnblock}
						disabled={blocking}
						className="border-zinc-800 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/10"
					>
						{blocking ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<Unlock className="h-4 w-4 mr-2" />
						)}
						{t("action.unblock_task")}
					</Button>
				)}
			</div>

			{/* Block input */}
			{showBlockInput && (
				<div className="space-y-2">
					<Textarea
						value={blockReason}
						onChange={(e) => setBlockReason(e.target.value)}
						placeholder={t("block.reason_placeholder")}
						className="bg-zinc-950 border-zinc-800 min-h-[80px]"
					/>
					<div className="flex gap-2">
						<Button
							onClick={handleBlockSubmit}
							disabled={!blockReason.trim() || blocking}
							size="sm"
							className="bg-red-600 hover:bg-red-700"
						>
							{blocking ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<AlertTriangle className="h-4 w-4 mr-2" />
							)}
							{t("action.confirm_block")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setShowBlockInput(false);
								setBlockReason("");
							}}
							className="border-zinc-700"
						>
							{t("app.cancel")}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
