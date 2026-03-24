'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Ticket, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/browser';

const guestEntrySchema = z.object({
  guest_name: z.string().min(2, 'Name must be at least 2 characters'),
  guest_email: z.string().email('Invalid email').optional().or(z.literal('')),
  guest_phone: z.string().optional(),
  category: z.enum(['presale', 'guestlist', 'walkin']),
  plus_ones: z.number().min(0).max(10),
}).transform(data => ({ ...data, plus_ones: data.plus_ones ?? 0 }));

type GuestEntryFormData = z.infer<typeof guestEntrySchema>;

interface GuestEntryFormProps {
  guestListId: string;
  onSuccess?: (entry: any) => void;
  onError?: (error: string) => void;
}

export function GuestEntryForm({ guestListId, onSuccess, onError }: GuestEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<GuestEntryFormData>({
    resolver: zodResolver(guestEntrySchema),
    defaultValues: {
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      category: 'walkin',
      plus_ones: 0,
    },
  });

  const onSubmit = async (data: GuestEntryFormData) => {
    setIsSubmitting(true);
    setQrCode(null);

    try {
      const response = await fetch(`/api/guest-lists/${guestListId}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add guest');
      }

      // Generate QR code for the entry
      if (result.data?.qr_token) {
        const qrResponse = await fetch('/api/generate-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: result.data.qr_token }),
        });
        
        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          setQrCode(qrData.dataUrl);
        }
      }

      onSuccess?.(result.data);
      form.reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <UserPlus className="w-5 h-5" />
          Add Guest Entry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="guest_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Guest Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter guest name"
                      {...field}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guest_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="guest@example.com"
                        {...field}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guest_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Phone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+49 123 456789"
                        {...field}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="presale" className="text-white">Presale</SelectItem>
                        <SelectItem value="guestlist" className="text-white">Guestlist</SelectItem>
                        <SelectItem value="walkin" className="text-white">Walk-in</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plus_ones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Plus Ones</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        {...field}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding Guest...
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" />
                  Add to Guest List
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* QR Code display for walk-ins */}
        {qrCode && (
          <div className="mt-6 p-4 bg-white rounded-lg">
            <p className="text-center text-black font-medium mb-2">Walk-in QR Code</p>
            <img src={qrCode} alt="Guest QR Code" className="w-full max-w-[200px] mx-auto" />
            <p className="text-center text-black text-sm mt-2">
              Give this to the guest for check-out
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
