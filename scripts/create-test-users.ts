/**
 * Create test users for each role in the PAL system
 * 
 * Roles: admin, manager, booker, promoter, artist, staff, guest
 * 
 * Run with: npx tsx scripts/create-test-users.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const defaultTestPassword = process.env.PAL_TEST_USER_PASSWORD || "changeme";

// Test users configuration
const testUsers = [
  {
    email: 'admin@pal.test',
    password: defaultTestPassword,
    full_name: 'Admin User',
    role: 'admin' as const,
  },
  {
    email: 'manager@pal.test',
    password: defaultTestPassword,
    full_name: 'Manager User',
    role: 'manager' as const,
  },
  {
    email: 'booker@pal.test',
    password: defaultTestPassword,
    full_name: 'Lena Müller',
    role: 'booker' as const,
  },
  {
    email: 'promoter@pal.test',
    password: defaultTestPassword,
    full_name: 'Promoter User',
    role: 'promoter' as const,
  },
  {
    email: 'artist@pal.test',
    password: defaultTestPassword,
    full_name: 'Artist User',
    role: 'artist' as const,
  },
  {
    email: 'staff@pal.test',
    password: defaultTestPassword,
    full_name: 'Tom Hartmann',
    role: 'staff' as const,
  },
  {
    email: 'guest@pal.test',
    password: defaultTestPassword,
    full_name: 'Guest User',
    role: 'guest' as const,
  },
];

async function createTestUsers() {
  console.log('Creating test users for PAL system...\n');

  for (const user of testUsers) {
    try {
      // Check if user already exists
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error(`Error listing users: ${listError.message}`);
        continue;
      }

      const existingUser = existingUsers.users.find(u => u.email === user.email);
      
      if (existingUser) {
        console.log(`User ${user.email} already exists (ID: ${existingUser.id})`);
        
        // Ensure profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', existingUser.id)
          .single();
        
        if (!existingProfile) {
          await supabase.from('profiles').insert({
            id: existingUser.id,
            email: user.email,
            full_name: user.full_name,
          });
          console.log(`  → Created profile for ${user.email}`);
        }
        
        // Ensure role exists
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('role', user.role)
          .single();
        
        if (!existingRole) {
          await supabase.from('user_roles').insert({
            user_id: existingUser.id,
            role: user.role,
          });
          console.log(`  → Assigned role '${user.role}' to ${user.email}`);
        } else {
          console.log(`  → Role '${user.role}' already assigned`);
        }
        
        continue;
      }

      // Create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: user.full_name,
        },
      });

      if (authError) {
        console.error(`Error creating user ${user.email}: ${authError.message}`);
        continue;
      }

      console.log(`✅ Created user: ${user.email} (ID: ${authData.user.id})`);

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: user.email,
        full_name: user.full_name,
      });

      if (profileError) {
        console.error(`  → Error creating profile: ${profileError.message}`);
      } else {
        console.log(`  → Created profile`);
      }

      // Assign role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: user.role,
      });

      if (roleError) {
        console.error(`  → Error assigning role: ${roleError.message}`);
      } else {
        console.log(`  → Assigned role: ${user.role}`);
      }

    } catch (error) {
      console.error(`Unexpected error for ${user.email}:`, error);
    }
  }

  console.log('\n--- Test Users Summary ---\n');
  console.log('| Email | Password | Role |');
  console.log('|-------|----------|------|');
  for (const user of testUsers) {
    console.log(`| ${user.email} | ${user.password} | ${user.role} |`);
  }
  console.log('\nDone!');
}

createTestUsers().catch(console.error);
