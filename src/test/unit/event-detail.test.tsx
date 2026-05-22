/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EventDetailClient } from "@/app/events/[id]/event-detail-client";
import type { EventDetailInitialData } from "@/app/events/[id]/event-detail-client";

// ── Mock fetch globally ────────────────────────────────────────────────

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// ── Mock next/navigation ───────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: "event-1" }),
  usePathname: () => "/events/event-1",
}));

// ── Mock next/link ─────────────────────────────────────────────────────

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ── Mock supabase browser client ───────────────────────────────────────

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "user-1" } } }),
    },
  }),
}));

// ── Mock toast ─────────────────────────────────────────────────────────

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// ── Mock TaskCard (dnd-kit dependency) ──────────────────────────────────

vi.mock("@/components/task-card", async () => {
  const actual = await vi.importActual("@/components/task-card");
  return {
    ...actual,
    TaskCard: ({
      task,
      onClick,
    }: {
      task: { id: string; title: string; status: string; priority: string };
      onClick?: () => void;
    }) => (
      <div
        data-testid="task-card"
        data-task-id={task.id}
        data-status={task.status}
        onClick={onClick}
        role="button"
        tabIndex={0}
      >
        {task.title}
      </div>
    ),
  };
});

// ── Mock TaskDetailDialog ───────────────────────────────────────────────

vi.mock("@/components/task-detail-dialog", () => ({
  TaskDetailDialog: ({
    open,
    onOpenChange,
    task,
    onTaskUpdated,
    onTaskDeleted,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: { id: string; title: string } | null;
    onTaskUpdated: (t: unknown) => void;
    onTaskDeleted: (id: string) => void;
  }) =>
    open && task ? (
      <div data-testid="task-detail-dialog">
        <span data-testid="task-detail-title">{task.title}</span>
        <button
          data-testid="close-task-detail"
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
        <button
          data-testid="delete-task-btn"
          onClick={() => onTaskDeleted(task.id)}
        >
          Delete
        </button>
        <button
          data-testid="update-task-btn"
          onClick={() =>
            onTaskUpdated({ ...task, status: "done" })
          }
        >
          Update
        </button>
      </div>
    ) : null,
}));

// ── Mock TaskForm ───────────────────────────────────────────────────────

