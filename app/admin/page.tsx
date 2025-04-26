"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock } from "lucide-react"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Senha simples para demonstração - em produção, use um sistema de autenticação adequado
  const ADMIN_PASSWORD = "admin123"

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Simulando um delay de autenticação
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        // Em produção, use um sistema de autenticação adequado com tokens JWT ou similar
        localStorage.setItem("adminAuthenticated", "true")
        router.push("/admin/dashboard")
      } else {
        setError("Senha incorreta. Tente novamente.")
      }
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">Área Administrativa</CardTitle>
          <CardDescription className="text-center">
            Acesse o painel administrativo do Restaurante Ryōri
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite a senha de administrador"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Autenticando..." : "Acessar Painel"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground text-center w-full">
            Esta é uma área restrita apenas para administradores do restaurante.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
