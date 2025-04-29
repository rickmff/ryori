'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export function LogoutButton() {
  const router = useRouter()
  const [isClientLoading, setIsClientLoading] = useState(false)

  const handleLogout = async () => {
    setIsClientLoading(true)
    try {
      if (!auth) {
        throw new Error("Firebase Auth is not initialized on the client.")
      }
      await fetch('/api/auth/sessionLogout', { method: 'POST' })
      await signOut(auth)
      console.log('User logged out successfully from client and server session cleared.')
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout failed:', error)
      router.push('/admin/login')
    } finally {
      setIsClientLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={isClientLoading} className="px-2 sm:px-4">
      <LogOut className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">{isClientLoading ? 'Saindo...' : 'Sair'}</span>
    </Button>
  )
}