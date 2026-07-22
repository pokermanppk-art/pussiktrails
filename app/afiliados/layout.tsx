import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Portal de Afiliados',
  description:
    'Área exclusiva para afiliados PrussikTrails acompanharem indicações de guias e futuras comissões.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AffiliateLayout({ children }: { children: ReactNode }) {
  return children
}
