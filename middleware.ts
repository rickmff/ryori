import { NextRequest, NextResponse } from 'next/server';
// import admin from './lib/firebaseAdmin'; // No longer needed here
import { getCookie } from 'cookies-next';

const SESSION_COOKIE_NAME = '__session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login page is not protected
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Check if the path is under /admin (excluding /admin/login handled above)
  if (pathname.startsWith('/admin')) {
    const sessionCookie = getCookie(SESSION_COOKIE_NAME, { req: request });

    // If no session cookie, redirect to login immediately
    if (!sessionCookie) {
      console.log('Middleware: No session cookie, redirecting to login.');
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // If cookie exists, let the request proceed to the page.
    // The page itself (as a Server Component) will handle verification.
    console.log('Middleware: Session cookie found, proceeding to page for verification.');
    return NextResponse.next();
  }

  // For any other path, just continue
  return NextResponse.next();
}

// Configure the middleware to run only on specified paths
export const config = {
  matcher: [
    // Apply middleware to the login page and all admin sub-paths
    '/admin/login',
    '/admin/:path*',
  ],
};