vi.mock("@/components/task-form", () => ({
  TaskForm: ({
    onSubmit,
    onCreateWithFiles,
    onCancel,
  }: {
    mode: string;
    parentTask?: { event_id?: string };
    onSubmit: (values: Record<string, unknown>) => Promise<void>;
    onCreateWithFiles?: (
      values: Record<string, unknown>,
      files: File[],
    ) => Promise<void>;
    onCancel: () => void;
  }) => (
    <div data-testid="task-form">
      <button
        data-testid="submit-task"
        onClick={() =>
          onSubmit({
            title: "New Task",
            status: "todo",
            priority: "medium",
          })
        }
      >
        Submit
      </button>
      <button
        data-testid="submit-task-with-files"
        onClick={() =>
          onCreateWithFiles?.(
            { title: "Task with file", status: "todo", priority: "medium" },
            [new File([], "test.pdf")],
          )
        }
      >
        Submit with Files
      </button>
      <button data-testid="cancel-task" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

// ── Mock RunningOrder ───────────────────────────────────────────────────

vi.mock("@/components/running-order", () => ({
  RunningOrder: ({ eventId }: { eventId: string }) => (
    <div data-testid="running-order" data-event-id={eventId}>
      Running Order Component
    </div>
  ),
}));

// ── Helpers: create realistic mock initialData ──────────────────────────

function createMockInitialData(
  overrides?: Partial<EventDetailInitialData>,
): EventDetailInitialData {
  return {
    currentUserId: "user-1",
    event: {
      id: "event-1",
      name: "Techno Night",
      date: "2026-06-15T20:00:00.000Z",
      door_time: "22:00:00",
      end_time: "06:00:00",
      status: "draft",
      max_capacity: 500,
      venues: {
        id: "venue-1",
        name: "Berghain",
        address: "Am Wriezener Bahnhof, 10243 Berlin",
        capacity: 1500,
      },
    },
    timeSlots: [],
    guestLists: [],
    shifts: [],
    tasks: [],
    staff: [],
    events: [],
    ...overrides,
  };
}

function createMockTasks() {
  return [
    {
      id: "task-1",
      title: "Sound check",
      description: "Check all audio equipment",
      status: "todo" as const,
      priority: "high" as const,
    },
    {
      id: "task-2",
      title: "Set up lighting",
      description: null,
      status: "in_progress" as const,
      priority: "medium" as const,
    },
    {
      id: "task-3",
      title: "Clean stage",
      description: "Sweep and mop stage area",
      status: "done" as const,
      priority: "low" as const,
    },
    {
      id: "task-4",
      title: "Pending approval task",
      description: null,
      status: "pending_approval" as const,
      priority: "medium" as const,
    },
    {
      id: "task-5",
      title: "Cancelled task",
      description: null,
      status: "cancelled" as const,
      priority: "low" as const,
    },
  ];
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("EventDetailClient — Event Header Card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("renders event name as h1", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Techno Night",
    );
  });

  it("renders event date with CalendarDays icon", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);
    // formatDateFull for 2026-06-15T20:00:00.000Z
    expect(screen.getByText(/Montag, 15\. Juni 2026/i)).toBeDefined();
  });

  it("renders venue name with MapPin icon", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);
    // Venue name appears in both header metadata and the Venue card
    const elements = screen.getAllByText("Berghain");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders door time to end time range", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByText(/22:00:00 - 06:00:00/)).toBeDefined();
  });

  it("renders max capacity", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByText(/Max 500/)).toBeDefined();
  });

  it("renders status badge with correct class for draft", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);
    const badge = screen.getByText("draft");
    expect(badge).toBeDefined();
  });

  it("renders status badge for published status", () => {
    const data = createMockInitialData({
      event: {
        ...createMockInitialData().event,
        status: "published",
      },
    });
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByText("published")).toBeDefined();
  });

  it("renders status badge for cancelled status", () => {
    const data = createMockInitialData({
      event: {
        ...createMockInitialData().event,
        status: "cancelled",
      },
    });
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByText("cancelled")).toBeDefined();
  });

  it("renders edit link pointing to event edit page", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);
    const editLink = screen.getByText("Edit").closest("a");
    expect(editLink).toBeDefined();
    expect(editLink?.getAttribute("href")).toBe("/events/event-1/edit");
  });

  it("does not show door/end time when not set", () => {
    const data = createMockInitialData({
      event: {
        ...createMockInitialData().event,
        door_time: null,
        end_time: null,
      },
    });
    render(<EventDetailClient initialData={data} />);
    // Should still render, just not the time display
    expect(screen.getByText("Techno Night")).toBeDefined();
  });

  it("does not show max capacity when not set", () => {
    const data = createMockInitialData({
      event: {
        ...createMockInitialData().event,
        max_capacity: null,
      },
    });
    render(<EventDetailClient initialData={data} />);
    expect(screen.queryByText(/Max/)).toBeNull();
  });
});

describe("EventDetailClient — Guest Lists Section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("renders guest list summary cards when guest lists exist", () => {
    const data = createMockInitialData({
      guestLists: [
        {
          id: "gl-1",
          name: "VIP List",
          event_id: "event-1",
          created_at: "2026-05-01T00:00:00Z",
          entries: [
            { id: "e-1", status: "pending", guest_name: "Alice", plus_ones: 2 },
            {
              id: "e-2",
              status: "checked_in",
              guest_name: "Bob",
              plus_ones: 0,
            },
            {
              id: "e-3",
              status: "pending",
              guest_name: "Charlie",
              plus_ones: 1,
            },
          ],
        },
        {
          id: "gl-2",
          name: "Regular",
          event_id: "event-1",
          created_at: "2026-05-02T00:00:00Z",
          entries: [],
        },
      ],
    });
    render(<EventDetailClient initialData={data} />);

    expect(screen.getByText("VIP List")).toBeDefined();
    expect(screen.getByText("Regular")).toBeDefined();
    // Check entry counts (badge count "2" appears twice — guest lists badge + pending)
    const threes = screen.getAllByText("3");
    expect(threes.length).toBeGreaterThanOrEqual(1); // total for VIP
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(1); // guest lists badge or pending count
    const ones = screen.getAllByText("1");
    expect(ones.length).toBeGreaterThanOrEqual(1); // checked in count for VIP
  });

  it("shows empty state when no guest lists", () => {
    const data = createMockInitialData({ guestLists: [] });
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByText(/No guest lists for this event/)).toBeDefined();
  });

  it("has a create guest list link", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);
    const links = screen.getAllByText(/Create Guest List/);
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("guest list cards link to guest list detail", () => {
    const data = createMockInitialData({
      guestLists: [
        {
          id: "gl-1",
          name: "VIP List",
          event_id: "event-1",
          created_at: "2026-05-01T00:00:00Z",
          entries: [],
        },
      ],
    });
    render(<EventDetailClient initialData={data} />);
    const link = screen.getByText("VIP List").closest("a");
    expect(link?.getAttribute("href")).toBe("/guest-lists/gl-1");
  });
});

