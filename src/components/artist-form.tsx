'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const artistSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  city: z.string().optional(),
  fee: z.number().min(0).optional(),
  genre: z.string().optional(),
  bio: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  promo_pack_url: z.string().url('Invalid URL').optional().or(z.literal('')),
});

type ArtistFormValues = z.infer<typeof artistSchema>;

interface ArtistFormProps {
  artist?: {
    id: string;
    name: string;
    city: string | null;
    fee: number | null;
    genre: string | null;
    bio: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    promo_pack_url: string | null;
  };
  mode?: 'create' | 'edit';
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
  'Other',
];

export function ArtistForm({ artist, mode = 'create' }: ArtistFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ArtistFormValues>({
    resolver: zodResolver(artistSchema),
    defaultValues: {
      name: artist?.name || '',
      city: artist?.city || '',
      fee: artist?.fee || undefined,
      genre: artist?.genre || '',
      bio: artist?.bio || '',
      contact_email: artist?.contact_email || '',
      contact_phone: artist?.contact_phone || '',
      promo_pack_url: artist?.promo_pack_url || '',
    },
  });

  const onSubmit = async (values: ArtistFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const url = mode === 'create' 
        ? '/api/artists' 
        : `/api/artists/${artist?.id}`;
      
      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          fee: values.fee ? Number(values.fee) : null,
          documents: {},
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save artist');
      }

      router.push('/artists');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">
          {mode === 'create' ? 'Add New Artist' : 'Edit Artist'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Artist/DJ name"
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                          <SelectValue placeholder="Select genre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {GENRES.map((genre) => (
                          <SelectItem key={genre} value={genre.toLowerCase()}>
                            {genre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Berlin, Munich, etc."
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee (€)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="500"
                        className="bg-zinc-950 border-zinc-800"
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <Description>Booking fee in EUR</Description>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="booking@example.com"
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+49 123 456789"
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="promo_pack_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promo Pack URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://..."
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </FormControl>
                    <Description>Link to promo materials, EPK, etc.</Description>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biography</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Artist biography..."
                        className="bg-zinc-950 border-zinc-800 min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex gap-4">
              <Button
                type="submit"
                className="bg-violet-600 hover:bg-violet-700"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Create Artist' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="border-zinc-800"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function Description({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-400">{children}</p>;
}