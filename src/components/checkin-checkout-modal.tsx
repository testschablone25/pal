'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckinCheckoutModalProps {
  itemId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ACTIONS = [
  { value: 'check_in', label: 'Check In' },
  { value: 'check_out', label: 'Check Out' },
  { value: 'transfer', label: 'Transfer' },
];

const LOCATION_PRESETS = [
  'Main Storage',
  'Room A',
  'Room B',
  'Stage',
  'Bar',
];

export function CheckinCheckoutModal({
  itemId,
  open,
  onOpenChange,
  onSuccess,
}: CheckinCheckoutModalProps) {
  const [action, setAction] = useState('check_in');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!location.trim()) {
      setError('Location is required');
      return;
    }
    if (!action) {
      setError('Action is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/items/${itemId}/location-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location.trim(),
          action,
          moved_by: (await (await fetch('/api/auth/user')).json()).id || '00000000-0000-0000-0000-000000000000',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to log location');
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (preset: string) => {
    setLocation(preset);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Log Location Change</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Record a check-in, check-out, or transfer for this item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Action</label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location..."
              className="bg-zinc-950 border-zinc-800"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {LOCATION_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  "border-zinc-700",
                  location === preset && "border-violet-600 bg-violet-600/10"
                )}
              >
                {preset}
              </Button>
            ))}
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
