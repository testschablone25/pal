'use client';

import { ArtistForm } from '@/components/artist-form';

export default function NewArtistPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Add New Artist</h1>
        <p className="text-zinc-400 mt-2">
          Add a new artist to your booking database
        </p>
      </div>
      <ArtistForm mode="create" />
    </div>
  );
}