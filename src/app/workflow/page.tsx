'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskCard, Task } from '@/components/task-card';
import { TaskForm } from '@/components/task-form';
import { TaskDetailDialog } from '@/components/task-detail-dialog';
import { Plus, Search, Filter, Kanban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column {
  id: string;
  title: string;
  status: Task['status'];
  color: string;
}

const COLUMNS: Column[] = [
  { id: 'todo', title: 'To Do', status: 'todo', color: 'bg-zinc-600' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress', color: 'bg-blue-600' },
  { id: 'pending_approval', title: 'Pending Approval', status: 'pending_approval', color: 'bg-amber-600' },
  { id: 'done', title: 'Done', status: 'done', color: 'bg-green-600' },
  { id: 'cancelled', title: 'Cancelled', status: 'cancelled', color: 'bg-red-600' },
];

interface Event {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function WorkflowPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTaskOriginalStatus, setActiveTaskOriginalStatus] = useState<Task["status"] | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
  const [filterBlocked, setFilterBlocked] = useState(false);
  const [filterNeedsApproval, setFilterNeedsApproval] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  function DroppableColumn({ children, columnId }: { children: React.ReactNode; columnId: string }) {
    const { setNodeRef } = useDroppable({ id: columnId });
    return <div ref={setNodeRef}>{children}</div>;
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    fetchTasks();
    fetchEvents();
    fetchProfiles();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [showMyTasksOnly]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      let url = '/api/tasks';
      if (user && showMyTasksOnly) {
        url += `?my_tasks=true&user_id=${user.id}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
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

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/staff');
      const data = await response.json();
      const staffProfiles = (data.staff || [])
        .filter((s: { profiles: Profile | null }) => s.profiles)
        .map((s: { profiles: Profile }) => s.profiles);
      setProfiles(staffProfiles);
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
      if (filterAssignee !== 'all' && task.assignee_id !== filterAssignee) return false;
      if (filterEvent !== 'all' && task.event_id !== filterEvent) return false;
      if (filterBlocked && !task.blocked) return false;
      if (filterNeedsApproval && !task.needs_approval) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [tasks, filterPriority, filterAssignee, filterEvent, searchQuery, filterBlocked, filterNeedsApproval]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {
      todo: [],
      in_progress: [],
      pending_approval: [],
      done: [],
      cancelled: [],
    };
    filteredTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    return grouped;
  }, [filteredTasks]);

  const visibleColumns = useMemo(() => {
    return COLUMNS.filter((col) => {
      if (col.id === 'pending_approval') {
        return tasksByStatus[col.status]?.some((t) => t.needs_approval) ?? false;
      }
      return true;
    });
  }, [tasksByStatus]);

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;
    const activeTask = tasks.find((t) => t.id === activeId);
    setActiveId(activeId);
    setActiveTaskOriginalStatus(activeTask?.status || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if dropping over a column
    const overColumn = COLUMNS.find((c) => c.id === overId);
    if (overColumn && activeTask.status !== overColumn.status) {
      setTasks((tasks) =>
        tasks.map((t) =>
          t.id === activeId ? { ...t, status: overColumn.status } : t
        )
      );
    }

    // Check if dropping over another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask.status !== overTask.status) {
      setTasks((tasks) =>
        tasks.map((t) =>
          t.id === activeId ? { ...t, status: overTask.status } : t
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTaskOriginalStatus(null);

    if (!over) return;

    const activeId = active.id as string;
    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const overId = over.id as string;
    let newStatus: Task["status"] | null = null;

    const overColumn = COLUMNS.find((c) => c.id === overId);
    if (overColumn) {
      newStatus = overColumn.status;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (!newStatus || newStatus === activeTaskOriginalStatus) return;

    // Update status in database
    try {
      const response = await fetch(`/api/tasks/${activeId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("API error:", error);
        fetchTasks();
        return;
      }

      setTasks((tasks) =>
        tasks.map((t) =>
          t.id === activeId ? { ...t, status: newStatus as Task["status"] } : t
        )
      );
    } catch (error) {
      console.error("Failed to update task status:", error);
      fetchTasks();
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((tasks) =>
      tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    setSelectedTask(updatedTask);
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((tasks) => tasks.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  };

  const handleCreateTask = async (values: {
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'pending_approval' | 'done' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignee_id?: string;
    event_id?: string;
    due_date?: string;
    scheduled_date?: string;
    needs_approval?: boolean;
    item_ids?: string[];
  }) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const newTask = await response.json();
      setTasks((tasks) => [newTask, ...tasks]);
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  };

  const clearFilters = () => {
    setFilterPriority('all');
    setFilterAssignee('all');
    setFilterEvent('all');
    setSearchQuery('');
    setFilterBlocked(false);
    setFilterNeedsApproval(false);
  };

  const activeTask = tasks.find((t) => t.id === activeId);

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Kanban className="h-8 w-8 text-violet-400" />
            Workflow
          </h1>
          <p className="text-zinc-400 mt-2">
            Manage tasks and track progress with Kanban boards
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-950 border-zinc-800"
              />
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Filter by assignee" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All assignees</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEvent} onValueChange={setFilterEvent}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Filter by event" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All events</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showMyTasksOnly ? "default" : "outline"}
              onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
              className={showMyTasksOnly ? "bg-violet-600 hover:bg-violet-700" : "border-zinc-800"}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showMyTasksOnly ? "My Tasks" : "All Tasks"}
            </Button>
            <Button
              variant={filterBlocked ? "default" : "outline"}
              onClick={() => setFilterBlocked(!filterBlocked)}
              className={filterBlocked ? "bg-red-600 hover:bg-red-700" : "border-zinc-800"}
            >
              <Filter className="h-4 w-4 mr-2" />
              Blocked
            </Button>
            <Button
              variant={filterNeedsApproval ? "default" : "outline"}
              onClick={() => setFilterNeedsApproval(!filterNeedsApproval)}
              className={filterNeedsApproval ? "bg-amber-600 hover:bg-amber-700" : "border-zinc-800"}
            >
              <Filter className="h-4 w-4 mr-2" />
              Needs Approval
            </Button>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="border-zinc-800"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          className="grid grid-cols-1 gap-4"
          style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))` }}
        >
          {visibleColumns.map((column) => {
            const hasBlockedTasks = column.id === 'in_progress' &&
              tasksByStatus[column.status]?.some((t) => t.blocked);

            return (
              <div key={column.id} className="flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className={cn('w-3 h-3 rounded-full', column.color)} />
                <h3 className="font-semibold text-white">{column.title}</h3>
                <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">
                  {tasksByStatus[column.status]?.length || 0}
                </Badge>
              </div>

              <SortableContext
                items={tasksByStatus[column.status]?.map((t) => t.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <DroppableColumn columnId={column.id}>
                <div
                  className={cn(
                    'flex-1 min-h-[200px] p-2 border-2 border-dashed transition-colors',
                    'bg-zinc-950/50 border-zinc-800',
                    activeId && 'border-violet-600/50 bg-violet-950/20',
                    hasBlockedTasks && 'bg-red-950/20 border-red-800/50'
                  )}
                >
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 bg-zinc-800" />
                      ))}
                    </div>
                  ) : tasksByStatus[column.status]?.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
                      No tasks
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasksByStatus[column.status]?.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => handleTaskClick(task)}
                        />
                      ))}
                    </div>
                  )}
                </div>
                </DroppableColumn>
              </SortableContext>
            </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="opacity-80">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Create Task Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            mode="create"
            onSubmit={handleCreateTask}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />
    </div>
  );
}
