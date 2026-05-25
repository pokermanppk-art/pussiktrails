import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap'
})

export const metadata: Metadata = {
  metadataBase: new URL('https://prussiktrails.vercel.app'),

  title: {
    default: 'PrussikTrails - Sua Aventura Começa Aqui',
    template: '%s | PrussikTrails'
  },

  description:
    'Plataforma de aventuras e trilhas. Conectamos guias especializados com aventureiros em busca de experiências únicas na natureza.',

  keywords: [
    'PrussikTrails',
    'trilhas',
    'aventura',
    'ecoturismo',
    'guia de montanha',
    'trekking',
    'natureza',
    'roteiros',
    'outdoor'
  ],

  authors: [{ name: 'PrussikTrails' }],
  creator: 'PrussikTrails',
  publisher: 'PrussikTrails',

  applicationName: 'PrussikTrails',

  manifest: '/manifest.webmanifest',

  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any'
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
    shortcut: [
      {
        url: '/favicon.ico',
        sizes: 'any'
      }
    ],
    apple: [
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png'
      }
    ]
  },

  appleWebApp: {
    capable: true,
    title: 'PrussikTrails',
    statusBarStyle: 'black-translucent'
  },

  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
    url: false
  },

  openGraph: {
    title: 'PrussikTrails - Sua Aventura Começa Aqui',
    description:
      'Plataforma de aventuras e trilhas. Conectamos guias especializados com aventureiros.',
    url: 'https://prussiktrails.vercel.app',
    siteName: 'PrussikTrails',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'PrussikTrails'
      }
    ]
  },

  twitter: {
    card: 'summary',
    title: 'PrussikTrails - Sua Aventura Começa Aqui',
    description: 'Plataforma de aventuras e trilhas',
    images: ['/icon-512.png']
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
    'msapplication-TileColor': '#dc2626',
    'msapplication-TileImage': '/icon-192.png'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#dc2626',
  colorScheme: 'light'
}

export default function RootLayout({
  children
}: {
  children: ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={inter.className}
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          background: '#ffffff'
        }}
      >
        {children}
      </body>
    </html>
  )
}