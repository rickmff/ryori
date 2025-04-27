import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebaseAdmin'; // Use named import
import { getAuth } from 'firebase-admin/auth';       // Import getAuth service

const adminApp = getFirebaseAdmin(); // Get the initialized app instance
const auth = getAuth(adminApp);       // Get the Auth service instance

// Define the session cookie name and options
const SESSION_COOKIE_NAME = '__session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5; // 5 days

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      console.error('Session login error: ID token missing in request body.');
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    console.log('Session login: Verifying ID token...');
    // Use the auth service instance to verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log(`Session login: Token verified for UID: ${decodedToken.uid}`);

    // Optional: Check for custom claims or specific user properties if needed
    // Example: if (!decodedToken.isAdmin) { return NextResponse.json({ error: 'Unauthorized' }, { status: 403 }); }

    console.log('Session login: Creating session cookie...');
    // Use the auth service instance to create the session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_SECONDS * 1000 });
    console.log('Session login: Session cookie created.');

    // Create the initial response *before* setting the cookie
    const response = NextResponse.json({ status: 'success' }, { status: 200 });

    console.log('Session login: Setting cookie directly on NextResponse...');
    // Set the cookie directly on the NextResponse object
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development',
      sameSite: 'lax',
    });
    console.log('Session login: Cookie set command issued.');

    // Return the response with the Set-Cookie header attached
    return response;

  } catch (error) {
    console.error('Session login error during processing:', error);
    // Return a different status code for server errors
    return NextResponse.json({ error: 'Authentication failed during session creation' }, { status: 500 });
  }
}