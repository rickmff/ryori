import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/app/context/AuthContext'
import { LayoutClientWrapper } from '@/components/LayoutClientWrapper'

export const metadata: Metadata = {
  title: 'Ryori Restaurante',
  description: 'Ryori Restaurante - Convidamos-o a embarcar numa viagem gastronómica única que funde a tradição portuguesa com a sofisticação da culinária japonesa. O nosso nome, "Ryōri" (料理), significa "arte de cozinhar" em japonês, refletindo a nossa dedicação à excelência culinária.',
  generator: 'Ryori Restaurante',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" />
        <meta name="google-site-verification" content="y0I8IQ4ZJuwlPib7wxqweHnGxcYg6kr2IUdMWSqGyco" />
      </head>
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
