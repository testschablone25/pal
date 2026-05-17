/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";

// Mock date formatting to return predictable output
vi.mock("@/lib/dates", () => ({
	formatDateFull: () => "Monday, May 5, 2026",
}));

// Mock permissions
vi.mock("@/lib/permissions", () => ({
	getRoleBadges: () => [{ role: "admin", label: "Admin", color: "bg-red-600" }],
}));

const getInitials = (name: string | null | undefined) => {
	if (!name) return "?";
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
};

const mockProfile = {
	id: "user-1",
	email: "oli@pal.club",
	full_name: "Oliver Jeschke",
};

const mockEvent = {
	id: "event-1",
	name: "Techno Night",
	date: "2026-05-05",
	door_time: "22:00",
	end_time: "06:00",
	status: "published",
	venue_id: "venue-1",
	venue_name: "PAL Club",
};

describe("DashboardHero", () => {
	it("renders greeting with profile first name", () => {
		render(
			<DashboardHero
				profile={mockProfile}
				todaysEvent={null}
				userRoles={["admin"]}
				canAccessAdmin={false}
				onSignOut={vi.fn()}
				getInitials={getInitials}
			/>,
		);
		expect(screen.getByText(/Oliver/)).toBeInTheDocument();
	});

	it("renders email name fallback when full_name is null", () => {
		const emailProfile = {
			id: "user-2",
			email: "staff@pal.club",
			full_name: null,
		};
		render(
			<DashboardHero
				profile={emailProfile}
				todaysEvent={null}
				userRoles={["staff"]}
				canAccessAdmin={false}
				onSignOut={vi.fn()}
				getInitials={getInitials}
			/>,
		);
		expect(screen.getByText(/staff/)).toBeInTheDocument();
	});

	it("shows today's event when available", () => {
		render(
			<DashboardHero
				profile={mockProfile}
				todaysEvent={mockEvent}
				userRoles={["staff"]}
				canAccessAdmin={false}
				onSignOut={vi.fn()}
				getInitials={getInitials}
			/>,
		);
		expect(screen.getByText("Techno Night")).toBeInTheDocument();
		expect(screen.getByText(/22:00/)).toBeInTheDocument();
		expect(screen.getByText(/PAL Club/)).toBeInTheDocument();
		expect(screen.getByText("Heute Abend")).toBeInTheDocument();
	});

	it('shows "Kein Event heute" when no event', () => {
		render(
			<DashboardHero
				profile={mockProfile}
				todaysEvent={null}
				userRoles={["staff"]}
				canAccessAdmin={false}
				onSignOut={vi.fn()}
				getInitials={getInitials}
			/>,
		);
		expect(screen.getByText(/Kein Event heute/)).toBeInTheDocument();
	});

	it("renders avatar with initials", () => {
		render(
			<DashboardHero
				profile={mockProfile}
				todaysEvent={null}
				userRoles={["admin"]}
				canAccessAdmin={false}
				onSignOut={vi.fn()}
				getInitials={getInitials}
			/>,
		);
		expect(screen.getByText("OJ")).toBeInTheDocument();
	});

	it("shows Admin link when canAccessAdmin is true", () => {
		render(
			<DashboardHero
				profile={mockProfile}
				todaysEvent={null}
				userRoles={["admin"]}
				canAccessAdmin={true}
				onSignOut={vi.fn()}
				getInitials={getInitials}
			/>,
		);
		// Admin button renders as a Link
		expect(screen.getByRole("link", { name: /admin/i })).toBeInTheDocument();
	});

	it("hides Admin link but keeps badge when canAccessAdmin is false", () => {
		render(
			<DashboardHero
				profile={mockProfile}
				todaysEvent={null}
				userRoles={["staff"]}
				canAccessAdmin={false}
				onSignOut={vi.fn()}
				getInitials={getInitials}
			/>,
		);
		// Admin link should NOT be present
		expect(
			screen.queryByRole("link", { name: /admin/i }),
		).not.toBeInTheDocument();
		// But "Admin" text still shows as a role badge (from getRoleBadges mock)
		expect(screen.getByText("Admin")).toBeInTheDocument();
	});

	it("calls onSignOut when logout button is clicked", () => {
		const onSignOut = vi.fn();
		render(
			<DashboardHero
				profile={mockProfile}
				todaysEvent={null}
				userRoles={["staff"]}
				canAccessAdmin={false}
				onSignOut={onSignOut}
				getInitials={getInitials}
			/>,
		);
		// Logout is the last button
		const buttons = screen.getAllByRole("button");
		const logoutButton = buttons[buttons.length - 1];
		fireEvent.click(logoutButton);
		expect(onSignOut).toHaveBeenCalled();
	});
});
