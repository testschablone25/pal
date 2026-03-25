'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { StaffForm } from '@/components/staff-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface StaffMember {
  id: string;
  role: string;
  contract_type: 'permanent' | 'freelance' | 'minor';
  hourly_rate: number | null;
  is_minor: boolean;
}

export default function EditStaffPage() {
  const params = useParams();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch(`/api/staff/${params.id}`);
        if (!response.ok) {
          throw new Error('Staff member not found');
        }
        const data = await response.json();
        setStaff(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load staff member');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchStaff();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 bg-zinc-800" />
          <Skeleton className="h-5 w-96 mt-2 bg-zinc-800" />
        </div>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 space-y-6">
            <Skeleton className="h-10 w-full bg-zinc-800" />
            <Skeleton className="h-10 w-full bg-zinc-800" />
            <Skeleton className="h-10 w-full bg-zinc-800" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <p className="text-red-400">{error || 'Staff member not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Edit Staff Member</h1>
        <p className="text-zinc-400 mt-2">
          Update staff member information
        </p>
      </div>
      <StaffForm staff={staff} mode="edit" />
    </div>
  );
}
