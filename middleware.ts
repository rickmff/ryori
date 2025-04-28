import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_DASHBOARD_PATH = '/admin/dashboard';
const ADMIN_BASE_PATH = '/admin';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session')?.value;
  const absoluteUrl = (path: string) => new URL(path, request.url).toString();

  let isUserAuthenticated = false;

  // 1. Check authentication status by calling the API route if cookie exists
  if (sessionCookie) {
    try {
      const response = await fetch(absoluteUrl('/api/auth/verifySession'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionCookie }),
      });

      if (response.ok) {
        const data = await response.json();
        isUserAuthenticated = data.isAuthenticated;
        // console.log(`Middleware: API verification result: ${isUserAuthenticated}`);
      } else {
        // API route returned an error (e.g., 401 Unauthorized)
        isUserAuthenticated = false;
        // console.warn('Middleware: API verification failed with status:', response.status);
      }
    } catch (error) {
      // Network error calling the API route
      console.error('Middleware: Error calling verification API:', error);
      isUserAuthenticated = false;
      // Handle this case? Maybe redirect to an error page or login?
      // For now, treat as unauthenticated.
    }
  } else {
    // console.log('Middleware: No session cookie found.');
    isUserAuthenticated = false;
  }

  // 2. Handle Redirections based on authentication status and path
  const isRequestingAdminRoute = pathname.startsWith(ADMIN_BASE_PATH);
  const isRequestingLoginPage = pathname === ADMIN_LOGIN_PATH;

  if (isRequestingAdminRoute) {
    // Scenario A: User IS authenticated (according to API)
    if (isUserAuthenticated) {
      // If authenticated user is trying to access login page, redirect to dashboard
      if (isRequestingLoginPage) {
        console.log('Middleware: Authenticated user accessing login page. Redirecting to dashboard.');
        return NextResponse.redirect(absoluteUrl(ADMIN_DASHBOARD_PATH));
      }
      // Otherwise, allow access to the requested admin page
      return NextResponse.next();
    }
    // Scenario B: User is NOT authenticated (according to API or no cookie)
    else {
      // If unauthenticated user is trying to access login page, allow it
      if (isRequestingLoginPage) {
        return NextResponse.next();
      }
      // If unauthenticated user is trying to access any other admin page, redirect to login
      else {
        // Clear potentially invalid cookie before redirecting to login
        const response = NextResponse.redirect(absoluteUrl(ADMIN_LOGIN_PATH));
        if (sessionCookie) { // Only clear if one was present
          response.cookies.set('__session', '', { maxAge: 0, path: '/' });
          console.log('Middleware: Unauthenticated/invalid session. Clearing cookie and redirecting to login.');
        } else {
          console.log('Middleware: Unauthenticated user accessing protected admin page. Redirecting to login.');
        }
        return response;
      }
    }
  }

  // 3. Allow access to non-admin routes
  return NextResponse.next();
}

// Keep the same matcher configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Match /admin and /admin/* paths specifically
     */
    '/admin/:path*',
  ],
};