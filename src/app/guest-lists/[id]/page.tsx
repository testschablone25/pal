'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Mail, Phone, User } from 'lucide-react';

interface GuestEntry {
  id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  category: 'presale' | 'guestlist' | 'walkin';
  plus_ones: number;
  status: 'pending' | 'checked_in' | 'cancelled';
  qr_token: string | null;
  created_at: string;
}

interface GuestList {
  id: string;
  name: string;
  event: {
    id: string;
    name: string;
    date: string;
    max_capacity: number | null;
  } | null;
}

export default function GuestListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [guestList, setGuestList] = useState<GuestList | null>(null);
  const [entries, setEntries] = useState<GuestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Add guest form state
  const [newGuest, setNewGuest] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    category: 'guestlist' as 'presale' | 'guestlist' | 'walkin',
    plus_ones: 0,
  });
  const [addingGuest, setAddingGuest] = useState(false);

  useEffect(() => {
    fetchGuestList();
    fetchEntries();
  }, [params.id]);

  const fetchGuestList = async () => {
    try {
      const response = await fetch('/api/guest-lists');
      if (!response.ok) throw new Error('Failed to fetch guest lists');
      const data = await response.json();
      const list = data.data?.find((l: GuestList) => l.id === params.id);
      if (list) {
        setGuestList(list);
      } else {
        setError('Guest list not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guest list');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async () => {
    try {
      const response = await fetch(`/api/guest-lists/${params.id}/entries`);
      if (!response.ok) throw new Error('Failed to fetch entries');
      const data = await response.json();
      setEntries(data.data || []);
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingGuest(true);

    try {
      const response = await fetch(`/api/guest-lists/${params.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGuest),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add guest');
      }

      setNewGuest({
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        category: 'guestlist',
        plus_ones: 0,
      });
      setShowAddDialog(false);
      fetchEntries();
    } catch (err) {
      console.error('Failed to add guest:', err);
    } finally {
      setAddingGuest(false);
    }
  };

  const handleDeleteGuest = async (entryId: string) => {
    if (!confirm('Are you sure you want to remove this guest?')) return;

    try {
      const response = await fetch(
        `/api/guest-lists/${params.id}/entries?entry_id=${entryId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete guest');
      }

      fetchEntries();
    } catch (err) {
      console.error('Failed to delete guest:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-600/50 text-yellow-400">Pending</Badge>;
      case 'checked_in':
        return <Badge variant="outline" className="border-green-600/50 text-green-400">Checked In</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-red-600/50 text-red-400">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'presale':
        return <Badge className="bg-violet-600">Presale</Badge>;
      case 'guestlist':
        return <Badge className="bg-blue-600">Guestlist</Badge>;
      case 'walkin':
        return <Badge className="bg-zinc-600">Walk-in</Badge>;
      default:
        return <Badge>{category}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10 bg-zinc-800" />
          <Skeleton className="h-10 w-64 bg-zinc-800" />
        </div>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full bg-zinc-800" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !guestList) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <p className="text-red-400">{error || 'Guest list not found'}</p>
            <Button
              variant="outline"
              className="mt-4 border-zinc-800"
              onClick={() => router.push('/guest-lists')}
            >
              Back to Guest Lists
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
            onClick={() => router.push('/guest-lists')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{guestList.name}</h1>
            {guestList.event && (
              <p className="text-zinc-400 mt-1">
                {guestList.event.name} - {new Date(guestList.event.date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Guest
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">Add Guest to List</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddGuest} className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Name *</label>
                <Input
                  value={newGuest.guest_name}
                  onChange={(e) => setNewGuest({ ...newGuest, guest_name: e.target.value })}
                  placeholder="Guest name"
                  className="bg-zinc-950 border-zinc-800"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Email</label>
                <Input
                  type="email"
                  value={newGuest.guest_email}
                  onChange={(e) => setNewGuest({ ...newGuest, guest_email: e.target.value })}
                  placeholder="guest@example.com"
                  className="bg-zinc-950 border-zinc-800"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Phone</label>
                <Input
                  value={newGuest.guest_phone}
                  onChange={(e) => setNewGuest({ ...newGuest, guest_phone: e.target.value })}
                  placeholder="+49 123 456789"
                  className="bg-zinc-950 border-zinc-800"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Category *</label>
                <Select
                  value={newGuest.category}
                  onValueChange={(v) => setNewGuest({ ...newGuest, category: v as 'presale' | 'guestlist' | 'walkin' })}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="presale">Presale</SelectItem>
                    <SelectItem value="guestlist">Guestlist</SelectItem>
                    <SelectItem value="walkin">Walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Plus Ones</label>
                <Input
                  type="number"
                  min={0}
                  value={newGuest.plus_ones}
                  onChange={(e) => setNewGuest({ ...newGuest, plus_ones: parseInt(e.target.value) || 0 })}
                  className="bg-zinc-950 border-zinc-800"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={addingGuest}>
                  {addingGuest ? 'Adding...' : 'Add Guest'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  className="border-zinc-800"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-zinc-400">Total Guests</p>
            <p className="text-2xl font-bold text-white">{entries.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-zinc-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">
              {entries.filter((e) => e.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-zinc-400">Checked In</p>
            <p className="text-2xl font-bold text-green-400">
              {entries.filter((e) => e.status === 'checked_in').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-zinc-400">With Plus Ones</p>
            <p className="text-2xl font-bold text-blue-400">
              {entries.reduce((sum, e) => sum + e.plus_ones, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Guest Entries Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Guest Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
              <p className="text-zinc-400">No guests on this list yet</p>
              <Button
                className="mt-4 bg-violet-600 hover:bg-violet-700"
                onClick={() => setShowAddDialog(true)}
              >
                Add your first guest
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Contact</TableHead>
                  <TableHead className="text-zinc-400">Category</TableHead>
                  <TableHead className="text-zinc-400">+1</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className="border-zinc-800">
                    <TableCell className="text-white font-medium">
                      {entry.guest_name}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {entry.guest_email && (
                          <div className="flex items-center text-sm text-zinc-400">
                            <Mail className="h-3 w-3 mr-1" />
                            {entry.guest_email}
                          </div>
                        )}
                        {entry.guest_phone && (
                          <div className="flex items-center text-sm text-zinc-400">
                            <Phone className="h-3 w-3 mr-1" />
                            {entry.guest_phone}
                          </div>
                        )}
                        {!entry.guest_email && !entry.guest_phone && (
                          <span className="text-zinc-500 text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryBadge(entry.category)}</TableCell>
                    <TableCell className="text-zinc-300">{entry.plus_ones}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell>
                      {entry.status !== 'checked_in' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          onClick={() => handleDeleteGuest(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
