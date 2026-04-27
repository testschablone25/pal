'use client';

import { useState, useEffect } from 'react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

const rentalSchema = z.object({
  item_id: z.string().min(1, 'Item is required'),
  rented_to: z.string().min(1, 'Club/company name is required'),
  contact_person: z.string().optional().default(''),
  contact_phone: z.string().optional().default(''),
  contact_email: z.string().optional().default(''),
  rental_date: z.string().min(1, 'Rental date is required'),
  expected_return: z.string().min(1, 'Expected return date is required'),
  notes: z.string().optional().default(''),
});

export type RentalFormValues = z.infer<typeof rentalSchema>;

interface Item {
  id: string;
  name: string;
  category: string;
}

interface RentalFormProps {
  onSubmit: (values: RentalFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function RentalForm({ onSubmit, onCancel }: RentalFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const form = useForm<RentalFormValues>({
    resolver: zodResolver(rentalSchema),
    defaultValues: {
      item_id: '',
      rented_to: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      rental_date: new Date().toISOString().split('T')[0],
      expected_return: '',
      notes: '',
    },
  });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/items');
        const data = await response.json();
        setItems(data.items || []);
      } catch (err) {
        console.error('Failed to fetch items:', err);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, []);

  const handleSubmit = async (values: RentalFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        ...values,
        created_by: user?.id,
      };
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">New Rental</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="item_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                          <SelectValue placeholder={loadingItems ? 'Loading items...' : 'Select item'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.category})
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
                name="rented_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rented To *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Club or company name"
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Contact name"
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
                        placeholder="+1 (555) 123-4567"
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </FormControl>
                    <FormMessage />
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
                        placeholder="contact@example.com"
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rental_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rental Date *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_return"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Return *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Additional notes..."
                          className="bg-zinc-950 border-zinc-800"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                Create Rental
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="border-zinc-800"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
