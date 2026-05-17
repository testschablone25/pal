"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Clock, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const STAFF_TABS = [
	{ href: "/staff", label: "Mitarbeiter", icon: Users },
	{ href: "/staff/shifts", label: "Schichtplan", icon: Clock },
	{ href: "/staff/availability", label: "Verfügbarkeit", icon: CalendarDays },
] as const;

export function StaffSubNav() {
	const pathname = usePathname();

	return (
		<div className="flex items-center gap-1 mb-6 border-b border-zinc-800">
			{STAFF_TABS.map((tab) => {
				const isActive =
					pathname === tab.href ||
					(tab.href !== "/staff" && pathname.startsWith(tab.href));
				return (
					<Link
						key={tab.href}
						href={tab.href}
						className={cn(
							"flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
							isActive
								? "border-violet-500 text-white"
								: "border-transparent text-zinc-400 hover:text-white hover:border-zinc-600",
						)}
					>
						<tab.icon className="h-4 w-4" />
						{tab.label}
					</Link>
				);
			})}
		</div>
	);
}
