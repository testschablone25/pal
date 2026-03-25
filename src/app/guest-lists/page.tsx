'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Users, Calendar, List } from 'lucide-react';
import Link from 'next/link';

interface GuestList {
  id: string;
  name: string;
  event_id: string;
  created_at: string;
  event: {
    id: string;
    name: string;
    date: string;
    max_capacity: number | null;
  } | null;
  entries: {
    id: string;
    status: string;
  }[];
}

export default function GuestListsPage() {
  const [guestLists, setGuestLists] = useState<GuestList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListEventId, setNewListEventId] = useState('');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchGuestLists();
    fetchEvents();
  }, []);

  const fetchGuestLists = async () => {
    try {
      const response = await fetch('/api/guest-lists');
      if (!response.ok) throw new Error('Failed to fetch guest lists');
      const data = await response.json();
      setGuestLists(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guest lists');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName || !newListEventId) return;

    try {
      const response = await fetch('/api/guest-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName, event_id: newListEventId }),
      });

      if (!response.ok) throw new Error('Failed to create guest list');

      setNewListName('');
      setNewListEventId('');
      setShowCreateForm(false);
      fetchGuestLists();
    } catch (err) {
      console.error('Failed to create guest list:', err);
    }
  };

  const getStatusCounts = (entries: { status: string }[]) => {
    const counts = {
      pending: 0,
      checked_in: 0,
      cancelled: 0,
    };
    entries.forEach((entry) => {
      if (entry.status in counts) {
        counts[entry.status as keyof typeof counts]++;
      }
    });
    return counts;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 bg-zinc-800" />
          <Skeleton className="h-5 w-96 mt-2 bg-zinc-800" />
        </div>
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
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Guest Lists</h1>
        <p className="text-zinc-400 mt-2">
          Manage guest lists and entries for your events
        </p>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Create New Guest List</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">List Name</label>
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., VIP, Press, Team"
                  className="bg-zinc-950 border-zinc-800"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Event</label>
                <select
                  value={newListEventId}
                  onChange={(e) => setNewListEventId(e.target.value)}
                  className="w-full bg-zinc-950 border-zinc-800 rounded-md p-2 text-white"
                  required
                >
                  <option value="">Select an event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
                  Create List
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="border-zinc-800"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-zinc-400">
          {loading ? 'Loading...' : `${guestLists.length} guest lists`}
        </p>
        <Button
          className="bg-violet-600 hover:bg-violet-700"
          onClick={() => setShowCreateForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Guest List
        </Button>
      </div>

      {/* Guest Lists Grid */}
      {guestLists.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <List className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">No guest lists yet</p>
            <Button
              className="mt-4 bg-violet-600 hover:bg-violet-700"
              onClick={() => setShowCreateForm(true)}
            >
              Create your first guest list
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guestLists.map((list) => {
            const counts = getStatusCounts(list.entries || []);
            return (
              <Link key={list.id} href={`/guest-lists/${list.id}`}>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-violet-600/50 transition-colors cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-white">{list.name}</h3>
                      {list.event && (
                        <div className="flex items-center text-sm text-zinc-400">
                          <Calendar className="h-4 w-4 mr-1" />
                          {list.event.name}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center text-zinc-300">
                          <Users className="h-4 w-4 mr-1" />
                          {list.entries?.length || 0} guests
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="border-yellow-600/50 text-yellow-400">
                          {counts.pending} pending
                        </Badge>
                        <Badge variant="outline" className="border-green-600/50 text-green-400">
                          {counts.checked_in} checked in
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
