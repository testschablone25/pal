'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, TrendingUp, Percent, RefreshCw, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface OccupancyData {
  event: {
    id: string;
    name: string;
    date: string;
    max_capacity: number;
    status: string;
  };
  current: number;
  max: number;
  percentage: number;
  by_category: {
    presale: number;
    guestlist: number;
    walkin: number;
  };
  total_entries: number;
  door_stats: {
    entries_tonight: number;
    by_category: {
      presale: number;
      guestlist: number;
      walkin: number;
    };
  };
}

interface CapacityDashboardProps {
  eventId: string;
  refreshInterval?: number; // in milliseconds, default 10000
}

export function CapacityDashboard({ eventId, refreshInterval = 10000 }: CapacityDashboardProps) {
  const [data, setData] = useState<OccupancyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOccupancy = useCallback(async () => {
    try {
      const response = await fetch(`/api/occupancy/${eventId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch occupancy');
      }

      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    // Initial fetch
    fetchOccupancy();

    // Set up polling
    const interval = setInterval(fetchOccupancy, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchOccupancy, refreshInterval]);

  if (isLoading && !data) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
            <span className="ml-2 text-zinc-400">Loading occupancy data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="text-red-400">
            <p>Error loading occupancy: {error}</p>
            <button 
              onClick={fetchOccupancy}
              className="mt-2 text-sm underline"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { event, current, max, percentage, by_category } = data;

  // Determine status color based on capacity
  const getStatusColor = () => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{event.name}</h2>
          <p className="text-zinc-400 text-sm">{new Date(event.date).toLocaleDateString('de-DE', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Clock className="w-4 h-4" />
          <span className="text-xs">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Updating...'}
          </span>
        </div>
      </div>

      {/* Main occupancy card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-zinc-300 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Current Occupancy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className={`text-5xl font-bold ${getStatusColor()}`}>
                {current}
              </p>
              <p className="text-zinc-400 text-sm">/ {max} guests</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${getStatusColor()}`}>
                {percentage}%
              </p>
              <p className="text-zinc-400 text-xs">capacity</p>
            </div>
          </div>
          
          <Progress 
            value={percentage} 
            className={`h-3 ${
              percentage >= 90 ? '[&>div]:bg-red-500' :
              percentage >= 70 ? '[&>div]:bg-yellow-500' : 
              '[&>div]:bg-green-500'
            }`}
          />
        </CardContent>
      </Card>

      {/* Stats by category */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                Presale
              </Badge>
            </div>
            <p className="text-2xl font-bold text-white">{by_category.presale}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-purple-500 text-purple-400">
                Guestlist
              </Badge>
            </div>
            <p className="text-2xl font-bold text-white">{by_category.guestlist}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-orange-500 text-orange-400">
                Walk-in
              </Badge>
            </div>
            <p className="text-2xl font-bold text-white">{by_category.walkin}</p>
          </CardContent>
        </Card>
      </div>

      {/* Door stats */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-zinc-300 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Door Stats Tonight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-400 text-sm">Total Entries</p>
              <p className="text-xl font-bold text-white">{data.total_entries}</p>
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Status</p>
              <Badge className={
                event.status === 'published' ? 'bg-green-500' :
                event.status === 'cancelled' ? 'bg-red-500' :
                'bg-zinc-500'
              }>
                {event.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
