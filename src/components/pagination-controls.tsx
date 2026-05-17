"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
	/** Current page (1-indexed) */
	currentPage: number;
	/** Total number of pages */
	totalPages: number;
	/** Total number of items across all pages */
	totalItems?: number;
	/** Called when page changes */
	onPageChange: (page: number) => void;
	/** Optional className override */
	className?: string;
}

/**
 * Reusable pagination control component.
 * All list APIs support limit/offset — pair this with server-side pagination.
 */
export function PaginationControls({
	currentPage,
	totalPages,
	totalItems,
	onPageChange,
	className,
}: PaginationControlsProps) {
	if (totalPages <= 1) return null;

	// Determine which page numbers to show (window of 5)
	const getPageNumbers = (): (number | "...")[] => {
		const pages: (number | "...")[] = [];
		const delta = 2; // Show 2 pages on each side of current

		const start = Math.max(2, currentPage - delta);
		const end = Math.min(totalPages - 1, currentPage + delta);

		pages.push(1);

		if (start > 2) {
			pages.push("...");
		}

		for (let i = start; i <= end; i++) {
			pages.push(i);
		}

		if (end < totalPages - 1) {
			pages.push("...");
		}

		if (totalPages > 1) {
			pages.push(totalPages);
		}

		return pages;
	};

	const pageNumbers = getPageNumbers();

	return (
		<div
			className={cn(
				"flex items-center justify-between gap-4",
				className,
			)}
		>
			{totalItems !== undefined && (
				<p className="text-sm text-zinc-400">
					{totalItems}{" "}
					{totalItems === 1 ? "item" : "items"} total
				</p>
			)}

			<div className="flex items-center gap-1">
				<Button
					variant="outline"
					size="icon"
					className="h-8 w-8 border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
					disabled={currentPage <= 1}
					onClick={() => onPageChange(currentPage - 1)}
				>
					<ChevronLeft className="h-4 w-4" />
					<span className="sr-only">Previous page</span>
				</Button>

				{pageNumbers.map((page, idx) =>
					page === "..." ? (
						<span
							key={`ellipsis-${idx}`}
							className="px-1 text-zinc-500 text-sm"
						>
							...
						</span>
					) : (
						<Button
							key={page}
							variant={page === currentPage ? "default" : "outline"}
							size="icon"
							className={cn(
								"h-8 w-8 text-sm",
								page === currentPage
									? "bg-violet-600 hover:bg-violet-700"
									: "border-zinc-800 bg-zinc-900 hover:bg-zinc-800",
							)}
							onClick={() => onPageChange(page)}
						>
							{page}
						</Button>
					),
				)}

				<Button
					variant="outline"
					size="icon"
					className="h-8 w-8 border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
					disabled={currentPage >= totalPages}
					onClick={() => onPageChange(currentPage + 1)}
				>
					<ChevronRight className="h-4 w-4" />
					<span className="sr-only">Next page</span>
				</Button>
			</div>
		</div>
	);
}
