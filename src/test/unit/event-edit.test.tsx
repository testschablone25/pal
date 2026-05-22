/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EventForm } from "@/components/event-form";

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock venues API response
const mockVenues = {
	venues: [
		{ id: "venue-1", name: "PAL Club", address: "Berlin", capacity: 800 },
		{ id: "venue-2", name: "Berghain", address: "Berlin", capacity: 1500 },
	],
};

const mockEvent = {
	id: "event-123",
	name: "Techno Night",
	date: "2026-05-15",
	venue_id: "venue-1",
	door_time: "22:00",
	end_time: "06:00",
	status: "draft" as const,
	max_capacity: 500,
};

describe("EventForm Edit Mode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default fetch mock for venues
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockVenues),
		});
	});

	it("renders form with pre-filled event data", async () => {
		render(<EventForm event={mockEvent} mode="edit" />);

		await waitFor(() => {
			const nameInput = screen.getByDisplayValue("Techno Night");
			expect(nameInput).toBeDefined();
		});

		const dateInput = screen.getByDisplayValue("2026-05-15");
		expect(dateInput).toBeDefined();
	});

	it("displays Edit Event title in edit mode", async () => {
		render(<EventForm event={mockEvent} mode="edit" />);

		await waitFor(() => {
			expect(screen.getByText("Edit Event")).toBeDefined();
		});
	});

	it("shows Save Changes button in edit mode", async () => {
		render(<EventForm event={mockEvent} mode="edit" />);

		await waitFor(() => {
			expect(screen.getByText("Save Changes")).toBeDefined();
		});
	});

	it("calls PUT endpoint on submit with correct data", async () => {
		mockFetch.mockImplementation((url: string, init?: RequestInit) => {
			// If it's a PUT request, mock success
			if (typeof url === "string" && url.includes("/api/events/") && init?.method === "PUT") {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ ...mockEvent, status: "published" }),
				});
			}
			// Default: venues response
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockVenues),
			});
		});

		render(<EventForm event={mockEvent} mode="edit" />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("Techno Night")).toBeDefined();
		});

		const submitButton = screen.getByText("Save Changes");
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/events/event-123",
				expect.objectContaining({
					method: "PUT",
				}),
			);
		});
	});

	it("shows validation error when name is empty", async () => {
		render(<EventForm event={mockEvent} mode="edit" />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("Techno Night")).toBeDefined();
		});

		const nameInput = screen.getByDisplayValue("Techno Night");
		fireEvent.change(nameInput, { target: { value: "" } });

		const submitButton = screen.getByText("Save Changes");
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Name is required")).toBeDefined();
		});
	});

	it("shows validation error when date is empty", async () => {
		render(<EventForm event={mockEvent} mode="edit" />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("2026-05-15")).toBeDefined();
		});

		const dateInput = screen.getByDisplayValue("2026-05-15");
		fireEvent.change(dateInput, { target: { value: "" } });

		const submitButton = screen.getByText("Save Changes");
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Date is required")).toBeDefined();
		});
	});
});
