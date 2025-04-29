'use client'

import { usePathname } from 'next/navigation'
import { NavBar } from '@/components/NavBar'
import React from 'react'

export function LayoutClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Define paths where NavBar should be hidden
  const hideNavBarPaths = ['/admin', '/login', '/register'] // Add any other paths as needed

  return (
    <>
      {!hideNavBarPaths.includes(pathname) && <NavBar />}
      {children}
    </>
  )
}