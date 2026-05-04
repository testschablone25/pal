import type { Metadata } from "next";
import "@fontsource-variable/montserrat";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
	title: "PAL - Nightclub Booking System",
	description: "Nightclub booking and guest management system",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="de">
			<body className="font-[family-name:var(--font-montserrat)] antialiased bg-zinc-950 text-white min-h-screen">
				<I18nProvider>
					{/* Gradient ambient background */}
					<div className="fixed inset-0 pointer-events-none overflow-hidden">
						<div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
						<div className="absolute top-1/3 -left-20 w-72 h-72 bg-blue-600/[0.03] rounded-full blur-3xl" />
					</div>
					<NavBar />
					<main className="relative animate-in fade-in duration-200">{children}</main>
					<Toaster />
				</I18nProvider>
			</body>
		</html>
	);
}
