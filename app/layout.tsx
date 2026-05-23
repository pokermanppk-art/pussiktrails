// app/layout.tsx

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap'
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#dc2626'
}

export const metadata: Metadata = {
  title: 'PrussikTrails - Sua Aventura Começa Aqui',
  description:
    'Plataforma de aventuras e trilhas. Conectamos guias especializados com aventureiros em busca de experiências únicas na natureza.',
  keywords:
    'trilhas, aventura, ecoturismo, guia de montanha, trekking, natureza, roteiros outdoor, rapel, expedições',
  authors: [{ name: 'PrussikTrails' }],
  creator: 'PrussikTrails',
  publisher: 'PrussikTrails',

  metadataBase: new URL('https://prussiktrails.vercel.app'),

  manifest: '/manifest.webmanifest',

  icons: {
    icon: [
      {
        url: '/favicon.ico'
      },
      {
        url: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        url: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ],
    apple: [
      {
        url: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      }
    ]
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PrussikTrails'
  },

  openGraph: {
    title: 'PrussikTrails - Sua Aventura Começa Aqui',
    description:
      'Plataforma de aventuras e trilhas. Conectamos guias especializados com aventureiros.',
    url: 'https://prussiktrails.vercel.app',
    siteName: 'PrussikTrails',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'PrussikTrails - Aventura na natureza'
      }
    ],
    locale: 'pt_BR',
    type: 'website'
  },

  twitter: {
    card: 'summary_large_image',
    title: 'PrussikTrails - Sua Aventura Começa Aqui',
    description: 'Plataforma de aventuras e trilhas',
    images: ['/og-image.jpg']
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },

  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'PrussikTrails',
    'format-detection': 'telephone=no',
    'msapplication-TileColor': '#dc2626',
    'color-scheme': 'light'
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />

        <link rel="icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/icon-192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="512x512"
          href="/icon-512.png"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PrussikTrails" />
        <meta property="og:locale" content="pt_BR" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        <link
          rel="dns-prefetch"
          href="https://ktlzltlrhnreqhprupvv.supabase.co"
        />
      </head>

      <body
        className={inter.className}
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          backgroundColor: '#f3f4f6'
        }}
      >
        {children}
      </body>
    </html>
  )
}