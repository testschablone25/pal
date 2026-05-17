import { RentalsList } from "@/components/rentals-list";

export default function RentalsPage() {
	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">Rentals</h1>
				<p className="text-zinc-400 mt-2">
					Track equipment rentals, checkouts, and returns
				</p>
			</div>
			<RentalsList />
		</div>
	);
}
