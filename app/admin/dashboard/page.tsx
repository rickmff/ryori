// Server Component Wrapper for the Dashboard
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getFirebaseAdmin } from '@/lib/firebaseAdmin';
import DashboardClient from './DashboardClient'; // Import the client component
import { getAuth } from 'firebase-admin/auth'; // Import the auth service
import type { DecodedIdToken } from 'firebase-admin/auth'; // Import the type

const adminApp = getFirebaseAdmin(); // Get the initialized App instance
const auth = getAuth(adminApp); // Get the Auth service from the App

const SESSION_COOKIE_NAME = '__session';

// Reusable verification function
async function verifySessionCookie(sessionCookieValue: string | undefined): Promise<DecodedIdToken | null> { // Use imported type
  if (!sessionCookieValue) {
    return null;
  }
  try {
    // Use the imported auth service instance
    const decodedToken = await auth.verifySessionCookie(sessionCookieValue, true);
    return decodedToken;
  } catch (error) {
    console.error('Dashboard Server: Failed to verify session cookie:', error);
    return null;
  }
}

export default async function AdminDashboardPage() {
  const cookieStore = await cookies(); // Await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  const decodedToken = await verifySessionCookie(sessionCookie?.value);

  if (!decodedToken) {
    console.log('AdminDashboardPage: Verification failed or no cookie, redirecting...');
    redirect('/admin/login');
  }

  // If verification succeeds, render the Client Component part
  // Pass necessary data (like user email) as props
  console.log(`AdminDashboardPage: User ${decodedToken.email} verified server-side.`);
  return <DashboardClient userEmail={decodedToken.email || null} />;
}
