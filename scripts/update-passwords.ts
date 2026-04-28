import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Get all users and update passwords
async function updatePasswords() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error listing users:', error.message);
    return;
  }

  const passwordMap: Record<string, string> = {
    'manager@pal.test': 'TestManager123!',
    'booker@pal.test': 'TestBooker123!',
    'staff@pal.test': 'TestStaff123!',
    'promoter@pal.test': 'TestPromoter123!',
    'artist@pal.test': 'TestArtist123!',
    'guest@pal.test': 'TestGuest123!',
  };

  for (const user of users.users) {
    const userEmail = user.email;
    if (!userEmail) continue;
    const newPassword = passwordMap[userEmail];
    if (newPassword) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );
      console.log(user.email + ': ' + (updateError ? updateError.message : 'password updated'));
    }
  }
}

updatePasswords();