import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';
import { canAccessRoute, type AppRole } from '@/lib/permissions';

// Routes that require authentication (any role)
const PROTECTED_ROUTES = [
  '/artists',
  '/events',
  '/door',
  '/staff',
  '/workflow',
  '/guest-lists',
  '/venues',
  '/admin',
  '/inventory',
  '/rentals',
];

// Routes that are always accessible (public routes)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/auth',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create response and Supabase client
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createMiddlewareClient(request, response);

  // Refresh session if it exists
  const { data: { session } } = await supabase.auth.getSession();

  // Check if current path is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if current path is public
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // If accessing a protected route without a session, redirect to login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If logged in and trying to access login/signup, redirect to home
  if (session && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Role-based access control for protected routes
  if (session && isProtectedRoute && pathname !== '/') {
    // Fetch ALL user roles from user_roles table (multi-role support)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    // Map to array of roles
    const userRoles: AppRole[] = (roleData?.map(r => r.role as AppRole)) || [];

    // Check if ANY of the user's roles grants access to this route
    if (!canAccessRoute(userRoles, pathname)) {
      // Redirect to dashboard with no error shown (user just doesn't have access)
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
