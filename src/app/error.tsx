"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function RootError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("Root error:", error);
	}, [error]);

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
				<AlertTriangle className="h-12 w-12 text-red-400" />
				<h2 className="text-xl font-semibold text-white">Something went wrong</h2>
				<p className="text-zinc-400 text-sm max-w-md text-center">
					{error.message || "An unexpected error occurred."}
				</p>
				<Button onClick={reset} className="bg-violet-600 hover:bg-violet-700">
					Try again
				</Button>
			</div>
		</div>
	);
}
