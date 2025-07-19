import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/app/context/AuthContext'
import { LayoutClientWrapper } from '@/components/LayoutClientWrapper'

export const metadata: Metadata = {
  title: {
    default: 'Ryōri Restaurante - Fusão Portuguesa e Japonesa em Setúbal',
    template: '%s | Ryōri Restaurante'
  },
  description: 'Ryōri Restaurante em Setúbal - Convidamos-o a embarcar numa viagem gastronómica única que funde a tradição portuguesa com a sofisticação da culinária japonesa. Reservas: +351 968 217 889',
  keywords: [
    'restaurante Setúbal',
    'cozinha portuguesa',
    'cozinha japonesa',
    'fusão culinária',
    'Ryōri restaurante',
    'jantar Setúbal',
    'reservas restaurante',
    'gastronomia portuguesa',
    'sushi português',
    'fine dining Setúbal'
  ],
  authors: [{ name: 'Ryōri Restaurante' }],
  creator: 'Ryōri Restaurante',
  publisher: 'Ryōri Restaurante',
  generator: 'Ryōri Restaurante',

  // OpenGraph metadata
  openGraph: {
    title: 'Ryōri Restaurante - Fusão Portuguesa e Japonesa em Setúbal',
    description: 'Venha viajar connosco pelos sabores da cuzinha tradicional Portuguesa e Japonesa. Localizado no PC Marquês de Pombal 2A, Setúbal.',
    url: 'https://ryorirestaurant.com',
    siteName: 'Ryōri Restaurante',
    images: [
      {
        url: 'https://ryorirestaurant.com/ryori-hero.jpg',
        width: 1200,
        height: 630,
        alt: 'Ryōri Restaurante - Interior elegante com vista para a cozinha',
      },
    ],
    locale: 'pt_PT',
    type: 'website',
  },

  // Twitter metadata
  twitter: {
    card: 'summary_large_image',
    title: 'Ryōri Restaurante - Fusão Portuguesa e Japonesa',
    description: 'Experiência gastronómica única em Setúbal. Reservas: +351 968 217 889',
    images: ['https://ryorirestaurant.com/ryori-hero.jpg'],
  },

  // Additional metadata
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  verification: {
    google: 'y0I8IQ4ZJuwlPib7wxqweHnGxcYg6kr2IUdMWSqGyco',
  },

  // Manifest and other PWA-related metadata
  manifest: '/manifest.json',

  // Alternative languages if you add them later
  alternates: {
    canonical: 'https://ryorirestaurant.com',
    languages: {
      'pt-PT': 'https://ryorirestaurant.com',
    }
  },

  // Category for business
  category: 'restaurant',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="google-site-verification" content="y0I8IQ4ZJuwlPib7wxqweHnGxcYg6kr2IUdMWSqGyco" />

        {/* Business-specific meta tags */}
        <meta name="geo.region" content="PT-15" />
        <meta name="geo.placename" content="Setúbal" />
        <meta name="geo.position" content="38.5244;-8.8882" />
        <meta name="ICBM" content="38.5244, -8.8882" />

        {/* Restaurant-specific tags */}
        <meta name="restaurant:contact_info:phone_number" content="+351968217889" />
        <meta name="restaurant:contact_info:street_address" content="PC Marquês de Pombal 2A" />
        <meta name="restaurant:contact_info:locality" content="Setúbal" />
        <meta name="restaurant:contact_info:postal_code" content="2900-562" />
        <meta name="restaurant:contact_info:country_name" content="Portugal" />

        {/* Google Analytics - Replace with your actual GA4 tracking ID */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'GA_MEASUREMENT_ID');
            `,
          }}
        />
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
