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
					<NavBar />
					<main>{children}</main>
					<Toaster />
				</I18nProvider>
			</body>
		</html>
	);
}
