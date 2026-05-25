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

  title: 'PrussikTrails - Sua Aventura Começa Aqui',
  description:
    'Plataforma de aventuras e trilhas. Conectamos guias especializados com aventureiros em busca de experiências únicas na natureza.',

  keywords: [
    'trilhas',
    'aventura',
    'ecoturismo',
    'guia de montanha',
    'trekking',
    'natureza',
    'PrussikTrails'
  ],

  authors: [{ name: 'PrussikTrails' }],
  creator: 'PrussikTrails',
  publisher: 'PrussikTrails',

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
    'msapplication-TileColor': '#dc2626'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  themeColor: '#dc2626',
  colorScheme: 'light'
}

export default function RootLayout({
  children
}: {
  children: ReactNode
}) {
  return (
    <html lang="pt-BR">
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