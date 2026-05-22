"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { RunningOrder } from "@/components/running-order";
import { TaskForm } from "@/components/task-form";
import { TaskCard, type Task } from "@/components/task-card";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import { formatDateFull } from "@/lib/dates";
import { useToast } from "@/hooks/use-toast";
import { statusBadgeClass } from "@/lib/utils";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Edit,
  Download,
  Share2,
  Trash2,
  Plus,
  ListTodo,
  CheckCircle2,
  XCircle,
  Ban,
  UserCheck,
  DoorOpen,
  Music,
  ArrowRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

interface VenueData {
  id: string;
  name: string;
  address: string;
  capacity: number;
}

interface EventData {
  id: string;
  name: string;
  date: string;
  door_time: string | null;
  end_time: string | null;
  status: string;
  max_capacity: number | null;
  venues: VenueData | null;
}

interface ArtistBrief {
  id: string;
  name: string;
  city: string | null;
  genre: string | null;
}

interface PerformanceBrief {
  id: string;
  artist_id: string;
  stage: string;
  order_index: number;
  artists: ArtistBrief | null;
}

interface TimeSlotData {
  id: string;
  event_id: string;
  label: string | null;
  start_time: string;
  end_time: string;
  slot_index: number;
  duration_minutes: number;
  created_at: string;
  performances: PerformanceBrief[];
}

interface GuestEntryBrief {
  id: string;
  status: string;
  guest_name: string;
  plus_ones: number;
}

interface GuestListData {
  id: string;
  name: string;
  event_id: string;
  created_at: string;
  entries: GuestEntryBrief[];
}

interface ShiftSummary {
  id: string;
  staff_id: string;
  status: string;
  clocked_in_at: string | null;
}

interface StaffProfile {
  id: string;
  profile_id: string;
  role: string;
  profiles: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
  }> | null;
}

interface EventBrief {
  id: string;
  name: string;
}

export interface EventDetailInitialData {
  currentUserId: string;
  event: EventData;
  timeSlots: TimeSlotData[];
  guestLists: GuestListData[];
  shifts: ShiftSummary[];
  tasks: Task[];
  staff: StaffProfile[];
  events: EventBrief[];
}

// ── Status column labels ──────────────────────────────────────────────

const STATUS_COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
] as const;

// ── Client Component ──────────────────────────────────────────────────

