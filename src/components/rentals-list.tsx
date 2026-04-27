'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Package, ArrowLeftFromLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RentalForm, type RentalFormValues } from '@/components/rental-form';
import { createClient } from '@/lib/supabase/browser';

interface RentalItem {
  id: string;
  name: string;
  category: string;
}

interface Rental {
  id: string;
  item_id: string;
  rented_to: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  rental_date: string;
  expected_return: string;
  actual_return: string | null;
  notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  items: RentalItem | null;
}

interface RentalsResponse {
  rentals: Rental[];
}

export function RentalsList() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/rentals');
      const data: RentalsResponse = await response.json();
      setRentals(data.rentals || []);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  const activeRentals = rentals.filter((r) => r.status === 'active');
  const pastRentals = rentals.filter((r) => r.status === 'returned');

  const today = new Date().toISOString().split('T')[0];

  const isOverdue = (rental: Rental) => {
    return rental.expected_return < today && rental.status === 'active';
  };

  const handleCreate = async (values: RentalFormValues) => {
    const response = await fetch('/api/rentals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create rental');
    }

    setShowCreateDialog(false);
    fetchRentals();
  };

  const handleReturn = async (rental: Rental) => {
    setReturningId(rental.id);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const response = await fetch(`/api/rentals/${rental.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returned_by: user?.id,
          return_location: 'Main Storage',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to return rental:', data.error);
      }

      fetchRentals();
    } catch (error) {
      console.error('Error returning rental:', error);
    } finally {
      setReturningId(null);
    }
  };

  const renderTable = (rentalsList: Rental[], isActive: boolean) => (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-zinc-400">Item</TableHead>
          <TableHead className="text-zinc-400">Rented To</TableHead>
          <TableHead className="text-zinc-400">Rental Date</TableHead>
          <TableHead className="text-zinc-400">
            {isActive ? 'Expected Return' : 'Return Date'}
          </TableHead>
          <TableHead className="text-zinc-400">Status</TableHead>
          {isActive && <TableHead className="text-zinc-400">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rentalsList.map((rental) => {
          const overdue = isOverdue(rental);
          return (
            <TableRow
              key={rental.id}
              className={cn(
                "border-zinc-800",
                overdue && "bg-red-900/10"
              )}
            >
              <TableCell className="font-medium text-white">
                {rental.items?.name || 'Unknown Item'}
              </TableCell>
              <TableCell className="text-zinc-400">{rental.rented_to}</TableCell>
              <TableCell className="text-zinc-400">
                {new Date(rental.rental_date).toLocaleDateString()}
              </TableCell>
              <TableCell className={cn(
                "text-zinc-400",
                overdue && "text-red-400 font-medium"
              )}>
                {isActive
                  ? new Date(rental.expected_return).toLocaleDateString()
                  : rental.actual_return
                    ? new Date(rental.actual_return).toLocaleDateString()
                    : '-'
                }
              </TableCell>
              <TableCell>
                {overdue ? (
                  <Badge variant="outline" className="border-red-600/50 text-red-400 bg-red-600/10">
                    ⚠ Overdue
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={cn(
                      isActive
                        ? "border-blue-600/50 text-blue-400 bg-blue-600/10"
                        : "border-green-600/50 text-green-400 bg-green-600/10"
                    )}
                  >
                    {isActive ? 'Active' : 'Returned'}
                  </Badge>
                )}
              </TableCell>
              {isActive && (
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:text-white"
                    onClick={() => handleReturn(rental)}
                    disabled={returningId === rental.id}
                  >
                    <ArrowLeftFromLine className="h-3 w-3 mr-1" />
                    {returningId === rental.id ? 'Returning...' : 'Mark Returned'}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Rentals</h1>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Rental
        </Button>
      </div>

      {/* Tabs */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <Tabs defaultValue="active">
            <TabsList className="bg-zinc-800 border-zinc-700">
              <TabsTrigger value="active" className="data-[state=active]:bg-zinc-900">
                Active ({activeRentals.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="data-[state=active]:bg-zinc-900">
                Past ({pastRentals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-zinc-400">
                  {loading ? 'Loading...' : `${activeRentals.length} active rentals`}
                </p>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full bg-zinc-800" />
                  ))}
                </div>
              ) : activeRentals.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
                  <p className="text-zinc-400">No active rentals</p>
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="mt-4 bg-violet-600 hover:bg-violet-700"
                  >
                    Create your first rental
                  </Button>
                </div>
              ) : (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-0">
                    {renderTable(activeRentals, true)}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-zinc-400">
                  {loading ? 'Loading...' : `${pastRentals.length} past rentals`}
                </p>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full bg-zinc-800" />
                  ))}
                </div>
              ) : pastRentals.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
                  <p className="text-zinc-400">No past rentals</p>
                </div>
              ) : (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-0">
                    {renderTable(pastRentals, false)}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Rental</DialogTitle>
          </DialogHeader>
          <RentalForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
