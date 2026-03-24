'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RunningOrder } from '@/components/running-order';
import { format } from 'date-fns';
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  Users, 
  Edit,
  Download,
  Share2,
  Trash2
} from 'lucide-react';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  date: string;
  door_time: string | null;
  end_time: string | null;
  status: string;
  max_capacity: number | null;
  venues: {
    name: string;
    address: string;
    capacity: number;
  } | null;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events/${eventId}`);
      const data = await response.json();
      setEvent(data);
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadItinerary = async () => {
    try {
      const response = await fetch(`/api/itinerary/${eventId}?format=pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `itinerary_${eventId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download itinerary:', error);
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
      router.push('/events');
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-600';
      case 'draft':
        return 'bg-yellow-600';
      case 'cancelled':
        return 'bg-red-600';
      case 'completed':
        return 'bg-zinc-600';
      default:
        return 'bg-violet-600';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/2 bg-zinc-800 rounded" />
          <div className="h-4 w-1/4 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <p className="text-zinc-400">Event not found</p>
            <Link href="/events">
              <Button className="mt-4 bg-violet-600 hover:bg-violet-700">
                Back to Events
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{event.name}</h1>
            <Badge className={getStatusColor(event.status)}>
              {event.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-zinc-400">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <span>{format(new Date(event.date), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            {event.venues && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{event.venues.name}</span>
              </div>
            )}
            {event.door_time && event.end_time && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{event.door_time} - {event.end_time}</span>
              </div>
            )}
            {event.max_capacity && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>Max {event.max_capacity}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadItinerary}
            className="border-zinc-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Itinerary PDF
          </Button>
          <Button
            variant="outline"
            className="border-zinc-800"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Link href={`/events/${eventId}/edit`}>
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            onClick={handleDeleteEvent}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Venue info */}
      {event.venues && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Venue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-violet-400" />
              <div>
                <p className="font-medium">{event.venues.name}</p>
                <p className="text-sm text-zinc-400">{event.venues.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Running Order */}
      <RunningOrder eventId={eventId} />

      {/* Add Performance Modal placeholder */}
      {/* TODO: Implement modal for adding performance */}
    </div>
  );
}