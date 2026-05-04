"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/page-skeleton";
import { Plus, MapPin, Music, Search } from "lucide-react";
import { SearchFilterBar } from "@/components/search-filter-bar";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

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
  "Techno",
  "House",
  "Drum & Bass",
  "Trance",
  "Hard Techno",
  "Minimal",
  "Tech House",
  "Progressive",
  "Electro",
  "Dubstep",
];

export function ArtistList() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [filterGenre, setFilterGenre] = useState<string>("");
  const [filterCity, setFilterCity] = useState("");
  const [total, setTotal] = useState(0);

  const fetchArtists = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchName) params.append("name", searchName);
      if (filterGenre) params.append("genre", filterGenre);
      if (filterCity) params.append("city", filterCity);

      const response = await fetch(`/api/artists?${params.toString()}`);
      const data: ArtistListResponse = await response.json();
      setArtists(data.artists || []);
      setTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch artists:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, [searchName, filterGenre, filterCity]);

  const clearFilters = () => {
    setSearchName("");
    setFilterGenre("");
    setFilterCity("");
    setArtists([]);
    fetchArtists();
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <SearchFilterBar
              placeholder="Search artists..."
              searchValue={searchName}
              onSearchChange={setSearchName}
              filters={[
                {
                  key: "genre",
                  label: "Genre",
                  options: GENRES.map((genre) => ({
                    value: genre.toLowerCase(),
                    label: genre,
                  })),
                  value: filterGenre,
                  onChange: setFilterGenre,
                },
              ]}
            />
            <div className="flex gap-3">
              <div className="flex-1 md:max-w-[200px]">
                <input
                  placeholder="City"
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-md placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-600/50"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="border-zinc-700"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section header + count */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-600/20 rounded-md">
            <Music className="h-4 w-4 text-violet-400" />
          </div>
          <p className="text-sm text-zinc-400">
            {loading ? "Loading..." : `${total} artists found`}
          </p>
        </div>
        <Link href="/artists/new">
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Artist
          </Button>
        </Link>
      </div>

      {loading ? (
        <PageSkeleton rows={6} />
      ) : artists.length === 0 ? (
        <EmptyState
          icon={Music}
          title="Keine Künstler gefunden"
          description="Füge deinen ersten Künstler hinzu"
          actionLabel="Künstler hinzufügen"
          actionHref="/artists/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {artists.map((artist) => (
            <Card
              key={artist.id}
              className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 hover:border-violet-600/50 transition-all rounded-lg"
            >
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-white">
                      {artist.name}
                    </h3>
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
              <CardFooter className="border-t border-zinc-800/70">
                <div className="flex gap-2 w-full">
                  <Link href={`/artists/${artist.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full border-zinc-700"
                    >
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
