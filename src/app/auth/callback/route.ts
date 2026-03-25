import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful authentication - redirect to the requested page or home
      return NextResponse.redirect(new URL(next, request.url));
    }

    // Error exchanging code - redirect to login with error
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(redirectUrl);
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}
