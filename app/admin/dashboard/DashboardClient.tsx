'use client' // This is now the Client Component part

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Home, CalendarDays, UtensilsCrossed } from "lucide-react"
import Link from "next/link"
import AvailabilityEditor from "@/components/admin/AvailabilityEditor"
import MenuEditor from "@/components/admin/MenuEditor"
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useState } from "react" // Keep useState/useEffect if needed for UI logic
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
interface DashboardClientProps {
  userEmail: string | null;
}

export default function DashboardClient({ userEmail }: DashboardClientProps) {
  const router = useRouter()
  const [isClientLoading, setIsClientLoading] = useState(false); // Example loading state for logout

  const handleLogout = async () => {
    setIsClientLoading(true);
    try {
      // Ensure auth is available before proceeding
      if (!auth) {
        throw new Error("Firebase Auth is not initialized on the client.");
      }
      await fetch('/api/auth/sessionLogout', { method: 'POST' });
      await signOut(auth); // auth is now guaranteed to be non-null here
      console.log('User logged out successfully from client and server session cleared.');
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Optionally show error to user
      router.push('/admin/login'); // Still attempt redirect
    } finally {
      setIsClientLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
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
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={isClientLoading} className="px-2 sm:px-4">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{isClientLoading ? 'Saindo...' : 'Sair'}</span>
            </Button>
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

        <Tabs defaultValue="menu" className="w-full">
          {/* Updated TabsList with card-like triggers */}
          <TabsList className="grid w-full h-full max-w-sm grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {/* Menu Tab Trigger */}
            <TabsTrigger value="menu" className="p-0"> {/* Remove default padding */}
              <div className="flex flex-col items-center justify-center gap-2 p-4 border rounded-md w-full h-full data-[state=active]:border-primary data-[state=active]:shadow-sm">
                <UtensilsCrossed className="h-6 w-6" />
                <span>Menu</span>
              </div>
            </TabsTrigger>
            {/* Availability Tab Trigger */}
            <TabsTrigger value="availability" className="p-0"> {/* Remove default padding */}
              <div className="flex flex-col items-center justify-center gap-2 p-4 border rounded-md w-full h-full data-[state=active]:border-primary data-[state=active]:shadow-sm">
                <CalendarDays className="h-6 w-6" />
                <span>Reservas</span>
              </div>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="menu">
            <MenuEditor />
          </TabsContent>
          <TabsContent value="availability">
            <AvailabilityEditor />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}