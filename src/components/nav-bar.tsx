"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Home,
	Calendar,
	Users,
	DoorOpen,
	ClipboardList,
	Music,
	Building,
	Package,
	ArrowLeftRight,
	Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
	Sheet,
	SheetContent,
	SheetTrigger,
	SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
	{ href: "/", label: "Dashboard", icon: Home },
	{ href: "/events", label: "Events", icon: Calendar },
	{ href: "/artists", label: "Künstler", icon: Music },
	{ href: "/door", label: "Tür", icon: DoorOpen },
	{ href: "/staff", label: "Staff", icon: Users },
	{ href: "/workflow", label: "Aufgaben", icon: ClipboardList },
	{ href: "/inventory", label: "Inventar", icon: Package },
	{ href: "/rentals", label: "Verleih", icon: ArrowLeftRight },
	{ href: "/venues", label: "Venues", icon: Building },
];

function NavLink({
	href,
	label,
	icon: Icon,
}: {
	href: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
}) {
	const pathname = usePathname();
	const isActive =
		pathname === href || (href !== "/" && pathname.startsWith(href));

	return (
		<Link
			href={href}
			className={cn(
				"flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
				isActive
					? "bg-violet-600 text-white"
					: "text-zinc-400 hover:text-white hover:bg-zinc-800",
			)}
		>
			<Icon className="h-4 w-4" />
			<span className="hidden md:inline">{label}</span>
		</Link>
	);
}

function MobileNavLink({
	href,
	label,
	icon: Icon,
	onNavigate,
}: {
	href: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	onNavigate?: () => void;
}) {
	const pathname = usePathname();
	const isActive =
		pathname === href || (href !== "/" && pathname.startsWith(href));

	return (
		<SheetClose asChild>
			<Link
				href={href}
				className={cn(
					"flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
					isActive
						? "bg-violet-600 text-white"
						: "text-zinc-400 hover:text-white hover:bg-zinc-800",
				)}
			>
				<Icon className="h-5 w-5" />
				{label}
			</Link>
		</SheetClose>
	);
}

export function NavBar() {
	return (
		<nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
			<div className="max-w-7xl mx-auto px-4">
				<div className="flex items-center justify-between h-14">
					<Link href="/" className="flex items-center gap-2 font-bold text-xl">
						<span className="text-violet-400">PAL</span>
						<span className="hidden sm:inline text-zinc-500 text-sm font-normal">
							Nightclub
						</span>
					</Link>

					{/* Desktop nav items */}
					<div className="hidden md:flex items-center gap-1">
						{navItems.map((item) => (
							<NavLink key={item.href} {...item} />
						))}
					</div>

					<div className="flex items-center gap-2">
						{/* Desktop language toggle */}
						<div className="hidden md:block">
							<LanguageToggle />
						</div>

						{/* Mobile hamburger */}
						<Sheet>
							<SheetTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="md:hidden text-zinc-400 hover:text-white hover:bg-zinc-800"
								>
									<Menu className="h-5 w-5" />
									<span className="sr-only">Open navigation menu</span>
								</Button>
							</SheetTrigger>
							<SheetContent
								side="right"
								className="w-72 bg-zinc-950 border-zinc-800 p-0"
							>
								<div className="flex flex-col h-full">
									{/* Sheet header */}
									<div className="flex items-center gap-2 px-6 pt-6 pb-4 border-b border-zinc-800">
										<span className="text-violet-400 font-bold text-xl">
											PAL
										</span>
										<span className="text-zinc-500 text-sm font-normal">
											Nightclub
										</span>
									</div>

									{/* Nav items */}
									<div className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
										{navItems.map((item) => (
											<MobileNavLink key={item.href} {...item} />
										))}
									</div>

									{/* Language toggle at bottom */}
									<div className="px-6 py-4 border-t border-zinc-800">
										<LanguageToggle />
									</div>
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</div>
		</nav>
	);
}

function LanguageToggle() {
	// Wrap in a client component that uses the i18n context
	return <LanguageToggleInner />;
}

function LanguageToggleInner() {
	const { locale, toggleLocale } = useI18n();
	return (
		<button
			onClick={toggleLocale}
			className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
			title={locale === "de" ? "Switch to English" : "Zu Deutsch wechseln"}
		>
			<span
				className={cn(locale === "de" ? "text-violet-400" : "text-zinc-500")}
			>
				DE
			</span>
			<span className="text-zinc-700">/</span>
			<span
				className={cn(locale === "en" ? "text-violet-400" : "text-zinc-500")}
			>
				EN
			</span>
		</button>
	);
}
