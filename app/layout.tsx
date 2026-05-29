import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap'
})

const APP_URL = 'https://prussiktrails.com.br'
const ICON_VERSION = '20260529'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

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
    'outdoor',
    'experiências outdoor',
    'turismo de aventura'
  ],

  authors: [{ name: 'PrussikTrails' }],
  creator: 'PrussikTrails',
  publisher: 'PrussikTrails',

  applicationName: 'PrussikTrails',

  manifest: `/manifest.webmanifest?v=${ICON_VERSION}`,

  alternates: {
    canonical: APP_URL
  },

  icons: {
    icon: [
      {
        url: `/favicon.ico?v=${ICON_VERSION}`,
        sizes: 'any'
      },
      {
        url: `/favicon-16.png?v=${ICON_VERSION}`,
        sizes: '16x16',
        type: 'image/png'
      },
      {
        url: `/favicon-32.png?v=${ICON_VERSION}`,
        sizes: '32x32',
        type: 'image/png'
      },
      {
        url: `/icon-192.png?v=${ICON_VERSION}`,
        sizes: '192x192',
        type: 'image/png'
      },
      {
        url: `/icon-512.png?v=${ICON_VERSION}`,
        sizes: '512x512',
        type: 'image/png'
      }
    ],
    shortcut: [
      {
        url: `/favicon.ico?v=${ICON_VERSION}`,
        sizes: 'any'
      }
    ],
    apple: [
      {
        url: `/apple-touch-icon.png?v=${ICON_VERSION}`,
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
      'Plataforma de aventuras e trilhas. Conectamos guias especializados com aventureiros em busca de experiências únicas na natureza.',
    url: APP_URL,
    siteName: 'PrussikTrails',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: `/icon-512.png?v=${ICON_VERSION}`,
        width: 512,
        height: 512,
        alt: 'PrussikTrails'
      }
    ]
  },

  twitter: {
    card: 'summary',
    title: 'PrussikTrails - Sua Aventura Começa Aqui',
    description:
      'Plataforma de aventuras e trilhas conectando guias especializados e aventureiros.',
    images: [`/icon-512.png?v=${ICON_VERSION}`]
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
    'apple-mobile-web-app-title': 'PrussikTrails',
    'application-name': 'PrussikTrails',
    'msapplication-TileColor': '#203c2e',
    'msapplication-TileImage': `/icon-192.png?v=${ICON_VERSION}`
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#203c2e',
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
          background: '#fffdf7'
        }}
      >
        {children}
      </body>
    </html>
  )
}