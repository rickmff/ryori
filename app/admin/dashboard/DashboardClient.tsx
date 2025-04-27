'use client' // This is now the Client Component part

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Home } from "lucide-react"
import Link from "next/link"
import AvailabilityEditor from "@/components/admin/AvailabilityEditor"
import MenuEditor from "@/components/admin/MenuEditor"
// import { useAuth } from '@/app/context/AuthContext' // We might get user info via props now
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useState, useEffect } from "react" // Keep useState/useEffect if needed for UI logic

// Accept user email as a prop from the Server Component parent
interface DashboardClientProps {
  userEmail: string | null;
}

export default function DashboardClient({ userEmail }: DashboardClientProps) {
  // const { user, loading } = useAuth() // Replace with prop or remove if not needed
  const router = useRouter()
  const [isClientLoading, setIsClientLoading] = useState(false); // Example loading state for logout

  // Example: Client-side effect (though auth check is now server-side)
  // useEffect(() => {
  //  console.log("DashboardClient mounted");
  // }, []);

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

  // Optional: Loading state based on client-side actions like logout
  // if (isClientLoading) { ... }

  // The main check for user existence is done by the parent Server Component.
  // If this component renders, we assume the user is authenticated.

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Ryōri</span>
            <span className="text-sm text-muted-foreground hidden sm:inline">Painel Administrativo</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" asChild className="px-2 sm:px-4">
              <Link href="/">
                <Home className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ver Site</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={isClientLoading} className="px-2 sm:px-4">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{isClientLoading ? 'Saindo...' : 'Sair'}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Bem-vindo ao Painel</h1>
          {/* Display email passed via props */}
          {userEmail && <p className="text-sm sm:text-base text-muted-foreground">Logado como: {userEmail}</p>}
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie o menu do restaurante e configure os dias e horários disponíveis para reservas.
          </p>
        </div>

        <Tabs defaultValue="menu" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 mb-8">
            <TabsTrigger value="menu">Gerenciar Menu</TabsTrigger>
            <TabsTrigger value="availability">Gerenciar Disponibilidade</TabsTrigger>
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