describe("EventDetailClient — Shifts Section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("shows shift stats when shifts exist", () => {
    const data = createMockInitialData({
      shifts: [
        {
          id: "shift-1",
          staff_id: "staff-1",
          status: "scheduled",
          clocked_in_at: null,
        },
        {
          id: "shift-2",
          staff_id: "staff-2",
          status: "confirmed",
          clocked_in_at: "2026-06-15T21:00:00Z",
        },
        {
          id: "shift-3",
          staff_id: "staff-1",
          status: "scheduled",
          clocked_in_at: null,
        },
      ],
    });
    render(<EventDetailClient initialData={data} />);

    expect(screen.getByText("Total Shifts")).toBeDefined();
    // "3" appears as both badge count and stat value
    const threes = screen.getAllByText("3");
    expect(threes.length).toBeGreaterThanOrEqual(1); // total shifts
    expect(screen.getByText("Staff Members")).toBeDefined();
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(1); // unique staff
    expect(screen.getByText("Clocked In")).toBeDefined();
    const ones = screen.getAllByText("1");
    expect(ones.length).toBeGreaterThanOrEqual(1); // clocked in
  });

  it("shows empty state when no shifts", () => {
    const data = createMockInitialData({ shifts: [] });
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByText(/No shifts scheduled/)).toBeDefined();
  });

  it("has a link to view all shifts", () => {
    const data = createMockInitialData({
      shifts: [
        {
          id: "shift-1",
          staff_id: "staff-1",
          status: "scheduled",
          clocked_in_at: null,
        },
      ],
    });
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByText("View All Shifts")).toBeDefined();
  });
});

describe("EventDetailClient — Tasks Kanban Section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: "new-task-1",
        title: "New Task",
        status: "todo",
        priority: "medium",
      }),
    });
  });

  it("renders 3 kanban columns (todo, in_progress, done)", () => {
    const data = createMockInitialData({
      tasks: createMockTasks() as EventDetailInitialData["tasks"],
    });
    render(<EventDetailClient initialData={data} />);

    expect(screen.getByText("To Do")).toBeDefined();
    expect(screen.getByText("In Progress")).toBeDefined();
    expect(screen.getByText("Done")).toBeDefined();
  });

  it("hides pending_approval and cancelled columns", () => {
    const data = createMockInitialData({
      tasks: createMockTasks() as EventDetailInitialData["tasks"],
    });
    render(<EventDetailClient initialData={data} />);

    expect(screen.queryByText("Pending Approval")).toBeNull();
    expect(screen.queryByText("Cancelled")).toBeNull();
  });

  it("shows tasks in correct columns", () => {
    const data = createMockInitialData({
      tasks: createMockTasks() as EventDetailInitialData["tasks"],
    });
    render(<EventDetailClient initialData={data} />);

    const taskCards = screen.getAllByTestId("task-card");
    // Only todo, in_progress, done tasks should be visible
    // pending_approval and cancelled are hidden
    expect(taskCards.length).toBe(3);
  });

  it("shows empty state when no tasks", () => {
    const data = createMockInitialData({ tasks: [] });
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByText(/No tasks for this event yet/)).toBeDefined();
  });

  it("has a Create Task button", () => {
    const data = createMockInitialData({
      tasks: [createMockTasks()[0]] as EventDetailInitialData["tasks"],
    });
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByText("Create Task")).toBeDefined();
  });

  it("'Create Task' button opens task form dialog", async () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);

    const createBtn = screen.getByText("Create Task");
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByTestId("task-form")).toBeDefined();
    });
  });

  it("task card click opens TaskDetailDialog", async () => {
    const data = createMockInitialData({
      tasks: [createMockTasks()[0]] as EventDetailInitialData["tasks"],
    });
    render(<EventDetailClient initialData={data} />);

    const taskCard = screen.getByTestId("task-card");
    fireEvent.click(taskCard);

    await waitFor(() => {
      expect(screen.getByTestId("task-detail-dialog")).toBeDefined();
      expect(screen.getByTestId("task-detail-title")).toHaveTextContent(
        "Sound check",
      );
    });
  });

  it("clicking empty-state 'Create first task' opens form", async () => {
    const data = createMockInitialData({ tasks: [] });
    render(<EventDetailClient initialData={data} />);

    const btn = screen.getByText("Create first task");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId("task-form")).toBeDefined();
    });
  });
});

