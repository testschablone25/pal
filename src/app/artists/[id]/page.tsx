'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Music, Mail, Phone, ExternalLink, Pencil } from 'lucide-react';
import Link from 'next/link';

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
  created_at: string;
  updated_at: string;
}

export default function ArtistDetailPage() {
  const params = useParams();
  const router = useRouter();
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
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10 bg-zinc-800" />
          <Skeleton className="h-10 w-64 bg-zinc-800" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6 space-y-6">
                <Skeleton className="h-8 w-3/4 bg-zinc-800" />
                <Skeleton className="h-24 w-full bg-zinc-800" />
                <Skeleton className="h-24 w-full bg-zinc-800" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-6 w-full bg-zinc-800" />
                <Skeleton className="h-6 w-full bg-zinc-800" />
                <Skeleton className="h-6 w-full bg-zinc-800" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <p className="text-red-400">{error || 'Artist not found'}</p>
            <Button
              variant="outline"
              className="mt-4 border-zinc-800"
              onClick={() => router.push('/artists')}
            >
              Back to Artists
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="border-zinc-800"
            onClick={() => router.push('/artists')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{artist.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {artist.genre && (
                <Badge variant="outline" className="border-violet-600/50 text-violet-400">
                  <Music className="h-3 w-3 mr-1" />
                  {artist.genre}
                </Badge>
              )}
              {artist.city && (
                <span className="text-zinc-400 text-sm flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {artist.city}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link href={`/artists/${artist.id}/edit`}>
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {artist.bio && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Biography</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-300 whitespace-pre-wrap">{artist.bio}</p>
              </CardContent>
            </Card>
          )}

          {artist.promo_pack_url && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Promo Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={artist.promo_pack_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-violet-400 hover:text-violet-300"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Promo Pack
                </a>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {artist.fee !== null && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Booking Fee</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-violet-400">
                  €{artist.fee.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {artist.contact_email && (
                <a
                  href={`mailto:${artist.contact_email}`}
                  className="flex items-center text-zinc-300 hover:text-white"
                >
                  <Mail className="h-4 w-4 mr-2 text-zinc-400" />
                  {artist.contact_email}
                </a>
              )}
              {artist.contact_phone && (
                <a
                  href={`tel:${artist.contact_phone}`}
                  className="flex items-center text-zinc-300 hover:text-white"
                >
                  <Phone className="h-4 w-4 mr-2 text-zinc-400" />
                  {artist.contact_phone}
                </a>
              )}
              {!artist.contact_email && !artist.contact_phone && (
                <p className="text-zinc-400 text-sm">No contact information</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
