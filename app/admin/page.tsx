// Server Component Wrapper for the Dashboard
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getFirebaseAdmin } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { Home } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LogoutButton } from './components/LogoutButton';
import { AdminTabs } from './components/AdminTabs';

const adminApp = getFirebaseAdmin();
const auth = getAuth(adminApp);

const SESSION_COOKIE_NAME = '__session';

// Reusable verification function
async function verifySessionCookie(sessionCookieValue: string | undefined): Promise<DecodedIdToken | null> {
  if (!sessionCookieValue) {
    return null;
  }
  try {
    const decodedToken = await auth.verifySessionCookie(sessionCookieValue, true);
    return decodedToken;
  } catch (error) {
    console.error('Dashboard Server: Failed to verify session cookie:', error);
    return null;
  }
}

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  const decodedToken = await verifySessionCookie(sessionCookie?.value);

  if (!decodedToken) {
    console.log('AdminDashboardPage: Verification failed or no cookie, redirecting...');
    redirect('/admin/login');
  }

  const userEmail = decodedToken.email || null;
  console.log(`AdminDashboardPage: User ${userEmail} verified server-side.`);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Ryōri</span>
            <span className="text-sm text-muted-foreground hidden sm:inline">Painel Administrativo</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="outline" size="sm" asChild className="px-2 sm:px-4">
              <Link href="/">
                <Home className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ver Site</span>
              </Link>
            </Button>
            <LogoutButton />
            {userEmail && (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground hidden sm:inline">
                  {userEmail}
                </p>
                <Avatar>
                  <AvatarImage src={userEmail} />
                  <AvatarFallback>
                    {userEmail.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container py-6">
        <AdminTabs />
      </main>
    </div>
  );
}
