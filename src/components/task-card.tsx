'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GripVertical, MessageSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  event_id: string | null;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  event?: {
    id: string;
    name: string;
    date: string;
  } | null;
  comment_count?: number;
}

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const priorityConfig = {
  low: {
    label: 'Low',
    className: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/50',
  },
  medium: {
    label: 'Medium',
    className: 'bg-blue-600/20 text-blue-400 border-blue-600/50',
  },
  high: {
    label: 'High',
    className: 'bg-orange-600/20 text-orange-400 border-orange-600/50',
  },
  urgent: {
    label: 'Urgent',
    className: 'bg-red-600/20 text-red-400 border-red-600/50',
  },
};

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-zinc-900 border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors',
        isDragging && 'opacity-50 shadow-lg shadow-violet-500/20'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <button
            className="mt-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h4 className="text-sm font-medium text-white truncate mb-2">
              {task.title}
            </h4>

            {/* Priority Badge */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn('text-xs', priority.className)}>
                {priority.label}
              </Badge>
              {task.event && (
                <Badge variant="outline" className="bg-violet-600/20 text-violet-400 border-violet-600/50 text-xs">
                  {task.event.name}
                </Badge>
              )}
            </div>

            {/* Bottom Row: Assignee + Comment Count */}
            <div className="flex items-center justify-between">
              {/* Assignee Avatar */}
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.avatar_url || undefined} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                      {getInitials(task.assignee.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-zinc-400 truncate max-w-[100px]">
                    {task.assignee.full_name || 'Unknown'}
                  </span>
                </div>
              ) : (
                <div className="h-6" />
              )}

              {/* Comment Count */}
              {task.comment_count !== undefined && task.comment_count > 0 && (
                <div className="flex items-center gap-1 text-zinc-500">
                  <MessageSquare className="h-3 w-3" />
                  <span className="text-xs">{task.comment_count}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
