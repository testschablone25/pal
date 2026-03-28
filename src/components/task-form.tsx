'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['needs_refining', 'todo', 'in_progress', 'review', 'done', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignee_id: z.string().optional(),
  event_id: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Event {
  id: string;
  name: string;
  date: string;
}

interface TaskFormProps {
  task?: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assignee_id: string | null;
    event_id: string | null;
  };
  mode?: 'create' | 'edit';
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel?: () => void;
}

const STATUSES = [
  { value: 'needs_refining', label: 'Needs Refining' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function TaskForm({ task, mode = 'create', onSubmit, onCancel }: TaskFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      status: (task?.status as TaskFormValues['status']) || 'todo',
      priority: (task?.priority as TaskFormValues['priority']) || 'medium',
      assignee_id: task?.assignee_id || '',
      event_id: task?.event_id || '',
    },
  });

  useEffect(() => {
    fetchProfiles();
    fetchEvents();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/staff');
      const data = await response.json();
      // Extract unique profiles from staff
      const staffProfiles = (data.staff || [])
        .filter((s: { profiles: Profile | null }) => s.profiles)
        .map((s: { profiles: Profile }) => s.profiles);
      setProfiles(staffProfiles);
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const handleSubmit = async (values: TaskFormValues) => {
    setLoading(true);
    setError(null);

    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Task title"
                  className="bg-zinc-950 border-zinc-800"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Task description"
                  className="bg-zinc-950 border-zinc-800 min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
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
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="assignee_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assignee</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="">Unassigned</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email || 'Unknown'}
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
            name="event_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800">
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="">No event</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
            {mode === 'create' ? 'Create Task' : 'Save Changes'}
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
  );
}
