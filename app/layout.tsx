import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/app/context/AuthContext'
import { LayoutClientWrapper } from '@/components/LayoutClientWrapper'

export const metadata: Metadata = {
  title: 'Ryori',
  description: 'Ryori',
  generator: 'Ryori',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <LayoutClientWrapper>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </LayoutClientWrapper>
        </AuthProvider>
      </body>
    </html>
  )
}