export function EventDetailClient({
  initialData,
}: {
  initialData: EventDetailInitialData;
}) {
  const router = useRouter();
  const { toast } = useToast();

  // ── State initialised from server data ────────────────────────────
  const event = initialData.event;
  const eventId = event.id;

  const [eventTasks, setEventTasks] = useState<Task[]>(initialData.tasks);
  const [eventStatus, setEventStatus] = useState(event.status);

  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────

  const handleDownloadItinerary = async () => {
    try {
      const response = await fetch(`/api/itinerary/${eventId}?format=pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `itinerary_${eventId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download itinerary:", error);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Event URL copied to clipboard.",
      });
    } catch (error) {
      console.error("Failed to copy URL:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy URL to clipboard.",
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update status");
      }

      setEventStatus(newStatus);
      toast({
        title: "Status updated",
        description: `Event is now ${newStatus}.`,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Could not update status",
      });
    }
  };

  const handleDeleteEvent = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete event");
      }
      toast({
        title: "Event deleted",
        description: "The event has been removed.",
      });
      router.push("/events");
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Could not delete event",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ── Task handlers ─────────────────────────────────────────────────

  const handleCreateTask = async (values: Record<string, unknown>) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        event_id: eventId,
        created_by: user?.id || values.created_by,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to create task");
    }

    const newTask = await response.json();
    setEventTasks((prev) => [newTask, ...prev]);
    setCreateTaskOpen(false);
    toast({
      title: "Task created",
      description: "The task has been added to this event.",
    });
  };

  const handleCreateTaskWithFiles = async (
    values: Record<string, unknown>,
    files: File[],
  ) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        event_id: eventId,
        created_by: user?.id || (values.created_by as string) || "",
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to create task");
    }

    const newTask = await response.json();

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const upRes = await fetch(`/api/tasks/${newTask.id}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!upRes.ok) {
        const errData = await upRes.json().catch(() => ({}));
        console.error("Failed to upload attachment:", errData.error);
      }
    }

    setEventTasks((prev) => [newTask, ...prev]);
    setCreateTaskOpen(false);
    toast({
      title: "Task created",
      description: `Task created with ${files.length} attachment(s).`,
    });
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setEventTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
    );
  };

  const handleTaskDeleted = (taskId: string) => {
    setEventTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  // ── Computed data ─────────────────────────────────────────────────

  // Guest list stats
  const guestLists = initialData.guestLists;

  // Shift stats
  const shifts = initialData.shifts;
  const uniqueStaffIds = new Set(shifts.map((s) => s.staff_id));
  const clockedInCount = shifts.filter((s) => s.clocked_in_at !== null).length;
  const shiftStatusCounts: Record<string, number> = {};
  shifts.forEach((s) => {
    shiftStatusCounts[s.status] = (shiftStatusCounts[s.status] || 0) + 1;
  });

  // Task kanban columns
  const tasksByStatus: Record<string, Task[]> = {
    todo: [],
    in_progress: [],
    done: [],
  };
  eventTasks.forEach((task) => {
    if (tasksByStatus[task.status]) {
      tasksByStatus[task.status].push(task);
    }
  });

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {/* ── Event Header Card ──────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{event.name}</h1>
            <Badge className={statusBadgeClass(eventStatus)}>
              {eventStatus}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-zinc-400">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              <span>{formatDateFull(event.date)}</span>
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
                <span>
                  {event.door_time} - {event.end_time}
                </span>
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
            className="border-zinc-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Itinerary PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            className="border-zinc-700"
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
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ──────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Löschen bestätigen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht
              werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Löschen..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Status Management ───────────────────────────────────────── */}
      {eventStatus && (
        <div className="flex flex-wrap gap-2 mb-6">
          {eventStatus !== "published" && (
            <Button
              size="sm"
              onClick={() => handleStatusChange("published")}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Publish
            </Button>
          )}
          {eventStatus !== "cancelled" && (
            <Button
              size="sm"
              onClick={() => handleStatusChange("cancelled")}
              variant="outline"
              className="border-red-700 text-red-400 hover:bg-red-950"
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
          )}
          {eventStatus !== "completed" && (
            <Button
              size="sm"
              onClick={() => handleStatusChange("completed")}
              variant="outline"
              className="border-zinc-700"
            >
              <Ban className="h-4 w-4 mr-1.5" />
              Complete
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700"
            asChild
          >
            <Link href={`/guest-lists?event_id=${eventId}`}>
              <UserCheck className="h-4 w-4 mr-1.5" />
              Guest List
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700"
            asChild
          >
            <Link href={`/door?event_id=${eventId}`}>
              <DoorOpen className="h-4 w-4 mr-1.5" />
              Door
            </Link>
          </Button>
        </div>
      )}

      {/* ── Venue info ──────────────────────────────────────────────── */}
      {event.venues && (
        <Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
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

      {/* ── Running Order Section ───────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
          <Music className="h-5 w-5 text-violet-400" />
          Running Order
        </h2>
        <RunningOrder eventId={eventId} />
      </section>

      {/* ── Guest Lists Section ─────────────────────────────────────── */}
      <Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-violet-400" />
            Guest Lists
            {guestLists.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-zinc-800 text-zinc-400 border-zinc-700 ml-1"
              >
                {guestLists.length}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" className="border-zinc-700" asChild>
            <Link href={`/guest-lists/new?event_id=${eventId}`}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Guest List
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {guestLists.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">
                No guest lists for this event.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-zinc-700"
                asChild
              >
                <Link href={`/guest-lists/new?event_id=${eventId}`}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Guest List
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {guestLists.map((list) => {
                const totalEntries = list.entries.length;
                const pendingCount = list.entries.filter(
                  (e) => e.status === "pending",
                ).length;
                const checkedInCount = list.entries.filter(
                  (e) => e.status === "checked_in",
                ).length;

                return (
                  <Link
                    key={list.id}
                    href={`/guest-lists/${list.id}`}
                    className="bg-zinc-900/50 border border-zinc-800/70 rounded-lg p-4 hover:border-zinc-700 transition-colors block"
                    aria-label={`Guest list: ${list.name}`}
                  >
                    <h3 className="font-medium text-white mb-2 truncate">
                      {list.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-zinc-400">
                        <span className="font-semibold text-white">
                          {totalEntries}
                        </span>{" "}
                        total
                      </span>
                      <span className="text-yellow-400">
                        <span className="font-semibold">{pendingCount}</span>{" "}
                        pending
                      </span>
                      <span className="text-green-400">
                        <span className="font-semibold">{checkedInCount}</span>{" "}
                        checked in
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Shifts Section ──────────────────────────────────────────── */}
      <Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-violet-400" />
            Staff Shifts
            {shifts.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-zinc-800 text-zinc-400 border-zinc-700 ml-1"
              >
                {shifts.length}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" className="border-zinc-700" asChild>
            <Link href={`/staff/shifts?event_id=${eventId}`}>
              View All Shifts
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {shifts.length === 0 ? (
            <div className="text-center py-8">
              <DoorOpen className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">No shifts scheduled.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-zinc-700"
                asChild
              >
                <Link href={`/staff/shifts?event_id=${eventId}`}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Schedule Shifts
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <div className="bg-zinc-900/50 border border-zinc-800/70 rounded-lg px-4 py-3">
                <p className="text-2xl font-bold text-white">{shifts.length}</p>
                <p className="text-xs text-zinc-400">Total Shifts</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/70 rounded-lg px-4 py-3">
                <p className="text-2xl font-bold text-white">
                  {uniqueStaffIds.size}
                </p>
                <p className="text-xs text-zinc-400">Staff Members</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/70 rounded-lg px-4 py-3">
                <p className="text-2xl font-bold text-green-400">
                  {clockedInCount}
                </p>
                <p className="text-xs text-zinc-400">Clocked In</p>
              </div>
              {Object.entries(shiftStatusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="bg-zinc-900/50 border border-zinc-800/70 rounded-lg px-4 py-3"
                >
                  <Badge className={statusBadgeClass(status)}>{status}</Badge>
                  <p className="text-2xl font-bold text-white mt-1">{count}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tasks Section — Simplified Kanban ────────────────────────── */}
      <Card className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-violet-400" />
            Tasks
            <Badge
              variant="secondary"
              className="bg-zinc-800 text-zinc-400 border-zinc-700 ml-1"
            >
              {eventTasks.length}
            </Badge>
          </CardTitle>
          <Button
            onClick={() => setCreateTaskOpen(true)}
            className="bg-violet-600 hover:bg-violet-700"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Task
          </Button>
        </CardHeader>
        <CardContent>
          {eventTasks.length === 0 ? (
            <div className="text-center py-8">
              <ListTodo className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">
                No tasks for this event yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateTaskOpen(true)}
                className="mt-3 border-zinc-700"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create first task
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {STATUS_COLUMNS.map((col) => (
                <div key={col.id} className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-zinc-300">
                      {col.label}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs"
                    >
                      {tasksByStatus[col.id].length}
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {tasksByStatus[col.id].length === 0 ? (
                      <div className="text-center py-4 border border-dashed border-zinc-800 rounded-lg">
                        <p className="text-xs text-zinc-600">No tasks</p>
                      </div>
                    ) : (
                      tasksByStatus[col.id].map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => handleTaskClick(task)}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create Task Dialog ───────────────────────────────────────── */}
      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/70 rounded-lg max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Task for {event.name}</DialogTitle>
          </DialogHeader>
          <TaskForm
            mode="create"
            parentTask={{ event_id: eventId }}
            onSubmit={handleCreateTask}
            onCreateWithFiles={handleCreateTaskWithFiles}
            onCancel={() => setCreateTaskOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Task Detail Dialog ───────────────────────────────────────── */}
      <TaskDetailDialog
        task={selectedTask}
        open={taskDetailOpen}
        onOpenChange={(open) => {
          setTaskDetailOpen(open);
          if (!open) setSelectedTask(null);
        }}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />
    </div>
  );
}
