'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const LOGO_SRC = '/logo-login-montanha-prussik.jpg?v=20260528'

type AffiliateForm = {
  nome: string
  email: string
  telefone: string
  cpf: string
  data_nascimento: string
  senha: string
  confirmar_senha: string
}

const initialForm: AffiliateForm = {
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  data_nascimento: '',
  senha: '',
  confirmar_senha: '',
}

export default function AffiliateRegistrationPage() {
  const router = useRouter()
  const [form, setForm] = useState(initialForm)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [tipoMensagem, setTipoMensagem] = useState<'erro' | 'sucesso'>('erro')
  const [carregando, setCarregando] = useState(false)

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

  function formatCpf(value: string) {
    const numbers = onlyDigits(value).slice(0, 11)
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
  }

  function updateField(field: keyof AffiliateForm, value: string) {
    setMensagem('')

    setForm((current) => ({
      ...current,
      [field]: field === 'telefone' ? formatPhone(value) : field === 'cpf' ? formatCpf(value) : value,
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (carregando) return

    setMensagem('')

    if (!acceptedTerms || !acceptedPrivacy) {
      setTipoMensagem('erro')
      setMensagem('Confirme o aceite dos Termos e da Política de Privacidade.')
      return
    }

    setCarregando(true)

    try {
      const response = await fetch('/api/afiliados/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          ...form,
          telefone: onlyDigits(form.telefone),
          cpf: onlyDigits(form.cpf),
          aceitou_termos: acceptedTerms,
          aceitou_privacidade: acceptedPrivacy,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data?.sucesso) {
        throw new Error(data?.erro || 'Não foi possível enviar seu cadastro.')
      }

      setTipoMensagem('sucesso')
      setMensagem(
        'Solicitação enviada. A equipe PrussikTrails analisará seu cadastro antes de liberar as indicações.',
      )

      setTimeout(() => router.replace('/afiliados/login'), 1500)
    } catch (error) {
      setTipoMensagem('erro')
      setMensagem(
        error instanceof Error ? error.message : 'Não foi possível enviar seu cadastro.',
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="page">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #f8fafc; }
        .page {
          min-height: 100vh; min-height: 100dvh; padding: 22px 14px;
          display: grid; place-items: center;
          background:
            radial-gradient(circle at 8% 0%, rgba(34,197,94,.15), transparent 30%),
            radial-gradient(circle at 92% 8%, rgba(134,239,172,.12), transparent 28%),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          color: #0f172a;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .card { width: min(620px, 100%); padding: 30px; border-radius: 32px; background: rgba(255,255,255,.96); border: 1px solid rgba(15,23,42,.08); box-shadow: 0 24px 70px rgba(15,23,42,.14); }
        .brand { display: flex; justify-content: center; }
        .logoBox { width: 200px; height: 105px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .logoBox img { width: 200px; height: 200px; object-fit: contain; transform: scale(1.53); }
        .eyebrow { text-align: center; color: #16a34a; font-size: 12px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; margin: 5px 0 10px; }
        h1 { text-align: center; margin: 0; font-size: 38px; line-height: 1; letter-spacing: -.055em; }
        .intro { text-align: center; color: #64748b; line-height: 1.55; max-width: 510px; margin: 14px auto 25px; }
        form { display: grid; gap: 15px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        label.field { display: grid; gap: 8px; color: #334155; font-size: 13px; font-weight: 900; }
        .full { grid-column: 1 / -1; }
        input { width: 100%; border: 1px solid #dbe4f2; border-radius: 17px; padding: 15px 16px; background: #f1f5f9; color: #0f172a; font-size: 15px; outline: none; }
        input:focus { background: white; border-color: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.12); }
        .legal { display: grid; gap: 11px; padding: 15px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 18px; }
        .check { display: flex; gap: 10px; align-items: flex-start; color: #475569; font-size: 13px; line-height: 1.45; }
        .check input { width: 18px; height: 18px; margin-top: 1px; accent-color: #16a34a; flex: 0 0 auto; }
        .check a { color: #166534; font-weight: 900; }
        .message { padding: 12px 14px; border-radius: 16px; font-size: 13px; line-height: 1.45; font-weight: 800; text-align: center; }
        .erro { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .sucesso { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        button { border: 0; border-radius: 999px; padding: 16px 18px; font-size: 16px; font-weight: 950; cursor: pointer; }
        .primary { background: #22c55e; color: #052e16; box-shadow: 0 14px 28px rgba(34,197,94,.2); }
        .primary:hover:not(:disabled) { background: #16a34a; color: white; transform: translateY(-1px); }
        button:disabled { opacity: .65; cursor: not-allowed; }
        .links { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 18px; }
        .linkButton { background: transparent; color: #166534; padding: 5px; font-size: 14px; }
        .linkButton:hover { text-decoration: underline; }
        @media (max-width: 620px) { .card { padding: 25px 20px 29px; border-radius: 28px; } .grid { grid-template-columns: 1fr; } .full { grid-column: auto; } h1 { font-size: 32px; } }
      `}</style>

      <section className="card">
        <div className="brand"><div className="logoBox"><img src={LOGO_SRC} alt="PrussikTrails" /></div></div>
        <p className="eyebrow">Portal de Afiliados</p>
        <h1>Solicite seu cadastro.</h1>
        <p className="intro">
          Esta conta é exclusiva para o programa de afiliados. Você pode continuar
          usando normalmente sua conta de cliente ou guia no aplicativo principal.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="grid">
            <label className="field full">Nome completo
              <input value={form.nome} onChange={(event) => updateField('nome', event.target.value)} autoComplete="name" placeholder="Seu nome completo" disabled={carregando} />
            </label>
            <label className="field full">E-mail
              <input value={form.email} onChange={(event) => updateField('email', event.target.value)} type="email" autoComplete="email" placeholder="seuemail@email.com" disabled={carregando} />
            </label>
            <label className="field">Celular
              <input value={form.telefone} onChange={(event) => updateField('telefone', event.target.value)} type="tel" autoComplete="tel" placeholder="(11) 99999-9999" disabled={carregando} />
            </label>
            <label className="field">CPF
              <input value={form.cpf} onChange={(event) => updateField('cpf', event.target.value)} inputMode="numeric" placeholder="000.000.000-00" disabled={carregando} />
            </label>
            <label className="field full">Data de nascimento
              <input value={form.data_nascimento} onChange={(event) => updateField('data_nascimento', event.target.value)} type="date" autoComplete="bday" disabled={carregando} />
            </label>
            <label className="field">Senha
              <input value={form.senha} onChange={(event) => updateField('senha', event.target.value)} type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" disabled={carregando} />
            </label>
            <label className="field">Confirmar senha
              <input value={form.confirmar_senha} onChange={(event) => updateField('confirmar_senha', event.target.value)} type="password" autoComplete="new-password" placeholder="Repita sua senha" disabled={carregando} />
            </label>
          </div>

          <div className="legal">
            <label className="check">
              <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
              <span>Li e aceito os <Link href="/termos" target="_blank">Termos de Uso</Link> aplicáveis ao programa de afiliados.</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={acceptedPrivacy} onChange={(event) => setAcceptedPrivacy(event.target.checked)} />
              <span>Li e aceito a <Link href="/politica-de-privacidade" target="_blank">Política de Privacidade</Link>.</span>
            </label>
          </div>

          {mensagem ? <div className={`message ${tipoMensagem}`}>{mensagem}</div> : null}

          <button className="primary" type="submit" disabled={carregando}>
            {carregando ? 'Enviando solicitação...' : 'Enviar para análise'}
          </button>
        </form>

        <div className="links">
          <button className="linkButton" onClick={() => router.push('/afiliados/login')}>Já tenho cadastro. Entrar</button>
          <button className="linkButton" onClick={() => router.push('/afiliados')}>Voltar ao início</button>
        </div>
      </section>
    </main>
  )
}
