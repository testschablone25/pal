'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Users, DoorOpen, ClipboardList, Music, Building, Package, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-violet-600 text-white"
          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}

export function NavBar() {
  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-violet-400">PAL</span>
            <span className="hidden sm:inline text-zinc-500 text-sm font-normal">Nightclub</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
