'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ALL_ROLES,
  ROLE_CONFIG,
  getRoleBadges,
  type AppRole,
} from '@/lib/permissions';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Shield,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: string[];
}

export default function AdminRolesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Dialog state
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [isRemoveRoleDialogOpen, setIsRemoveRoleDialogOpen] = useState(false);
  const [roleToAdd, setRoleToAdd] = useState<string>('');
  const [roleToRemove, setRoleToRemove] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchUsers = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/roles?user_id=${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }
      
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showNotification('error', 'Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAuthAndFetchUsers = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push('/login');
        return;
      }

      setCurrentUserId(user.id);
      await fetchUsers(user.id);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  }, [supabase, router, fetchUsers]);

  useEffect(() => {
    checkAuthAndFetchUsers();
  }, [checkAuthAndFetchUsers]);

  const handleAddRole = async () => {
    if (!selectedUser || !roleToAdd || !currentUserId) return;
    
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesting_user_id: currentUserId,
          target_user_id: selectedUser.id,
          role: roleToAdd,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add role');
      }

      showNotification('success', `Rolle ${ROLE_CONFIG[roleToAdd as AppRole]?.label} hinzugefügt`);
      setIsAddRoleDialogOpen(false);
      setRoleToAdd('');
      setSelectedUser(null);
      await fetchUsers(currentUserId);
    } catch (error) {
      console.error('Error adding role:', error);
      showNotification('error', error instanceof Error ? error.message : 'Fehler beim Hinzufügen der Rolle');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveRole = async () => {
    if (!selectedUser || !roleToRemove || !currentUserId) return;
    
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesting_user_id: currentUserId,
          target_user_id: selectedUser.id,
          role: roleToRemove,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove role');
      }

      showNotification('success', `Rolle ${ROLE_CONFIG[roleToRemove as AppRole]?.label} entfernt`);
      setIsRemoveRoleDialogOpen(false);
      setRoleToRemove('');
      setSelectedUser(null);
      await fetchUsers(currentUserId);
    } catch (error) {
      console.error('Error removing role:', error);
      showNotification('error', error instanceof Error ? error.message : 'Fehler beim Entfernen der Rolle');
    } finally {
      setActionLoading(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      (user.full_name?.toLowerCase().includes(searchLower)) ||
      user.roles.some(r => r.toLowerCase().includes(searchLower))
    );
  });

  // Get available roles for adding (roles the user doesn't have yet)
  const getAvailableRoles = (user: UserWithRoles): AppRole[] => {
    return ALL_ROLES.filter(role => !user.roles.includes(role));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-zinc-900" />
          <Skeleton className="h-96 bg-zinc-900" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Notification */}
        {notification && (
          <div className={cn(
            "fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg",
            notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          )}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-white" />
            ) : (
              <AlertCircle className="h-5 w-5 text-white" />
            )}
            <span className="text-white">{notification.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="p-3 bg-red-600/20">
              <Shield className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Rollenverwaltung</h1>
              <p className="text-zinc-400">Benutzerrollen zuweisen und verwalten</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Suche nach Name, E-Mail oder Rolle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-400" />
              Benutzer ({filteredUsers.length})
            </CardTitle>
            <CardDescription>
              Klicke auf das + Symbol um einem Benutzer eine Rolle hinzuzufügen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Keine Benutzer gefunden</p>
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-zinc-700 text-zinc-300">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-white">
                          {user.full_name || 'Kein Name'}
                        </h3>
                        <p className="text-sm text-zinc-400">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {user.roles.length > 0 ? (
                            getRoleBadges(user.roles as AppRole[]).map(({ role, label, color }) => (
                              <Badge 
                                key={role} 
                                className={cn(color, "cursor-pointer hover:opacity-80")}
                                onClick={() => {
                                  setSelectedUser(user);
                                  setRoleToRemove(role);
                                  setIsRemoveRoleDialogOpen(true);
                                }}
                              >
                                {label}
                                <Trash2 className="h-3 w-3 ml-1.5" />
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="border-zinc-600 text-zinc-500">
                              Keine Rollen
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 hover:bg-zinc-700"
                      onClick={() => {
                        setSelectedUser(user);
                        setIsAddRoleDialogOpen(true);
                      }}
                      disabled={getAvailableRoles(user).length === 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Rolle hinzufügen
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Role Legend */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Rollen-Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {ALL_ROLES.map(role => {
                const config = ROLE_CONFIG[role];
                return (
                  <div key={role} className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded">
                    <Badge className={config.badgeColor}>{config.label}</Badge>
                    <span className="text-xs text-zinc-500 truncate" title={config.description}>
                      {config.description}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Add Role Dialog */}
        <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">Rolle hinzufügen</DialogTitle>
              <DialogDescription>
                Füge {selectedUser?.full_name || selectedUser?.email} eine neue Rolle hinzu.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={roleToAdd} onValueChange={setRoleToAdd}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Wähle eine Rolle..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {selectedUser && getAvailableRoles(selectedUser).map(role => (
                    <SelectItem key={role} value={role} className="text-white hover:bg-zinc-700">
                      <div className="flex items-center gap-2">
                        <Badge className={ROLE_CONFIG[role].badgeColor}>
                          {ROLE_CONFIG[role].label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddRoleDialogOpen(false);
                  setRoleToAdd('');
                }}
                className="border-zinc-700"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleAddRole}
                disabled={!roleToAdd || actionLoading}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {actionLoading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Role Dialog */}
        <Dialog open={isRemoveRoleDialogOpen} onOpenChange={setIsRemoveRoleDialogOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">Rolle entfernen</DialogTitle>
              <DialogDescription>
                Möchtest du die Rolle {ROLE_CONFIG[roleToRemove as AppRole]?.label} von {selectedUser?.full_name || selectedUser?.email} entfernen?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsRemoveRoleDialogOpen(false);
                  setRoleToRemove('');
                }}
                className="border-zinc-700"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleRemoveRole}
                disabled={actionLoading}
                variant="destructive"
              >
                {actionLoading ? 'Wird entfernt...' : 'Entfernen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
