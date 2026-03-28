import type { Metadata } from "next";
import "@fontsource-variable/montserrat";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";

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
        <NavBar />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
