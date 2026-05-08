"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	Home,
	Calendar,
	Users,
	ClipboardList,
	Music,
	Building,
	Package,
	Phone,
	Menu,
	LogOut,
	Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useUser } from "@/lib/user-context";
import {
	createClient as createBrowserClient,
	resetClient,
} from "@/lib/supabase/browser";
import { canAccessRoute } from "@/lib/permissions";
import {
	Sheet,
	SheetContent,
	SheetTrigger,
	SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const navItems = [
	{ href: "/", label: "Dashboard", icon: Home },
	{ href: "/events", label: "Events", icon: Calendar },
	{ href: "/artists", label: "Künstler", icon: Music },
	{ href: "/staff", label: "Staff", icon: Users },
	{ href: "/workflow", label: "Aufgaben", icon: ClipboardList },
	{ href: "/inventory", label: "Inventar", icon: Package },
	{ href: "/venues", label: "Venues", icon: Building },
	{ href: "/contacts", label: "Contacts", icon: Phone },
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
}: {
	href: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
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
	const { userRoles, loading } = useUser();

	// While loading, show all nav items to avoid flash of Dashboard-only nav
	const filteredNavItems = loading
		? navItems
		: userRoles.length === 0
			? navItems.filter((item) => item.href === "/")
			: navItems.filter((item) => canAccessRoute(userRoles, item.href));

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
						{filteredNavItems.map((item) => (
							<NavLink key={item.href} {...item} />
						))}
					</div>

					<div className="flex items-center gap-2">
						{/* Desktop language toggle */}
						<div className="hidden md:block">
							<LanguageToggle />
						</div>

						{/* User menu */}
						<UserMenu />

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
										{filteredNavItems.map((item) => (
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

function UserMenu() {
	const router = useRouter();
	const { userId } = useUser();
	const [email, setEmail] = useState<string | null>(null);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		async function loadEmail() {
			if (!userId) return;
			const supabase = createBrowserClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user?.email) setEmail(user.email);
		}
		loadEmail();
	}, [userId]);

	async function handleSignOut() {
		setOpen(false);
		try {
			// Use the server-side endpoint to properly clear HTTP-only session cookies
			const res = await fetch("/api/auth/signout", { method: "POST" });
			if (!res.ok) {
				console.error("Server sign-out failed:", await res.text());
			}
		} catch (err) {
			console.error("Sign out failed:", err);
		} finally {
			// Reset the singleton so next client gets a fresh instance
			resetClient();
			window.location.href = "/login";
		}
	}

	if (!userId) return null;

	const initials = email ? email.slice(0, 2).toUpperCase() : "??";

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<button
					className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-600/20 text-violet-400 text-xs font-bold hover:bg-violet-600/30 transition-colors"
					title={email ?? "User menu"}
				>
					{initials}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				sideOffset={8}
				className="w-56 bg-zinc-900 border-zinc-800"
			>
				{email && (
					<div className="px-3 py-2 text-sm text-zinc-400 truncate border-b border-zinc-800">
						{email}
					</div>
				)}
				<DropdownMenuItem
					onClick={() => {
						setOpen(false);
						router.push("/settings");
					}}
					className="text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
				>
					<Settings className="h-4 w-4 mr-2" />
					Settings
				</DropdownMenuItem>
				<DropdownMenuSeparator className="bg-zinc-800" />
				<DropdownMenuItem
					onClick={handleSignOut}
					className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
				>
					<LogOut className="h-4 w-4 mr-2" />
					Sign Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
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
