/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";

describe("DashboardStats", () => {
	it("shows blocked count stat when > 0", () => {
		render(
			<DashboardStats
				blockedCount={3}
				pendingApprovalCount={0}
				dueThisWeek={0}
				activeRentalsCount={0}
				canApproveTasks={false}
				userRoles={["staff"]}
			/>,
		);
		expect(screen.getByText("3")).toBeInTheDocument();
		expect(screen.getByText("Blockiert")).toBeInTheDocument();
	});

	it("does not show blocked stat when 0", () => {
		render(
			<DashboardStats
				blockedCount={0}
				pendingApprovalCount={0}
				dueThisWeek={0}
				activeRentalsCount={0}
				canApproveTasks={false}
				userRoles={["staff"]}
			/>,
		);
		expect(screen.queryByText("Blockiert")).not.toBeInTheDocument();
	});

	it("shows pending approval stat when canApproveTasks and count > 0", () => {
		render(
			<DashboardStats
				blockedCount={0}
				pendingApprovalCount={5}
				dueThisWeek={0}
				activeRentalsCount={0}
				canApproveTasks={true}
				userRoles={["admin"]}
			/>,
		);
		expect(screen.getByText("Offene Genehmigungen")).toBeInTheDocument();
	});

	it("hides pending approval stat when canApproveTasks is false", () => {
		render(
			<DashboardStats
				blockedCount={0}
				pendingApprovalCount={5}
				dueThisWeek={0}
				activeRentalsCount={0}
				canApproveTasks={false}
				userRoles={["staff"]}
			/>,
		);
		expect(screen.queryByText("Offene Genehmigungen")).not.toBeInTheDocument();
	});

	it("shows due this week stat when > 0", () => {
		render(
			<DashboardStats
				blockedCount={0}
				pendingApprovalCount={0}
				dueThisWeek={2}
				activeRentalsCount={0}
				canApproveTasks={false}
				userRoles={["staff"]}
			/>,
		);
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("Fällig diese Woche")).toBeInTheDocument();
	});

	it("shows active rentals stat when > 0", () => {
		render(
			<DashboardStats
				blockedCount={0}
				pendingApprovalCount={0}
				dueThisWeek={0}
				activeRentalsCount={4}
				canApproveTasks={false}
				userRoles={["staff"]}
			/>,
		);
		expect(screen.getByText("4")).toBeInTheDocument();
		expect(screen.getByText("Aktive Verleihe")).toBeInTheDocument();
	});

	it("renders nothing when all counts are 0", () => {
		const { container } = render(
			<DashboardStats
				blockedCount={0}
				pendingApprovalCount={0}
				dueThisWeek={0}
				activeRentalsCount={0}
				canApproveTasks={false}
				userRoles={["staff"]}
			/>,
		);
		// Grid should be empty when all counts are zero
		const gridInner = container.querySelector(".grid");
		expect(gridInner?.children.length).toBe(0);
	});

	it("renders multiple stats simultaneously", () => {
		render(
			<DashboardStats
				blockedCount={2}
				pendingApprovalCount={3}
				dueThisWeek={5}
				activeRentalsCount={1}
				canApproveTasks={true}
				userRoles={["admin"]}
			/>,
		);
		expect(screen.getByText("Blockiert")).toBeInTheDocument();
		expect(screen.getByText("Offene Genehmigungen")).toBeInTheDocument();
		expect(screen.getByText("Fällig diese Woche")).toBeInTheDocument();
		expect(screen.getByText("Aktive Verleihe")).toBeInTheDocument();
	});
});
