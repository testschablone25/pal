import { AvailabilityCalendar } from '@/components/availability-calendar';

export default function AvailabilityPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Staff Availability</h1>
        <p className="text-zinc-400 mt-2">
          Manage staff availability and time-off requests
        </p>
      </div>
      <AvailabilityCalendar />
    </div>
  );
}
