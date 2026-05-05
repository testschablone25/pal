/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaginationControls } from "@/components/pagination-controls";

describe("PaginationControls", () => {
	it("renders nothing when totalPages <= 1", () => {
		const { container } = render(
			<PaginationControls
				currentPage={1}
				totalPages={1}
				onPageChange={vi.fn()}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders correct page buttons for a small page set", () => {
		render(
			<PaginationControls
				currentPage={2}
				totalPages={3}
				onPageChange={vi.fn()}
			/>,
		);
		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("marks current page as active", () => {
		render(
			<PaginationControls
				currentPage={2}
				totalPages={5}
				onPageChange={vi.fn()}
			/>,
		);
		const buttons = screen.getAllByRole("button");
		const page2 = buttons.find((b) => b.textContent === "2");
		expect(page2).toBeTruthy();
		// Should have the default (active) variant class
		expect(page2?.className).toContain("bg-violet-600");
	});

	it("prev button is disabled on first page", () => {
		render(
			<PaginationControls
				currentPage={1}
				totalPages={5}
				onPageChange={vi.fn()}
			/>,
		);
		const buttons = screen.getAllByRole("button");
		// First button should be prev (disabled)
		expect(buttons[0]).toBeDisabled();
	});

	it("next button is disabled on last page", () => {
		render(
			<PaginationControls
				currentPage={5}
				totalPages={5}
				onPageChange={vi.fn()}
			/>,
		);
		const buttons = screen.getAllByRole("button");
		// Last button should be next (disabled)
		expect(buttons[buttons.length - 1]).toBeDisabled();
	});

	it("calls onPageChange when clicking a page", () => {
		const onPageChange = vi.fn();
		render(
			<PaginationControls
				currentPage={1}
				totalPages={5}
				onPageChange={onPageChange}
			/>,
		);
		fireEvent.click(screen.getByText("3"));
		expect(onPageChange).toHaveBeenCalledWith(3);
	});

	it("calls onPageChange with prev/next on arrow clicks", () => {
		const onPageChange = vi.fn();
		render(
			<PaginationControls
				currentPage={3}
				totalPages={5}
				onPageChange={onPageChange}
			/>,
		);
		const buttons = screen.getAllByRole("button");
		// Prev button
		fireEvent.click(buttons[0]);
		expect(onPageChange).toHaveBeenCalledWith(2);
		// Next button
		fireEvent.click(buttons[buttons.length - 1]);
		expect(onPageChange).toHaveBeenCalledWith(4);
	});

	it("shows total items when provided", () => {
		render(
			<PaginationControls
				currentPage={1}
				totalPages={3}
				totalItems={45}
				onPageChange={vi.fn()}
			/>,
		);
		expect(screen.getByText(/45.*items/)).toBeInTheDocument();
	});

	it("shows ellipsis for large page ranges", () => {
		render(
			<PaginationControls
				currentPage={5}
				totalPages={20}
				onPageChange={vi.fn()}
			/>,
		);
		// Should have ellipsis elements
		const ellipses = screen.getAllByText("...");
		expect(ellipses.length).toBeGreaterThanOrEqual(1);
	});

	it('renders singular "item" when totalItems is 1', () => {
		render(
			<PaginationControls
				currentPage={1}
				totalPages={2}
				totalItems={1}
				onPageChange={vi.fn()}
			/>,
		);
		expect(screen.getByText(/1.*item/)).toBeInTheDocument();
	});
});
