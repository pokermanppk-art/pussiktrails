'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Affiliate = {
  id: string
  nome: string
  email: string
  telefone?: string
  cpf_final?: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  criado_em?: string
  aprovado_em?: string | null
}

type GuideLead = {
  id: string
  guide_name: string
  guide_phone: string
  guide_email: string
  cadastur_number?: string | null
  status: string
  invitation_url: string
  invitation_expires_at: string
  created_at: string
  rejection_reason?: string | null
}

type GuideForm = {
  nome: string
  telefone: string
  email: string
  cadastur: string
}

const initialGuideForm: GuideForm = {
  nome: '',
  telefone: '',
  email: '',
  cadastur: '',
}

const statusLabels: Record<string, string> = {
  invitation_pending: 'Convite gerado',
  invitation_accessed: 'Convite visualizado',
  registration_started: 'Cadastro iniciado',
  registration_completed: 'Cadastro concluído',
  under_review: 'Em análise',
  approved: 'Guia aprovado',
  rejected: 'Não aprovado',
  expired: 'Convite expirado',
}

export default function AffiliateDashboardPage() {
  const router = useRouter()
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [leads, setLeads] = useState<GuideLead[]>([])
  const [form, setForm] = useState<GuideForm>(initialGuideForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success'>('success')

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const meResponse = await fetch('/api/afiliados/me', { cache: 'no-store' })
      const meData = await meResponse.json().catch(() => ({}))

      if (meResponse.status === 401) {
        router.replace('/afiliados/login')
        return
      }

      if (!meResponse.ok || !meData?.sucesso) {
        throw new Error(meData?.erro || 'Não foi possível carregar sua conta.')
      }

      setAffiliate(meData.afiliado)
      localStorage.setItem('affiliate', JSON.stringify(meData.afiliado))

      const guidesResponse = await fetch('/api/afiliados/guias', { cache: 'no-store' })
      const guidesData = await guidesResponse.json().catch(() => ({}))

      if (guidesResponse.ok && guidesData?.sucesso) {
        setLeads(Array.isArray(guidesData.guias) ? guidesData.guias : [])
      }
    } catch (error) {
      setMessageType('error')
      setMessage(error instanceof Error ? error.message : 'Não foi possível abrir o Portal.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const metrics = useMemo(() => {
    return {
      total: leads.length,
      pending: leads.filter((lead) =>
        ['invitation_pending', 'invitation_accessed', 'registration_started'].includes(lead.status),
      ).length,
      analysis: leads.filter((lead) =>
        ['registration_completed', 'under_review'].includes(lead.status),
      ).length,
      approved: leads.filter((lead) => lead.status === 'approved').length,
    }
  }, [leads])

  function onlyDigits(value: string) {
    return value.replace(/\D/g, '')
  }

  function formatPhone(value: string) {
    const numbers = onlyDigits(value).slice(0, 11)
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  }

  function updateForm(field: keyof GuideForm, value: string) {
    setMessage('')
    setForm((current) => ({
      ...current,
      [field]: field === 'telefone' ? formatPhone(value) : value,
    }))
  }

  async function submitGuide(event: FormEvent) {
    event.preventDefault()
    if (saving || affiliate?.status !== 'approved') return

    setSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/afiliados/guias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          nome: form.nome,
          telefone: onlyDigits(form.telefone),
          email: form.email,
          cadastur: form.cadastur,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data?.sucesso) {
        throw new Error(data?.erro || 'Não foi possível registrar a indicação.')
      }

      setMessageType('success')
      setMessage('Guia pré-cadastrado. O convite individual já está disponível abaixo.')
      setForm(initialGuideForm)
      await loadData()
    } catch (error) {
      setMessageType('error')
      setMessage(error instanceof Error ? error.message : 'Não foi possível registrar a indicação.')
    } finally {
      setSaving(false)
    }
  }

  async function copyInvite(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setMessageType('success')
      setMessage('Link de convite copiado.')
    } catch {
      setMessageType('error')
      setMessage('Não foi possível copiar automaticamente. Selecione o link e copie manualmente.')
    }
  }

  function openWhatsApp(lead: GuideLead) {
    const message = encodeURIComponent(
      `Olá, ${lead.guide_name}! Você foi convidado(a) para se cadastrar como guia na PrussikTrails. Complete seu cadastro pelo link: ${lead.invitation_url}`,
    )
    window.open(`https://wa.me/55${lead.guide_phone}?text=${message}`, '_blank', 'noopener,noreferrer')
  }

  async function logout() {
    await fetch('/api/afiliados/logout', { method: 'POST' }).catch(() => null)
    localStorage.removeItem('affiliate')
    router.replace('/afiliados/login')
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc' }}>
        <strong style={{ color: '#0f172a' }}>Carregando sua área de afiliado...</strong>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #eef2f7; }
        .page { min-height: 100vh; background: #eef2f7; color: #0f172a; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .topbar { position: sticky; top: 0; z-index: 20; display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 15px 28px; background: rgba(15,23,42,.96); color: white; border-bottom: 1px solid rgba(255,255,255,.08); backdrop-filter: blur(16px); }
        .brand strong { display: block; font-size: 17px; }
        .brand span { color: #86efac; font-size: 12px; font-weight: 800; }
        .topActions { display: flex; align-items: center; gap: 12px; }
        .userInfo { text-align: right; }
        .userInfo strong { display: block; font-size: 13px; }
        .userInfo span { color: #cbd5e1; font-size: 11px; }
        .logout { border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 10px 14px; background: rgba(255,255,255,.08); color: white; font-weight: 900; cursor: pointer; }
        .container { width: min(1180px, calc(100% - 28px)); margin: 0 auto; padding: 28px 0 50px; }
        .hero { border-radius: 30px; padding: 34px; color: white; background: linear-gradient(135deg, #0f172a 0%, #1e293b 72%, #14532d 130%); box-shadow: 0 22px 50px rgba(15,23,42,.18); }
        .heroGrid { display: grid; grid-template-columns: 1fr auto; gap: 25px; align-items: end; }
        .eyebrow { margin: 0 0 8px; color: #86efac; text-transform: uppercase; letter-spacing: .12em; font-size: 12px; font-weight: 950; }
        h1 { margin: 0; max-width: 760px; font-size: clamp(34px, 5vw, 58px); line-height: .98; letter-spacing: -.06em; }
        .hero p { max-width: 760px; color: #cbd5e1; line-height: 1.65; }
        .statusPill { align-self: start; border-radius: 999px; padding: 10px 14px; font-size: 12px; font-weight: 950; text-transform: uppercase; letter-spacing: .05em; }
        .status-approved { background: #86efac; color: #14532d; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .pendingNotice { margin-top: 20px; padding: 16px 18px; border-radius: 18px; background: rgba(254,243,199,.12); border: 1px solid rgba(253,230,138,.22); color: #fde68a; line-height: 1.55; }
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 18px 0; }
        .metric { padding: 21px; border-radius: 22px; background: rgba(255,255,255,.94); border: 1px solid rgba(15,23,42,.06); box-shadow: 0 12px 30px rgba(15,23,42,.07); }
        .metric span { color: #64748b; font-size: 12px; font-weight: 850; }
        .metric strong { display: block; margin-top: 8px; font-size: 31px; letter-spacing: -.04em; }
        .contentGrid { display: grid; grid-template-columns: .86fr 1.14fr; gap: 18px; align-items: start; }
        .card { border-radius: 26px; padding: 24px; background: rgba(255,255,255,.96); border: 1px solid rgba(15,23,42,.07); box-shadow: 0 14px 36px rgba(15,23,42,.07); }
        .card h2 { margin: 0; font-size: 24px; letter-spacing: -.035em; }
        .cardIntro { color: #64748b; line-height: 1.55; margin: 9px 0 19px; }
        form { display: grid; gap: 14px; }
        label { display: grid; gap: 7px; color: #334155; font-size: 13px; font-weight: 900; }
        input { width: 100%; border: 1px solid #dbe4f2; border-radius: 16px; padding: 14px 15px; background: #f8fafc; color: #0f172a; font-size: 15px; outline: none; }
        input:focus { background: white; border-color: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.11); }
        input:disabled { opacity: .65; cursor: not-allowed; }
        .submit { border: 0; border-radius: 999px; padding: 15px 18px; background: #22c55e; color: #052e16; font-size: 15px; font-weight: 950; cursor: pointer; box-shadow: 0 12px 25px rgba(34,197,94,.18); }
        .submit:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
        .message { margin-bottom: 16px; padding: 12px 14px; border-radius: 15px; font-size: 13px; line-height: 1.45; font-weight: 800; }
        .message.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .message.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .empty { padding: 26px; text-align: center; border-radius: 18px; background: #f8fafc; color: #64748b; border: 1px dashed #cbd5e1; }
        .leadList { display: grid; gap: 12px; }
        .lead { padding: 17px; border-radius: 19px; background: #f8fafc; border: 1px solid #e2e8f0; }
        .leadHeader { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; }
        .leadHeader strong { font-size: 16px; }
        .leadHeader small { display: block; margin-top: 4px; color: #64748b; }
        .leadStatus { border-radius: 999px; padding: 7px 10px; background: #e2e8f0; color: #334155; font-size: 11px; font-weight: 950; white-space: nowrap; }
        .leadDetails { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 14px; margin: 13px 0; color: #475569; font-size: 12px; }
        .invite { overflow-wrap: anywhere; padding: 10px 11px; border-radius: 12px; background: white; border: 1px solid #e2e8f0; color: #166534; font-size: 11px; }
        .leadActions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 11px; }
        .leadActions button { border: 0; border-radius: 999px; padding: 9px 12px; background: #0f172a; color: white; font-size: 11px; font-weight: 900; cursor: pointer; }
        .leadActions button.whatsapp { background: #16a34a; }
        @media (max-width: 900px) { .contentGrid { grid-template-columns: 1fr; } .metrics { grid-template-columns: 1fr 1fr; } .heroGrid { grid-template-columns: 1fr; } }
        @media (max-width: 600px) { .topbar { padding: 13px 16px; } .userInfo { display: none; } .container { width: min(100% - 20px, 1180px); padding-top: 18px; } .hero { padding: 25px 21px; border-radius: 25px; } .metrics { grid-template-columns: 1fr 1fr; gap: 10px; } .metric { padding: 17px; } .card { padding: 20px; border-radius: 22px; } .leadDetails { grid-template-columns: 1fr; } }
      `}</style>

      <header className="topbar">
        <div className="brand">
          <strong>PrussikTrails</strong>
          <span>Portal de Afiliados</span>
        </div>
        <div className="topActions">
          <div className="userInfo">
            <strong>{affiliate?.nome || 'Afiliado'}</strong>
            <span>{affiliate?.email}</span>
          </div>
          <button className="logout" onClick={logout}>Sair</button>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroGrid">
            <div>
              <p className="eyebrow">Central de indicações</p>
              <h1>Transforme conexões em novas jornadas.</h1>
              <p>
                Pré-cadastre guias, compartilhe o convite individual e acompanhe a
                evolução de cada indicação até a aprovação.
              </p>
            </div>
            <span className={`statusPill status-${affiliate?.status || 'pending'}`}>
              {affiliate?.status === 'approved' ? 'Cadastro aprovado' : 'Em análise'}
            </span>
          </div>

          {affiliate?.status !== 'approved' ? (
            <div className="pendingNotice">
              Sua solicitação foi recebida e está em análise. Você já pode acessar o
              Portal, mas o pré-cadastro de guias será liberado após a aprovação do ADM.
            </div>
          ) : null}
        </section>

        <section className="metrics">
          <div className="metric"><span>Total de indicações</span><strong>{metrics.total}</strong></div>
          <div className="metric"><span>Convites em andamento</span><strong>{metrics.pending}</strong></div>
          <div className="metric"><span>Cadastros em análise</span><strong>{metrics.analysis}</strong></div>
          <div className="metric"><span>Guias aprovados</span><strong>{metrics.approved}</strong></div>
        </section>

        {message ? <div className={`message ${messageType}`}>{message}</div> : null}

        <section className="contentGrid">
          <article className="card">
            <h2>Indicar um Guia</h2>
            <p className="cardIntro">
              Informe apenas Nome, Telefone, E-mail e Cadastur, caso o guia possua.
              O CPF será informado diretamente pelo próprio guia no cadastro oficial.
            </p>

            <form onSubmit={submitGuide}>
              <label>Nome completo do Guia
                <input value={form.nome} onChange={(event) => updateForm('nome', event.target.value)} placeholder="Nome e sobrenome" disabled={saving || affiliate?.status !== 'approved'} />
              </label>
              <label>Telefone
                <input value={form.telefone} onChange={(event) => updateForm('telefone', event.target.value)} placeholder="(11) 99999-9999" inputMode="tel" disabled={saving || affiliate?.status !== 'approved'} />
              </label>
              <label>E-mail
                <input value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="guia@email.com" type="email" disabled={saving || affiliate?.status !== 'approved'} />
              </label>
              <label>Cadastur, caso tenha
                <input value={form.cadastur} onChange={(event) => updateForm('cadastur', event.target.value)} placeholder="Número do Cadastur" disabled={saving || affiliate?.status !== 'approved'} />
              </label>
              <button className="submit" type="submit" disabled={saving || affiliate?.status !== 'approved'}>
                {saving ? 'Gerando convite...' : 'Pré-cadastrar e gerar convite'}
              </button>
            </form>
          </article>

          <article className="card">
            <h2>Meus Guias Indicados</h2>
            <p className="cardIntro">
              O vínculo permanece registrado desde o pré-cadastro e é confirmado quando
              o guia conclui o cadastro pelo convite.
            </p>

            {leads.length === 0 ? (
              <div className="empty">Nenhum guia indicado até o momento.</div>
            ) : (
              <div className="leadList">
                {leads.map((lead) => (
                  <div className="lead" key={lead.id}>
                    <div className="leadHeader">
                      <div>
                        <strong>{lead.guide_name}</strong>
                        <small>Indicado em {new Date(lead.created_at).toLocaleDateString('pt-BR')}</small>
                      </div>
                      <span className="leadStatus">{statusLabels[lead.status] || lead.status}</span>
                    </div>
                    <div className="leadDetails">
                      <span>E-mail: {lead.guide_email}</span>
                      <span>Telefone: {formatPhone(lead.guide_phone)}</span>
                      <span>Cadastur: {lead.cadastur_number || 'Não informado'}</span>
                      <span>Convite válido até: {new Date(lead.invitation_expires_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="invite">{lead.invitation_url}</div>
                    <div className="leadActions">
                      <button onClick={() => copyInvite(lead.invitation_url)}>Copiar convite</button>
                      <button className="whatsapp" onClick={() => openWhatsApp(lead)}>Enviar pelo WhatsApp</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  )
}