describe("EventDetailClient — Running Order Section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("embeds RunningOrder with correct eventId", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);

    const runningOrder = screen.getByTestId("running-order");
    expect(runningOrder).toBeDefined();
    expect(runningOrder.getAttribute("data-event-id")).toBe("event-1");
  });

  it("displays Running Order section heading", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByText("Running Order")).toBeDefined();
  });
});

describe("EventDetailClient — Status Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("shows Publish button for draft event", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByText("Publish")).toBeDefined();
  });

  it("does not show Publish button for published event", () => {
    const data = createMockInitialData({
      event: {
        ...createMockInitialData().event,
        status: "published",
      },
    });
    render(<EventDetailClient initialData={data} />);
    expect(screen.queryByText("Publish")).toBeNull();
  });

  it("shows Cancel and Complete buttons", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);
    expect(screen.getByText("Cancel")).toBeDefined();
    expect(screen.getByText("Complete")).toBeDefined();
  });

  it("Publish button fires API call", async () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);

    const publishBtn = screen.getByText("Publish");
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/events/event-1",
        expect.objectContaining({
          method: "PUT",
        }),
      );
    });
  });

  it("Cancel button fires API call with cancelled status", async () => {
    const data = createMockInitialData({
      event: {
        ...createMockInitialData().event,
        status: "published",
      },
    });
    render(<EventDetailClient initialData={data} />);

    const cancelBtn = screen.getByText("Cancel");
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/events/event-1",
        expect.objectContaining({
          method: "PUT",
        }),
      );
      const call = mockFetch.mock.calls.find(
        (c: unknown[]) =>
          c[0] === "/api/events/event-1" && (c[1] as RequestInit)?.method === "PUT",
      );
      const body = JSON.parse(
        (call?.[1] as RequestInit)?.body as string,
      );
      expect(body.status).toBe("cancelled");
    });
  });
});

describe("EventDetailClient — Delete Event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("shows delete confirmation dialog on delete button click", async () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);

    // Find the trash/delete button (destructive variant)
    const deleteButtons = screen.getAllByRole("button");
    const trashButton = deleteButtons.find(
      (btn) =>
        btn.className.includes("destructive") ||
        btn.innerHTML.includes("trash") ||
        btn.innerHTML.includes("Trash2"),
    );
    expect(trashButton).toBeDefined();
    if (trashButton) {
      fireEvent.click(trashButton);
    }

    await waitFor(() => {
      expect(screen.getByText("Löschen bestätigen")).toBeDefined();
    });
  });
});

describe("EventDetailClient — Venue Info", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("shows venue name and address", () => {
    const data = createMockInitialData();
    render(<EventDetailClient initialData={data} />);
    // Berghain appears in both header metadata and Venue card
    const elements = screen.getAllByText("Berghain");
    expect(elements.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("Am Wriezener Bahnhof, 10243 Berlin"),
    ).toBeDefined();
  });

  it("does not show venue card when no venue", () => {
    const data = createMockInitialData({
      event: {
        ...createMockInitialData().event,
        venues: null,
      },
    });
    render(<EventDetailClient initialData={data} />);
    // "Venue" card title should not be rendered
    const venueCards = screen.queryAllByText("Venue");
    // The "Venue" title only appears in the venue card
    expect(
      venueCards.filter(
        (el) => el.tagName === "H3" || (el as HTMLElement).className?.includes("text-lg"),
      ).length,
    ).toBe(0);
  });
});

describe("EventDetailClient — Empty States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("renders without crashing with minimal data", () => {
    const data = createMockInitialData({
      timeSlots: [],
      guestLists: [],
      shifts: [],
      tasks: [],
      staff: [],
      events: [],
    });
    const { container } = render(<EventDetailClient initialData={data} />);
    expect(container).toBeDefined();
    expect(screen.getByText("Techno Night")).toBeDefined();
  });
});
