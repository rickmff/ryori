import { getFirebaseAdmin } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';

const adminApp = getFirebaseAdmin();
const auth = getAuth(adminApp);

/**
 * Verifies the Firebase session cookie server-side.
 * @param sessionCookieValue The value of the '__session' cookie.
 * @returns The decoded ID token if the cookie is valid, otherwise null.
 */
export async function verifySessionCookie(sessionCookieValue: string | undefined): Promise<DecodedIdToken | null> {
  if (!sessionCookieValue) {
    return null;
  }
  try {
    // Verify the session cookie using the correctly initialized auth service
    const decodedToken: DecodedIdToken = await auth.verifySessionCookie(sessionCookieValue, true /** checkRevoked */);
    return decodedToken;
  } catch (error: any) {
    // Log the *entire* error object for better debugging if needed
    console.error('Failed to verify session cookie:', error);
    return null;
  }
}