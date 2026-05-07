import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { I18nProvider } from "@/lib/i18n";
import { UserProvider } from "@/lib/user-context";
import { Toaster } from "@/components/ui/toaster";

// Self-host Montserrat variable font (latin subset only, saves ~300KB)
const montserrat = localFont({
	src: [
		{
			path: "../../node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2",
			weight: "125 900",
			style: "normal",
		},
		{
			path: "../../node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-italic.woff2",
			weight: "125 900",
			style: "italic",
		},
	],
	variable: "--font-montserrat",
	display: "swap",
});

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
			<body
				className={`${montserrat.variable} font-[family-name:var(--font-montserrat)] antialiased bg-zinc-950 text-white min-h-screen`}
			>
				<I18nProvider>
					<UserProvider>
						{/* Gradient ambient background */}
						<div className="fixed inset-0 pointer-events-none overflow-hidden">
							<div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
							<div className="absolute top-1/3 -left-20 w-72 h-72 bg-blue-600/[0.03] rounded-full blur-3xl" />
						</div>
						<NavBar />
						<main className="relative animate-in fade-in duration-200">
							{children}
						</main>
						<Toaster />
					</UserProvider>
				</I18nProvider>
			</body>
		</html>
	);
}
