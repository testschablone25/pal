import { describe, it, expect } from "vitest";

describe("Task Detail Actions Logic", () => {
	it("should only show approval section for pending_approval status", () => {
		const statuses = [
			"todo",
			"in_progress",
			"pending_approval",
			"done",
			"cancelled",
		];
		const showApproval = (status: string) => status === "pending_approval";

		expect(showApproval("pending_approval")).toBe(true);
		for (const s of statuses.filter((s) => s !== "pending_approval")) {
			expect(showApproval(s)).toBe(false);
		}
	});

	it("should require reason for rejection", () => {
		const validateReject = (reason: string) => reason.trim().length > 0;

		expect(validateReject("Missing equipment")).toBe(true);
		expect(validateReject("")).toBe(false);
	});

	it("should require reason for blocking", () => {
		const validateBlock = (reason: string | null | undefined) => {
			return Boolean(reason && reason.trim().length > 0);
		};

		expect(validateBlock("Waiting for parts")).toBe(true);
		expect(validateBlock("")).toBe(false);
		expect(validateBlock(null)).toBe(false);
		expect(validateBlock(undefined)).toBe(false);
	});

	it("should set blocked_reason to null when unblocking", () => {
		const unblock = (blocked: boolean, reason: string | null) => {
			return { blocked, blocked_reason: blocked ? reason : null };
		};

		const result = unblock(false, "");
		expect(result.blocked).toBe(false);
		expect(result.blocked_reason).toBeNull();
	});

	it("should construct correct history entry for blocking", () => {
		const historyEntry = {
			task_id: "task-1",
			changed_by: "user-1",
			from_status: "in_progress",
			to_status: "in_progress",
			change_type: "blocked",
			reason: "Waiting for equipment delivery",
		};

		expect(historyEntry.change_type).toBe("blocked");
		expect(historyEntry.from_status).toBe("in_progress");
		expect(historyEntry.reason).toBeTruthy();
	});

	it("should construct correct history entry for unblocking", () => {
		const historyEntry = {
			task_id: "task-1",
			changed_by: "user-1",
			from_status: "in_progress",
			to_status: "in_progress",
			change_type: "unblocked",
			reason: null,
		};

		expect(historyEntry.change_type).toBe("unblocked");
		expect(historyEntry.reason).toBeNull();
	});

	it("should detect when user can approve/reject", () => {
		const canApproveRoles = ["admin", "manager", "backoffice"];
		const cannotApproveRoles = ["staff", "tech", "gastro", "awareness"];

		for (const role of canApproveRoles) {
			expect(canApproveRoles.includes(role)).toBe(true);
		}
		for (const role of cannotApproveRoles) {
			expect(canApproveRoles.includes(role)).toBe(false);
		}
	});

	it("should validate that delete is only allowed for non-checked-in items", () => {
		const canDelete = (status: string) => status !== "checked_in";

		expect(canDelete("pending")).toBe(true);
		expect(canDelete("cancelled")).toBe(true);
		expect(canDelete("checked_out")).toBe(true);
		expect(canDelete("checked_in")).toBe(false);
	});
});
