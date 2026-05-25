'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type FormCadastro = {
  nome: string
  email: string
  telefone: string
  cpf: string
  data_nascimento: string
  senha: string
  confirmar_senha: string
  tipo: 'cliente' | 'guia'
}

const formInicial: FormCadastro = {
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  data_nascimento: '',
  senha: '',
  confirmar_senha: '',
  tipo: 'cliente'
}

export default function CadastroPage() {
  const router = useRouter()

  const [form, setForm] = useState<FormCadastro>(formInicial)
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [tipoMensagem, setTipoMensagem] = useState<'erro' | 'sucesso' | ''>('')

  useEffect(() => {
    const userData = localStorage.getItem('user')

    if (!userData) return

    try {
      const user = JSON.parse(userData)

      if (user?.tipo === 'cliente') {
        router.replace('/cliente/dashboard')
        return
      }

      if (user?.tipo === 'guia') {
        router.replace('/guia/dashboard')
        return
      }

      if (user?.tipo === 'admin') {
        router.replace('/admin/dashboard')
      }
    } catch {
      localStorage.removeItem('user')
    }
  }, [router])

  const somenteNumeros = (valor: string) => {
    return String(valor || '').replace(/\D/g, '')
  }

  const formatarTelefone = (valor: string) => {
    const numeros = somenteNumeros(valor).slice(0, 11)

    if (numeros.length <= 2) {
      return numeros
    }

    if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    }

    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
  }

  const formatarCpf = (valor: string) => {
    const numeros = somenteNumeros(valor).slice(0, 11)

    if (numeros.length <= 3) {
      return numeros
    }

    if (numeros.length <= 6) {
      return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
    }

    if (numeros.length <= 9) {
      return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`
    }

    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`
  }

  const atualizarCampo = (campo: keyof FormCadastro, valor: string) => {
    if (campo === 'telefone') {
      setForm((prev) => ({
        ...prev,
        telefone: formatarTelefone(valor)
      }))
      return
    }

    if (campo === 'cpf') {
      setForm((prev) => ({
        ...prev,
        cpf: formatarCpf(valor)
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  const validarEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validarFormulario = () => {
    const nome = form.nome.trim()
    const email = form.email.trim().toLowerCase()
    const telefone = somenteNumeros(form.telefone)
    const cpf = somenteNumeros(form.cpf)

    if (!nome) {
      return 'Informe seu nome.'
    }

    if (!email || !validarEmail(email)) {
      return 'Informe um e-mail válido.'
    }

    if (!telefone || telefone.length < 10) {
      return 'Informe um celular válido.'
    }

    if (!cpf || cpf.length !== 11) {
      return 'Informe um CPF válido.'
    }

    if (!form.data_nascimento) {
      return 'Informe sua data de nascimento.'
    }

    if (!form.senha || form.senha.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres.'
    }

    if (form.senha !== form.confirmar_senha) {
      return 'As senhas não conferem.'
    }

    return ''
  }

  const cadastrar = async (event: FormEvent) => {
    event.preventDefault()

    setMensagem('')
    setTipoMensagem('')

    const erroValidacao = validarFormulario()

    if (erroValidacao) {
      setMensagem(erroValidacao)
      setTipoMensagem('erro')
      return
    }

    setCarregando(true)

    try {
      const response = await fetch('/api/cadastro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          telefone: form.telefone.trim(),
          celular: form.telefone.trim(),
          cpf: somenteNumeros(form.cpf),
          data_nascimento: form.data_nascimento,
          nascimento: form.data_nascimento,
          senha: form.senha,
          password: form.senha,
          confirmar_senha: form.confirmar_senha,
          tipo: form.tipo
        })
      })

      const texto = await response.text()

      let data: any = null

      try {
        data = texto ? JSON.parse(texto) : null
      } catch {
        throw new Error('A rota de cadastro retornou uma resposta inválida.')
      }

      if (!response.ok || !data?.sucesso) {
        throw new Error(
          data?.erro ||
            data?.message ||
            'Não foi possível realizar o cadastro.'
        )
      }

      const usuario = {
        id: data.usuario?.id,
        nome: data.usuario?.nome || form.nome.trim(),
        email: data.usuario?.email || form.email.trim().toLowerCase(),
        tipo: data.usuario?.tipo || form.tipo
      }

      localStorage.setItem('user', JSON.stringify(usuario))

      setMensagem('Cadastro realizado com sucesso!')
      setTipoMensagem('sucesso')

      setTimeout(() => {
        if (usuario.tipo === 'guia') {
          router.replace('/guia/dashboard')
          return
        }

        router.replace('/cliente/dashboard')
      }, 600)
    } catch (error: any) {
      console.error('Erro ao cadastrar:', error)

      setMensagem(
        error?.message ||
          'Erro ao cadastrar. Verifique os dados e tente novamente.'
      )
      setTipoMensagem('erro')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f3f4f6;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .page {
          min-height: 100vh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at top left, rgba(22, 163, 74, 0.10), transparent 30%),
            linear-gradient(180deg, #ffffff 0%, #eef2f7 100%);
          color: #111827;
        }

        .topBar {
          height: 64px;
          background: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
        }

        .topLogo {
          height: 42px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .container {
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          padding: 26px 18px 44px;
        }

        .card {
          background: #ffffff;
          border-radius: 32px;
          padding: 28px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.10);
          border: 1px solid #eef2f7;
        }

        .brand {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .brand img {
          height: 70px;
          width: auto;
          object-fit: contain;
        }

        .title {
          margin: 0;
          text-align: center;
          font-size: 30px;
          font-weight: 900;
          color: #111827;
          letter-spacing: -0.04em;
        }

        .subtitle {
          margin: 8px auto 24px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.55;
          max-width: 440px;
        }

        .tipoBox {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 18px;
        }

        .tipoButton {
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          color: #374151;
          border-radius: 999px;
          padding: 13px 14px;
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .tipoButton.active {
          background: #111827;
          border-color: #111827;
          color: #ffffff;
        }

        .form {
          display: grid;
          gap: 15px;
        }

        .formGroup {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        label {
          font-size: 13px;
          font-weight: 800;
          color: #374151;
        }

        input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 15px 16px;
          font-size: 16px;
          color: #111827;
          background: #ffffff;
          outline: none;
          transition: 0.2s ease;
        }

        input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.12);
        }

        input::placeholder {
          color: #9ca3af;
        }

        .message {
          padding: 14px 16px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.45;
          text-align: center;
          font-weight: 700;
        }

        .message.erro {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .message.sucesso {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .submitButton {
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 16px;
          background: #15803d;
          color: #ffffff;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s ease;
          margin-top: 8px;
        }

        .submitButton:hover:not(:disabled) {
          background: #166534;
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(22, 101, 52, 0.22);
        }

        .submitButton:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 14px;
          margin: 22px 0;
          color: #9ca3af;
          font-size: 14px;
        }

        .divider::before,
        .divider::after {
          content: "";
          height: 1px;
          background: #e5e7eb;
        }

        .loginButton {
          width: 100%;
          border: 1px solid #16a34a;
          border-radius: 999px;
          padding: 15px;
          background: #ffffff;
          color: #16a34a;
          font-size: 17px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .loginButton:hover {
          background: #f0fdf4;
        }

        .hint {
          margin: 14px 0 0;
          text-align: center;
          color: #9ca3af;
          font-size: 12px;
          line-height: 1.45;
        }

        @media (max-width: 520px) {
          .topBar {
            height: 62px;
          }

          .container {
            padding: 20px 14px 34px;
          }

          .card {
            border-radius: 28px;
            padding: 24px 18px;
          }

          .brand img {
            height: 60px;
          }

          .title {
            font-size: 26px;
          }

          input {
            font-size: 16px;
            padding: 14px 15px;
          }

          .submitButton {
            font-size: 17px;
          }
        }
      `}</style>

      <header className="topBar">
        <img
          src="/logo-prussik-display.png"
          alt="PrussikTrails"
          className="topLogo"
        />
      </header>

      <div className="container">
        <section className="card">
          <div className="brand">
            <img
              src="/logo-prussik-display.png"
              alt="PrussikTrails"
            />
          </div>

          <h1 className="title">Criar conta</h1>

          <p className="subtitle">
            Cadastre-se para reservar roteiros, acompanhar suas aventuras e acessar o app PrussikTrails.
          </p>

          <div className="tipoBox">
            <button
              type="button"
              className={`tipoButton ${form.tipo === 'cliente' ? 'active' : ''}`}
              onClick={() => atualizarCampo('tipo', 'cliente')}
            >
              Sou cliente
            </button>

            <button
              type="button"
              className={`tipoButton ${form.tipo === 'guia' ? 'active' : ''}`}
              onClick={() => atualizarCampo('tipo', 'guia')}
            >
              Sou guia
            </button>
          </div>

          <form className="form" onSubmit={cadastrar}>
            <div className="formGroup">
              <label>Nome completo *</label>
              <input
                value={form.nome}
                onChange={(event) =>
                  atualizarCampo('nome', event.target.value)
                }
                placeholder="Seu nome completo"
                autoComplete="name"
              />
            </div>

            <div className="formGroup">
              <label>E-mail *</label>
              <input
                value={form.email}
                onChange={(event) =>
                  atualizarCampo('email', event.target.value)
                }
                placeholder="seuemail@email.com"
                type="email"
                autoComplete="email"
              />
            </div>

            <div className="formGroup">
              <label>Celular *</label>
              <input
                value={form.telefone}
                onChange={(event) =>
                  atualizarCampo('telefone', event.target.value)
                }
                placeholder="(11) 98888-8888"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>

            <div className="formGroup">
              <label>CPF *</label>
              <input
                value={form.cpf}
                onChange={(event) =>
                  atualizarCampo('cpf', event.target.value)
                }
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            <div className="formGroup">
              <label>Data de nascimento *</label>
              <input
                value={form.data_nascimento}
                onChange={(event) =>
                  atualizarCampo('data_nascimento', event.target.value)
                }
                type="date"
                autoComplete="bday"
              />
            </div>

            <div className="formGroup">
              <label>Senha *</label>
              <input
                value={form.senha}
                onChange={(event) =>
                  atualizarCampo('senha', event.target.value)
                }
                type="password"
                placeholder="Mínimo de 6 caracteres"
                autoComplete="new-password"
              />
            </div>

            <div className="formGroup">
              <label>Confirmar senha *</label>
              <input
                value={form.confirmar_senha}
                onChange={(event) =>
                  atualizarCampo('confirmar_senha', event.target.value)
                }
                type="password"
                placeholder="Digite a senha novamente"
                autoComplete="new-password"
              />
            </div>

            {mensagem && (
              <div className={`message ${tipoMensagem}`}>
                {mensagem}
              </div>
            )}

            <button
              type="submit"
              className="submitButton"
              disabled={carregando}
            >
              {carregando ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>

          <div className="divider">ou</div>

          <button
            type="button"
            className="loginButton"
            onClick={() => router.push('/login')}
          >
            Já tenho conta
          </button>

          <p className="hint">
            Ao cadastrar, você poderá acessar o app instalado pelo celular.
          </p>
        </section>
      </div>
    </main>
  )
}