import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
	className?: string;
	/** Number of skeleton rows. Default: 5 */
	rows?: number;
	/** Show card-style skeleton with header. Default: true */
	card?: boolean;
	/** Show a title skeleton. Default: true */
	title?: boolean;
	/** Subtitle skeleton. Default: true if title is true */
	subtitle?: boolean;
	/** Action bar skeleton (search/filter area). Default: false */
	actions?: boolean;
}

export function PageSkeleton({
	className,
	rows = 5,
	card = true,
	title = true,
	subtitle = true,
	actions = false,
}: PageSkeletonProps) {
	return (
		<div className={cn("space-y-6", className)}>
			{title && (
				<div className="space-y-2">
					<Skeleton className="h-8 w-48 bg-zinc-800" />
					{subtitle && <Skeleton className="h-4 w-72 bg-zinc-800" />}
				</div>
			)}
			{actions && (
				<div className="flex gap-2">
					<Skeleton className="h-10 w-64 bg-zinc-800" />
					<Skeleton className="h-10 w-32 bg-zinc-800" />
				</div>
			)}
			{card ? (
				<div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
					<Skeleton className="h-6 w-32 bg-zinc-800" />
					{Array.from({ length: rows }).map((_, i) => (
						<Skeleton
							key={i}
							className={cn(
								"h-12 bg-zinc-800",
								i % 2 === 0 && "w-full",
								i % 2 === 1 && "w-3/4",
							)}
						/>
					))}
				</div>
			) : (
				<div className="space-y-3">
					{Array.from({ length: rows }).map((_, i) => (
						<Skeleton
							key={i}
							className={cn(
								"h-12 bg-zinc-800",
								i % 2 === 0 ? "w-full" : "w-3/4",
							)}
						/>
					))}
				</div>
			)}
		</div>
	);
}
