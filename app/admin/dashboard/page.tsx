"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Home } from "lucide-react"
import Link from "next/link"
import AvailabilityEditor from "@/components/admin/AvailabilityEditor"
import MenuEditor from "@/components/admin/MenuEditor"

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar autenticação
    const adminAuth = localStorage.getItem("adminAuthenticated")
    if (adminAuth !== "true") {
      router.push("/admin")
    } else {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("adminAuthenticated")
    router.push("/admin")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Redirecionando para a página de login
  }

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
            <Button variant="outline" size="sm" onClick={handleLogout} className="px-2 sm:px-4">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Bem-vindo ao Painel</h1>
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
