'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, MapPin, Music } from 'lucide-react';
import Link from 'next/link';

interface Artist {
  id: string;
  name: string;
  city: string | null;
  fee: number | null;
  genre: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

interface ArtistListResponse {
  artists: Artist[];
  total: number;
  limit: number;
  offset: number;
}

const GENRES = [
  'Techno',
  'House',
  'Drum & Bass',
  'Trance',
  'Hard Techno',
  'Minimal',
  'Tech House',
  'Progressive',
  'Electro',
  'Dubstep',
];

export function ArtistList() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [filterGenre, setFilterGenre] = useState<string>('');
  const [filterCity, setFilterCity] = useState('');
  const [total, setTotal] = useState(0);

  const fetchArtists = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchName) params.append('name', searchName);
      if (filterGenre) params.append('genre', filterGenre);
      if (filterCity) params.append('city', filterCity);

      const response = await fetch(`/api/artists?${params.toString()}`);
      const data: ArtistListResponse = await response.json();
      setArtists(data.artists || []);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch artists:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArtists();
  };

  const clearFilters = () => {
    setSearchName('');
    setFilterGenre('');
    setFilterCity('');
    setArtists([]);
    fetchArtists();
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Search artists..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-10 bg-zinc-950 border-zinc-800"
                />
              </div>
              <Select value={filterGenre} onValueChange={setFilterGenre}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre.toLowerCase()}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="City"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="bg-zinc-950 border-zinc-800"
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700">
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="border-zinc-800"
                >
                  Clear
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Artist Grid */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-400">
          {loading ? 'Loading...' : `${total} artists found`}
        </p>
        <Link href="/artists/new">
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Artist
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-6 w-3/4 bg-zinc-800" />
                <Skeleton className="h-4 w-1/2 bg-zinc-800" />
                <Skeleton className="h-4 w-1/3 bg-zinc-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : artists.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Music className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">No artists found</p>
            <Link href="/artists/new">
              <Button className="mt-4 bg-violet-600 hover:bg-violet-700">
                Add your first artist
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {artists.map((artist) => (
            <Card
              key={artist.id}
              className="bg-zinc-900 border-zinc-800 hover:border-violet-600/50 transition-colors"
            >
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold">{artist.name}</h3>
                    {artist.fee && (
                      <span className="text-violet-400 font-medium">
                        €{artist.fee.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {artist.genre && (
                    <Badge
                      variant="outline"
                      className="border-violet-600/50 text-violet-400"
                    >
                      {artist.genre}
                    </Badge>
                  )}
                  {artist.city && (
                    <div className="flex items-center text-sm text-zinc-400">
                      <MapPin className="h-4 w-4 mr-1" />
                      {artist.city}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t border-zinc-800">
                <div className="flex gap-2 w-full">
                  <Link href={`/artists/${artist.id}`} className="flex-1">
                    <Button variant="outline" className="w-full border-zinc-800">
                      View
                    </Button>
                  </Link>
                  <Link href={`/artists/${artist.id}/edit`} className="flex-1">
                    <Button className="w-full bg-violet-600 hover:bg-violet-700">
                      Edit
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}