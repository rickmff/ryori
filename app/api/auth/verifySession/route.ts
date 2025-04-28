import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';

// Initialize Admin SDK
const adminApp = getFirebaseAdmin();
const auth = getAuth(adminApp);

export async function POST(request: NextRequest) {
  try {
    const { sessionCookie } = await request.json();

    if (!sessionCookie) {
      return NextResponse.json({ isAuthenticated: false, error: 'Session cookie missing' }, { status: 400 });
    }

    // Verify the session cookie
    await auth.verifySessionCookie(sessionCookie, true); // Check revocation

    // If verification succeeds, the user is authenticated
    return NextResponse.json({ isAuthenticated: true });

  } catch (error) {
    // If verification fails, the user is not authenticated
    // console.error('API verifySession Error:', error);
    return NextResponse.json({ isAuthenticated: false, error: 'Invalid or expired session' }, { status: 401 });
  }
}