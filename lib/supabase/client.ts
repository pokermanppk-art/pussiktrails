import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error(
    'NEXT_PUBLIC_SUPABASE_URL não está configurada. Verifique o .env.local e as variáveis da Vercel.'
  )
}

if (!supabaseAnonKey) {
  console.error(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY não está configurada. Verifique o .env.local e as variáveis da Vercel.'
  )
}

/**
 * Cliente público do Supabase.
 *
 * IMPORTANTE:
 * Este arquivo é usado no front-end/client components.
 * Portanto, ele só pode usar variáveis NEXT_PUBLIC_*.
 *
 * NÃO colocar SUPABASE_SERVICE_ROLE_KEY aqui.
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'prussiktrails-web'
      }
    }
  }
)

export default supabase