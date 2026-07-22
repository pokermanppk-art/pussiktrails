'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type AffiliateAdmin = {
  id: string
  full_name: string
  email: string
  phone: string
  cpf_last4: string
  birth_date: string
  status: string
  rejection_reason?: string | null
  approval_requested_at: string
  approved_at?: string | null
  created_at: string
  last_login_at?: string | null
}

export default function AdminAffiliatesPage() {
  const router = useRouter()
  const [authorizedUser, setAuthorizedUser] = useState(false)
  const [secret, setSecret] = useState('')
  const [affiliates, setAffiliates] = useState<AffiliateAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      const user = raw ? JSON.parse(raw) : null

      if (String(user?.tipo || '').toLowerCase() !== 'admin') {
        router.replace('/login')
        return
      }

      setAuthorizedUser(true)
      const savedSecret = sessionStorage.getItem('affiliateAdminSecret') || ''
      setSecret(savedSecret)
    } catch {
      router.replace('/login')
    }
  }, [router])

  async function loadAffiliates(customSecret = secret) {
    if (!customSecret.trim()) {
      setMessage('Informe o código administrativo da área de afiliados.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/afiliados', {
        cache: 'no-store',
        headers: {
          'x-affiliate-admin-secret': customSecret.trim(),
        },
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data?.sucesso) {
        throw new Error(data?.erro || 'Não foi possível carregar os afiliados.')
      }

      sessionStorage.setItem('affiliateAdminSecret', customSecret.trim())
      setAffiliates(Array.isArray(data.afiliados) ? data.afiliados : [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os afiliados.')
    } finally {
      setLoading(false)
    }
  }

  async function changeStatus(affiliate: AffiliateAdmin, status: string) {
    let reason = ''

    if (status === 'rejected') {
      reason = window.prompt('Informe o motivo da não aprovação:')?.trim() || ''
      if (!reason) return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`/api/admin/afiliados/${affiliate.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-affiliate-admin-secret': secret.trim(),
        },
        body: JSON.stringify({ status, motivo: reason }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data?.sucesso) {
        throw new Error(data?.erro || 'Não foi possível atualizar o afiliado.')
      }

      setMessage(`Status de ${affiliate.full_name} atualizado com sucesso.`)
      await loadAffiliates(secret)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o afiliado.')
    } finally {
      setLoading(false)
    }
  }

  if (!authorizedUser) return null

  return (
    <main className="page">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #eef2f7; }
        .page { min-height: 100vh; padding: 28px; background: #eef2f7; color: #0f172a; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .container { width: min(1200px, 100%); margin: 0 auto; }
        .hero { padding: 30px; border-radius: 28px; color: white; background: linear-gradient(135deg, #0f172a, #1e293b); box-shadow: 0 20px 45px rgba(15,23,42,.17); }
        .hero small { color: #86efac; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; }
        h1 { margin: 8px 0 10px; font-size: 42px; letter-spacing: -.055em; }
        .hero p { color: #cbd5e1; max-width: 760px; line-height: 1.6; }
        .access { display: grid; grid-template-columns: 1fr auto; gap: 12px; margin: 18px 0; padding: 18px; border-radius: 20px; background: white; border: 1px solid #e2e8f0; }
        input { width: 100%; border: 1px solid #cbd5e1; border-radius: 14px; padding: 13px 14px; font-size: 14px; outline: none; }
        input:focus { border-color: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.1); }
        button { border: 0; border-radius: 999px; padding: 11px 14px; font-size: 12px; font-weight: 950; cursor: pointer; }
        .load { background: #22c55e; color: #052e16; padding-inline: 22px; }
        .message { margin-bottom: 16px; padding: 12px 14px; border-radius: 15px; background: #f8fafc; color: #334155; border: 1px solid #cbd5e1; font-weight: 800; font-size: 13px; }
        .list { display: grid; gap: 12px; }
        .card { padding: 19px; border-radius: 21px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(15,23,42,.05); }
        .cardTop { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
        .cardTop h2 { margin: 0; font-size: 19px; }
        .cardTop p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
        .status { padding: 7px 10px; border-radius: 999px; background: #e2e8f0; color: #334155; font-size: 11px; font-weight: 950; text-transform: uppercase; }
        .details { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; color: #475569; font-size: 12px; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .approve { background: #22c55e; color: #052e16; }
        .reject { background: #fee2e2; color: #991b1b; }
        .suspend { background: #fef3c7; color: #92400e; }
        .pending { background: #e2e8f0; color: #334155; }
        @media (max-width: 760px) { .page { padding: 16px; } .access { grid-template-columns: 1fr; } .details { grid-template-columns: 1fr 1fr; } .cardTop { flex-direction: column; } }
      `}</style>

      <div className="container">
        <section className="hero">
          <small>PrussikTrails Admin</small>
          <h1>Afiliados</h1>
          <p>
            Analise as solicitações, aprove os afiliados e mantenha um histórico
            auditável das mudanças de status.
          </p>
        </section>

        <section className="access">
          <input
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            type="password"
            placeholder="Código administrativo definido na Vercel"
          />
          <button className="load" onClick={() => loadAffiliates()} disabled={loading}>
            {loading ? 'Carregando...' : 'Carregar afiliados'}
          </button>
        </section>

        {message ? <div className="message">{message}</div> : null}

        <section className="list">
          {affiliates.map((affiliate) => (
            <article className="card" key={affiliate.id}>
              <div className="cardTop">
                <div>
                  <h2>{affiliate.full_name}</h2>
                  <p>{affiliate.email} · {affiliate.phone}</p>
                </div>
                <span className="status">{affiliate.status}</span>
              </div>

              <div className="details">
                <span>CPF final: {affiliate.cpf_last4}</span>
                <span>Nascimento: {new Date(`${affiliate.birth_date}T12:00:00`).toLocaleDateString('pt-BR')}</span>
                <span>Solicitado: {new Date(affiliate.approval_requested_at).toLocaleDateString('pt-BR')}</span>
                <span>Último login: {affiliate.last_login_at ? new Date(affiliate.last_login_at).toLocaleString('pt-BR') : 'Ainda não acessou'}</span>
              </div>

              {affiliate.rejection_reason ? (
                <div className="message">Motivo: {affiliate.rejection_reason}</div>
              ) : null}

              <div className="actions">
                <button className="approve" onClick={() => changeStatus(affiliate, 'approved')} disabled={loading}>Aprovar</button>
                <button className="reject" onClick={() => changeStatus(affiliate, 'rejected')} disabled={loading}>Não aprovar</button>
                <button className="suspend" onClick={() => changeStatus(affiliate, 'suspended')} disabled={loading}>Suspender</button>
                <button className="pending" onClick={() => changeStatus(affiliate, 'pending')} disabled={loading}>Voltar para análise</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
