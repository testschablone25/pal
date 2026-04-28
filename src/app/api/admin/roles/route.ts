import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';
import { isValidRole, hasPermission, type AppRole } from '@/lib/permissions';

// GET: List all users with their roles
export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get requesting user's ID from query params
    const url = new URL(request.url);
    const requestingUserId = url.searchParams.get('user_id');

    if (!requestingUserId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    // Check if requesting user has permission to manage roles
    const { data: requestingUserRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId);

    const userRoles = requestingUserRoles?.map(r => r.role as AppRole) || [];
    
    if (!hasPermission(userRoles, 'ROLES_MANAGE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all profiles with their roles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .order('full_name', { ascending: true });

    if (profilesError) {
      throw profilesError;
    }

    // Fetch all user roles
    const { data: allRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      throw rolesError;
    }

    // Map roles to users
    const rolesByUser = new Map<string, string[]>();
    for (const roleEntry of allRoles || []) {
      const existing = rolesByUser.get(roleEntry.user_id) || [];
      existing.push(roleEntry.role);
      rolesByUser.set(roleEntry.user_id, existing);
    }

    // Combine profiles with roles
    const usersWithRoles = profiles?.map(profile => ({
      ...profile,
      roles: rolesByUser.get(profile.id) || [],
    })) || [];

    return NextResponse.json({ users: usersWithRoles });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST: Add a role to a user
export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await request.json();
    const { requesting_user_id, target_user_id, role } = body;

    if (!requesting_user_id || !target_user_id || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate role
    if (!isValidRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if requesting user has permission to manage roles
    const { data: requestingUserRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requesting_user_id);

    const userRoles = requestingUserRoles?.map(r => r.role as AppRole) || [];
    
    if (!hasPermission(userRoles, 'ROLES_MANAGE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if user already has this role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', target_user_id)
      .eq('role', role)
      .single();

    if (existingRole) {
      return NextResponse.json({ error: 'User already has this role' }, { status: 409 });
    }

    // Add the role
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: target_user_id,
        role: role,
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, message: `Role ${role} added to user` });
  } catch (error) {
    console.error('Error adding role:', error);
    return NextResponse.json({ error: 'Failed to add role' }, { status: 500 });
  }
}

// DELETE: Remove a role from a user
export async function DELETE(request: Request) {
  try {
    const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await request.json();
    const { requesting_user_id, target_user_id, role } = body;

    if (!requesting_user_id || !target_user_id || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate role
    if (!isValidRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if requesting user has permission to manage roles
    const { data: requestingUserRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requesting_user_id);

    const userRoles = requestingUserRoles?.map(r => r.role as AppRole) || [];
    
    if (!hasPermission(userRoles, 'ROLES_MANAGE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Prevent removing the last admin
    if (role === 'admin') {
      const { data: adminCount } = await supabase
        .from('user_roles')
        .select('id', { count: 'exact' })
        .eq('role', 'admin');

      if ((adminCount?.length || 0) <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
      }
    }

    // Remove the role
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', target_user_id)
      .eq('role', role);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true, message: `Role ${role} removed from user` });
  } catch (error) {
    console.error('Error removing role:', error);
    return NextResponse.json({ error: 'Failed to remove role' }, { status: 500 });
  }
}
