'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArtistForm } from '@/components/artist-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface Artist {
  id: string;
  name: string;
  city: string | null;
  fee: number | null;
  genre: string | null;
  bio: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  promo_pack_url: string | null;
}

export default function EditArtistPage() {
  const params = useParams();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const response = await fetch(`/api/artists/${params.id}`);
        if (!response.ok) {
          throw new Error('Artist not found');
        }
        const data = await response.json();
        setArtist(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load artist');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchArtist();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 bg-zinc-800" />
          <Skeleton className="h-5 w-96 mt-2 bg-zinc-800" />
        </div>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 space-y-6">
            <Skeleton className="h-10 w-full bg-zinc-800" />
            <Skeleton className="h-10 w-full bg-zinc-800" />
            <Skeleton className="h-10 w-full bg-zinc-800" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <p className="text-red-400">{error || 'Artist not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Edit Artist</h1>
        <p className="text-zinc-400 mt-2">
          Update artist information for {artist.name}
        </p>
      </div>
      <ArtistForm artist={artist} mode="edit" />
    </div>
  );
}
