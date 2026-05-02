import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description?: string;
	actionLabel?: string;
	actionHref?: string;
	onClick?: () => void;
	className?: string;
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	actionLabel,
	actionHref,
	onClick,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center py-16 px-4 text-center",
				className,
			)}
		>
			<div className="p-4 bg-zinc-800/50 rounded-full mb-4">
				<Icon className="h-10 w-10 text-zinc-500" />
			</div>
			<h3 className="text-lg font-medium text-zinc-300 mb-1">{title}</h3>
			{description && (
				<p className="text-sm text-zinc-500 max-w-sm mb-6">{description}</p>
			)}
			{actionLabel &&
				(actionHref ? (
					<Link href={actionHref}>
						<Button>{actionLabel}</Button>
					</Link>
				) : onClick ? (
					<Button onClick={onClick}>{actionLabel}</Button>
				) : null)}
		</div>
	);
}
