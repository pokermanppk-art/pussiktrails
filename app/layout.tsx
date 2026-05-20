// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PrussikTrails - Sua Aventura Começa Aqui',
  description: 'Plataforma de aventuras e trilhas. Conectamos guias especializados com aventureiros em busca de experiências únicas na natureza.',
  keywords: 'trilhas, aventura, ecoturismo, guia de montanha, trekking, natureza',
  authors: [{ name: 'PrussikTrails' }],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: true,
  },
  themeColor: '#dc2626',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'PrussikTrails - Sua Aventura Começa Aqui',
    description: 'Plataforma de aventuras e trilhas. Conectamos guias especializados com aventureiros.',
    url: 'https://prussiktrails.com',
    siteName: 'PrussikTrails',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'PrussikTrails - Aventura na natureza',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrussikTrails - Sua Aventura Começa Aqui',
    description: 'Plataforma de aventuras e trilhas',
    images: ['/og-image.jpg'],
  },
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Meta tags para PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PrussikTrails" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#dc2626" />
        
        {/* Meta tags para redes sociais */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PrussikTrails" />
        <meta property="og:locale" content="pt_BR" />
        
        {/* Meta tags para mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover" />
        
        {/* Pré-conexões para melhor performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://your-project.supabase.co" />
        
        {/* Tema claro/escuro */}
        <meta name="color-scheme" content="light" />
        
        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.className} style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}