'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, Users, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';

interface StaffMember {
  id: string;
  profile_id: string | null;
  role: string;
  contract_type: 'permanent' | 'freelance' | 'minor';
  is_minor: boolean;
  hourly_rate: number | null;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface StaffListResponse {
  staff: StaffMember[];
  total: number;
  limit: number;
  offset: number;
}

const STAFF_ROLES = [
  'Bar Staff',
  'Security',
  'Door Staff',
  'Cloakroom',
  'Cleaner',
  'Manager',
  'Sound Engineer',
  'Lighting',
  'VIP Host',
  'Runner',
];

const CONTRACT_TYPES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'minor', label: 'Minor' },
];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterContractType, setFilterContractType] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchName) params.append('name', searchName);
      if (filterRole) params.append('role', filterRole);
      if (filterContractType) params.append('contract_type', filterContractType);

      const response = await fetch(`/api/staff?${params.toString()}`);
      const data: StaffListResponse = await response.json();
      setStaff(data.staff || []);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStaff();
  };

  const clearFilters = () => {
    setSearchName('');
    setFilterRole('');
    setFilterContractType('');
    fetchStaff();
  };

  const handleDeleteClick = (staffMember: StaffMember) => {
    setStaffToDelete(staffMember);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/staff/${staffToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete staff member');
      }

      setDeleteDialogOpen(false);
      setStaffToDelete(null);
      fetchStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
    } finally {
      setDeleting(false);
    }
  };

  const getContractTypeBadge = (type: string) => {
    switch (type) {
      case 'permanent':
        return <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/50">Permanent</Badge>;
      case 'freelance':
        return <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/50">Freelance</Badge>;
      case 'minor':
        return <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/50">Minor</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      'Bar Staff': 'bg-purple-600/20 text-purple-400 border-purple-600/50',
      'Security': 'bg-red-600/20 text-red-400 border-red-600/50',
      'Door Staff': 'bg-orange-600/20 text-orange-400 border-orange-600/50',
      'Cloakroom': 'bg-cyan-600/20 text-cyan-400 border-cyan-600/50',
      'Cleaner': 'bg-gray-600/20 text-gray-400 border-gray-600/50',
      'Manager': 'bg-yellow-600/20 text-yellow-400 border-yellow-600/50',
      'Sound Engineer': 'bg-pink-600/20 text-pink-400 border-pink-600/50',
      'Lighting': 'bg-indigo-600/20 text-indigo-400 border-indigo-600/50',
      'VIP Host': 'bg-rose-600/20 text-rose-400 border-rose-600/50',
      'Runner': 'bg-teal-600/20 text-teal-400 border-teal-600/50',
    };
    return (
      <Badge className={colors[role] || 'bg-zinc-600/20 text-zinc-400 border-zinc-600/50'}>
        {role}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Staff Management</h1>
        <p className="text-zinc-400 mt-2">
          Manage your nightclub staff, schedules, and availability
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/staff/new">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-violet-600/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-600/20 rounded-lg">
                  <Users className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Add Staff</h3>
                  <p className="text-sm text-zinc-400">Register new team member</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/staff/shifts">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-violet-600/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600/20 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Shift Schedule</h3>
                  <p className="text-sm text-zinc-400">Plan and assign shifts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/staff/availability">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-violet-600/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600/20 rounded-lg">
                  <Calendar className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{total} Staff</h3>
                  <p className="text-sm text-zinc-400">Manage availability</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card className="bg-zinc-900 border-zinc-800 mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Search by name..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-10 bg-zinc-950 border-zinc-800"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {STAFF_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterContractType} onValueChange={setFilterContractType}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Contract type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {CONTRACT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700">
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="border-zinc-800"
                >
                  Clear
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Staff Directory</CardTitle>
          <Link href="/staff/new">
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full bg-zinc-800" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4 bg-zinc-800" />
                    <Skeleton className="h-3 w-1/3 bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
              <p className="text-zinc-400 mb-4">No staff members found</p>
              <Link href="/staff/new">
                <Button className="bg-violet-600 hover:bg-violet-700">
                  Add your first staff member
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Role</TableHead>
                  <TableHead className="text-zinc-400">Contract</TableHead>
                  <TableHead className="text-zinc-400">Hourly Rate</TableHead>
                  <TableHead className="text-zinc-400">Minor</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id} className="border-zinc-800">
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">
                          {member.profiles?.full_name || 'No name'}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {member.profiles?.email || 'No email'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>{getContractTypeBadge(member.contract_type)}</TableCell>
                    <TableCell className="text-zinc-300">
                      {member.hourly_rate ? `€${member.hourly_rate.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {member.is_minor ? (
                        <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/50">
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-zinc-500">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/staff/${member.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-600/10"
                          onClick={() => handleDeleteClick(member)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Staff Member</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to delete{' '}
              <span className="text-white font-medium">
                {staffToDelete?.profiles?.full_name || 'this staff member'}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
