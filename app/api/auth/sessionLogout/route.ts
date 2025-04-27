import { NextRequest, NextResponse } from 'next/server';
// import { cookies } from 'next/headers'; // No longer needed directly
import { getFirebaseAdmin } from '@/lib/firebaseAdmin'; // Use named import
import { getAuth } from 'firebase-admin/auth';       // Import getAuth service
import { deleteCookie } from 'cookies-next'; // Keep for deleting

const adminApp = getFirebaseAdmin(); // Get the initialized app instance
const auth = getAuth(adminApp);       // Get the Auth service instance

const SESSION_COOKIE_NAME = '__session';

export async function POST(request: NextRequest) {
  // Prepare a response object early to attach cookie operations to it
  const response = NextResponse.json({ status: 'logout initiated' }, { status: 200 });

  try {
    // Use standard request.cookies API to get the cookie value
    const sessionCookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookieValue) {
      // If there's no cookie, maybe the user is already logged out or it expired
      // Update the response body and return
      return NextResponse.json({ status: 'already logged out or no cookie' }, { status: 200 });
    }

    // Verify the cookie to get the user's UID for revocation
    // Use the auth service instance
    const decodedToken = await auth.verifySessionCookie(sessionCookieValue, true);

    // Revoke the session token on the Firebase server side
    // Use the auth service instance
    await auth.revokeRefreshTokens(decodedToken.sub); // sub is the user's UID

    // Delete the session cookie using cookies-next attached to our response
    deleteCookie(SESSION_COOKIE_NAME, { req: request, res: response, path: '/' });

    console.log('User session revoked and cookie cleared.');
    // Update the response body to indicate success and return it
    // Returning the response object ensures the deleteCookie headers are sent
    return NextResponse.json({ status: 'success' }, { status: 200, headers: response.headers });

  } catch (error) {
    console.error('Session logout error:', error);
    // Don't return a server error if logout fails, just log it.
    // Still try to clear the cookie as a best effort.
    deleteCookie(SESSION_COOKIE_NAME, { req: request, res: response, path: '/' });
    // Return an error status, making sure to include the cookie deletion header attempts
    return NextResponse.json({ error: 'Logout failed on server' }, { status: 500, headers: response.headers });
  }
}