import { ArtistList } from "@/components/artist-list";

export default function ArtistsPage() {
	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-white">Artists</h1>
				<p className="text-zinc-400 mt-2">
					Manage your artist database and booking information
				</p>
			</div>
			<ArtistList />
		</div>
	);
}
