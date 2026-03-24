import { ArtistList } from '@/components/artist-list';

export default function ArtistsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
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