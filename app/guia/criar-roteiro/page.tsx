import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function GuiaCriarRoteiroRedirectPage() {
  redirect('/guia/roteiros/novo')
}