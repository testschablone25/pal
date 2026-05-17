import { describe, it, expect } from "vitest";

describe("Task Detail Comments Logic", () => {
	it("should not submit empty comment", () => {
		const canSubmit = (content: string) => content.trim().length > 0;

		expect(canSubmit("Great work!")).toBe(true);
		expect(canSubmit("")).toBe(false);
		expect(canSubmit("  ")).toBe(false);
	});

	it("should format author initials correctly", () => {
		const getInitials = (name: string | null | undefined) => {
			if (!name) return "?";
			return name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2);
		};

		expect(getInitials("Oliver Jeschke")).toBe("OJ");
		expect(getInitials("Alice B. Toklas")).toBe("AB");
		expect(getInitials("John")).toBe("J");
		expect(getInitials(null)).toBe("?");
		expect(getInitials(undefined)).toBe("?");
		expect(getInitials("")).toBe("?");
	});

	it("should sort comments by created_at descending", () => {
		const comments = [
			{ id: "1", created_at: "2026-05-05T10:00:00Z", content: "First" },
			{ id: "2", created_at: "2026-05-05T12:00:00Z", content: "Second" },
			{ id: "3", created_at: "2026-05-04T08:00:00Z", content: "Third" },
		];

		const sorted = [...comments].sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		);

		expect(sorted[0].content).toBe("Second");
		expect(sorted[1].content).toBe("First");
		expect(sorted[2].content).toBe("Third");
	});

	it("should show empty state when no comments", () => {
		const comments: Array<{ id: string; content: string }> = [];
		const showEmptyState = comments.length === 0;
		expect(showEmptyState).toBe(true);
	});
});
