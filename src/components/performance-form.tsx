'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

const performanceSchema = z.object({
  artist_id: z.string().min(1, 'Artist is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  stage: z.string().min(1, 'Stage is required'),
});

type PerformanceFormValues = z.input<typeof performanceSchema>;

interface Artist {
  id: string;
  name: string;
  genre: string | null;
  city: string | null;
}

interface PerformanceFormProps {
  eventId: string;
  onSuccess?: (performance: any) => void;
  onError?: (error: string) => void;
  initialData?: Partial<PerformanceFormValues>;
  performanceId?: string;
}

export function PerformanceForm({
  eventId,
  onSuccess,
  onError,
  initialData,
  performanceId,
}: PerformanceFormProps) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingArtists, setFetchingArtists] = useState(true);

  const form = useForm<PerformanceFormValues>({
    resolver: zodResolver(performanceSchema),
    defaultValues: {
      artist_id: initialData?.artist_id || '',
      start_time: initialData?.start_time || '22:00',
      end_time: initialData?.end_time || '23:00',
      stage: initialData?.stage || 'main',
    },
  });

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const response = await fetch('/api/artists');
      const data = await response.json();
      setArtists(data.artists || []);
    } catch (error) {
      console.error('Failed to fetch artists:', error);
    } finally {
      setFetchingArtists(false);
    }
  };

  const onSubmit = async (values: PerformanceFormValues) => {
    setLoading(true);
    try {
      const url = performanceId
        ? `/api/performances/${performanceId}`
        : '/api/performances';
      const method = performanceId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          event_id: eventId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save performance');
      }

      onSuccess?.(data);
      form.reset();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="artist_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Artist</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={fetchingArtists}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700">
                    <SelectValue placeholder="Select an artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.name}
                        {artist.genre && ` (${artist.genre})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                    className="bg-zinc-900 border-zinc-700"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                    className="bg-zinc-900 border-zinc-700"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="stage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stage</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Stage</SelectItem>
                    <SelectItem value="second">Second Stage</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                    <SelectItem value="vip">VIP Area</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full bg-violet-600 hover:bg-violet-700"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {performanceId ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            performanceId ? 'Update Performance' : 'Add Performance'
          )}
        </Button>
      </form>
    </Form>
  );
}
