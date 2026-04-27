'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface HistoryEntry {
  id: string;
  task_id: string;
  changed_by_profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  from_status: string | null;
  to_status: string | null;
  change_type: string;
  reason: string | null;
  created_at: string;
}

interface TaskHistoryTimelineProps {
  taskId: string;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getActionDescription(entry: HistoryEntry): string {
  const { change_type, from_status, to_status, reason } = entry;

  switch (change_type) {
    case 'created':
      return 'created the task';
    case 'status_change':
      return `moved from ${from_status?.replace(/_/g, ' ') ?? 'unknown'} to ${to_status?.replace(/_/g, ' ') ?? 'unknown'}`;
    case 'approved':
      return 'approved the task';
    case 'rejected':
      return `rejected: ${reason ?? 'no reason provided'}`;
    case 'blocked':
      return `blocked: ${reason ?? 'no reason provided'}`;
    case 'unblocked':
      return 'unblocked the task';
    case 'edited':
      return `edited: ${reason ?? 'no reason provided'}`;
    default:
      return change_type.replace(/_/g, ' ');
  }
}

function getDotColor(change_type: string): string {
  switch (change_type) {
    case 'approved':
      return 'bg-green-500 border-green-500';
    case 'rejected':
    case 'blocked':
      return 'bg-red-500 border-red-500';
    case 'unblocked':
      return 'bg-emerald-500 border-emerald-500';
    case 'created':
      return 'bg-violet-500 border-violet-500';
    case 'edited':
      return 'bg-blue-500 border-blue-500';
    case 'status_change':
      return 'bg-amber-500 border-amber-500';
    default:
      return 'bg-zinc-500 border-zinc-500';
  }
}

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function TaskHistoryTimeline({ taskId }: TaskHistoryTimelineProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const response = await fetch(`/api/tasks/${taskId}/history`);
        const data = await response.json();
        setHistory(data.history || []);
      } catch (error) {
        console.error('Failed to fetch task history:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [taskId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="text-sm text-zinc-500 text-center py-4">No history yet</p>
    );
  }

  return (
    <div className="relative pl-8 space-y-0">
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-zinc-700" />
      {history.map((entry) => (
        <div key={entry.id} className="relative pb-4 last:pb-0">
          <div
            className={cn(
              'absolute -left-[21px] top-1.5 h-3 w-3 rounded-full border-2',
              getDotColor(entry.change_type)
            )}
          />
          <div className="flex items-start gap-3">
            <Avatar className="h-7 w-7 mt-0.5 shrink-0">
              <AvatarImage src={entry.changed_by_profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-zinc-800 text-zinc-300 text-[10px]">
                {getInitials(entry.changed_by_profile?.full_name || null)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm text-zinc-300">
                <span className="font-medium text-zinc-200">
                  {entry.changed_by_profile?.full_name || 'Unknown'}
                </span>
                {' '}
                {getActionDescription(entry)}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {formatRelativeTime(entry.created_at)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
