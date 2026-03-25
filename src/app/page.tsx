export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-white">PAL - Nightclub Booking System</h1>
        <p className="text-lg text-zinc-400 mb-8">
          Welcome to the PAL system. All modules implemented!
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <a href="/artists" className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-violet-600 transition-colors">
            <h2 className="text-xl font-semibold mb-2 text-white">Artist Database</h2>
            <p className="text-sm text-zinc-400">
              Manage artists, genres, contact info, and booking fees
            </p>
            <span className="text-violet-400 text-sm mt-2 inline-block">→ View Artists</span>
          </a>
          <a href="/events" className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-violet-600 transition-colors">
            <h2 className="text-xl font-semibold mb-2 text-white">Event Calendar</h2>
            <p className="text-sm text-zinc-400">
              Calendar view, event creation, running order management
            </p>
            <span className="text-violet-400 text-sm mt-2 inline-block">→ View Events</span>
          </a>
          <a href="/door" className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-violet-600 transition-colors">
            <h2 className="text-xl font-semibold mb-2 text-white">Door Scanner</h2>
            <p className="text-sm text-zinc-400">
              QR code scanning, guest check-in, capacity tracking
            </p>
            <span className="text-violet-400 text-sm mt-2 inline-block">→ Open Scanner</span>
          </a>
          <a href="/staff" className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-violet-600 transition-colors">
            <h2 className="text-xl font-semibold mb-2 text-white">Staff Planning</h2>
            <p className="text-sm text-zinc-400">
              Shift scheduling, availability, labor law compliance
            </p>
            <span className="text-violet-400 text-sm mt-2 inline-block">→ View Staff</span>
          </a>
          <a href="/workflow" className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-violet-600 transition-colors">
            <h2 className="text-xl font-semibold mb-2 text-white">Workflow</h2>
            <p className="text-sm text-zinc-400">
              Kanban board, task management, team coordination
            </p>
            <span className="text-violet-400 text-sm mt-2 inline-block">→ Open Workflow</span>
          </a>
        </div>
      </div>
    </main>
  );
}