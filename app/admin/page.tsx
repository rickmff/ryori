// This page must now be a Server Component to perform server-side verification
// 'use client'; // REMOVE this line if present

import { cookies } from 'next/headers'; // Import cookies from next/headers
import { redirect } from 'next/navigation'; // Import redirect
import { verifySessionCookie } from '@/lib/serverAuth'; // Correct: Import the shared helper
// import { getCookie } from 'cookies-next'; // Reverting this
// import { useAuth } from '@/app/context/AuthContext'; // Cannot use client hooks directly

const SESSION_COOKIE_NAME = '__session';

// Make the component async
export default async function AdminPage() {
  // 1. Verify Authentication Server-Side
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  const decodedToken = await verifySessionCookie(sessionCookie?.value);

  if (!decodedToken) {
    // Redirect to login if not authenticated. This happens server-side.
    redirect('/admin/login');
  }

  // 2. If authenticated, render the page content
  // You can fetch server-side data here if needed
  const userEmail = decodedToken.email || 'No email provided';

  console.log(`AdminPage: Rendering for verified user ${userEmail}`);

  return (
    <div className="p-6">
      {/* Standard page header or layout elements can go here */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Admin Area</h1>
        <p className="text-sm text-muted-foreground">Welcome, {userEmail}</p>
      </header>

      <section>
        {/*
          Main content for the /admin page.
          - Fetch data server-side and display it.
          - Or, import and render Client Components for interactive sections.
          Example:
          <SomeClientComponent initialData={serverFetchedData} />
        */}
        <p>This is the main admin landing page.</p>
        {/* Add more content or client component placeholders below */}
      </section>
    </div>
  );
}

