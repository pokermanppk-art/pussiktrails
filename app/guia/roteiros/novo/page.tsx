'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type FormRoteiro = {
  titulo: string
  descricao: string
  local: string
  local_encontro: string
  data_roteiro: string
  hora_roteiro: string
  duracao: string
  dificuldade: string
  preco: string
  imagem_url: string
  observacoes: string
}

const formInicial: FormRoteiro = {
  titulo: '',
  descricao: '',
  local: '',
  local_encontro: '',
  data_roteiro: '',
  hora_roteiro: '',
  duracao: '',
  dificuldade: 'iniciante',
  preco: '',
  imagem_url: '',
  observacoes: ''
}

export default function NovoRoteiroPage() {
  const router = useRouter()
  const carregouRef = useRef(false)

  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState<FormRoteiro>(formInicial)
  const [arquivoImagem, setArquivoImagem] = useState<File | null>(null)
  const [previewImagem, setPreviewImagem] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro' | ''>('')

  useEffect(() => {
    if (carregouRef.current) return

    carregouRef.current = true
    iniciarPagina()
  }, [])

  useEffect(() => {
    return () => {
      if (previewImagem && previewImagem.startsWith('blob:')) {
        URL.revokeObjectURL(previewImagem)
      }
    }
  }, [previewImagem])

  const iniciarPagina = async () => {
    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.push('/login')
        return
      }

      const parsedUser = JSON.parse(userData)

      if (parsedUser.tipo !== 'guia') {
        router.push('/login')
        return
      }

      setUser(parsedUser)
    } catch (error) {
      console.error('Erro ao iniciar página de novo roteiro:', error)
      setMensagem('Erro ao validar usuário guia. Faça login novamente.')
      setTipoMensagem('erro')
    } finally {
      setCarregando(false)
    }
  }

  const atualizarCampo = (campo: keyof FormRoteiro, valor: string) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  const parsePreco = (valor: string) => {
    const normalizado = String(valor || '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.]/g, '')

    const numero = Number(normalizado)

    if (Number.isNaN(numero)) return 0

    return numero
  }

  const parseDuracaoHoras = (valor: string) => {
    const normalizado = String(valor || '')
      .replace(',', '.')
      .trim()

    const match = normalizado.match(/(\d+(\.\d+)?)/)

    if (!match?.[1]) return 0

    const numero = Number(match[1])

    if (Number.isNaN(numero)) return 0

    return numero
  }

  const limparFormulario = () => {
    setForm(formInicial)
    setArquivoImagem(null)

    if (previewImagem && previewImagem.startsWith('blob:')) {
      URL.revokeObjectURL(previewImagem)
    }

    setPreviewImagem('')
  }

  const handleImagemChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null

    setMensagem('')
    setTipoMensagem('')

    if (!file) {
      setArquivoImagem(null)
      setPreviewImagem('')
      return
    }

    const tiposPermitidos = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ]

    if (!tiposPermitidos.includes(file.type)) {
      setMensagem('Envie uma imagem em JPG, PNG ou WEBP.')
      setTipoMensagem('erro')
      setArquivoImagem(null)
      setPreviewImagem('')
      return
    }

    const limiteMb = 10
    const limiteBytes = limiteMb * 1024 * 1024

    if (file.size > limiteBytes) {
      setMensagem(`A imagem deve ter no máximo ${limiteMb}MB.`)
      setTipoMensagem('erro')
      setArquivoImagem(null)
      setPreviewImagem('')
      return
    }

    if (previewImagem && previewImagem.startsWith('blob:')) {
      URL.revokeObjectURL(previewImagem)
    }

    setArquivoImagem(file)
    setPreviewImagem(URL.createObjectURL(file))

    setForm((prev) => ({
      ...prev,
      imagem_url: ''
    }))
  }

  const removerImagemSelecionada = () => {
    setArquivoImagem(null)

    if (previewImagem && previewImagem.startsWith('blob:')) {
      URL.revokeObjectURL(previewImagem)
    }

    setPreviewImagem('')
  }

  const gerarNomeArquivoSeguro = (file: File) => {
    const extensao = file.name.split('.').pop()?.toLowerCase() || 'jpg'

    const nomeBase = file.name
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .slice(0, 50)

    const idGuia = user?.id || 'guia'

    const unique =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    return `${idGuia}/${Date.now()}-${unique}-${nomeBase || 'roteiro'}.${extensao}`
  }

  const uploadImagemRoteiro = async () => {
    if (!arquivoImagem) {
      return form.imagem_url.trim() || null
    }

    const filePath = gerarNomeArquivoSeguro(arquivoImagem)

    const { error: uploadError } = await supabase.storage
      .from('roteiros')
      .upload(filePath, arquivoImagem, {
        cacheControl: '3600',
        upsert: false,
        contentType: arquivoImagem.type
      })

    if (uploadError) {
      throw new Error(
        uploadError.message ||
          'Erro ao enviar imagem do roteiro. Verifique o bucket roteiros no Supabase Storage.'
      )
    }

    const {
      data: { publicUrl }
    } = supabase.storage
      .from('roteiros')
      .getPublicUrl(filePath)

    return publicUrl || null
  }

  const extrairColunaAusente = (error: any) => {
    const texto = [
      error?.message,
      error?.details,
      error?.hint
    ]
      .filter(Boolean)
      .join(' ')

    const matchAspasSimples = texto.match(/'([^']+)'/)

    if (matchAspasSimples?.[1]) {
      return matchAspasSimples[1]
    }

    const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)

    if (matchColumn?.[1]) {
      return matchColumn[1]
    }

    return ''
  }

  const erroDeColunaAusente = (error: any) => {
    const texto = String(
      error?.message ||
        error?.details ||
        error?.hint ||
        ''
    ).toLowerCase()

    return (
      error?.code === '42703' ||
      error?.code === 'PGRST204' ||
      texto.includes('could not find') ||
      texto.includes('schema cache') ||
      texto.includes('column')
    )
  }

  const inserirRoteiroComFallback = async (
    payloadOriginal: Record<string, any>
  ) => {
    let payloadAtual = { ...payloadOriginal }
    const colunasIgnoradas: string[] = []

    for (let tentativa = 0; tentativa < 12; tentativa++) {
      const { data, error } = await supabase
        .from('roteiros')
        .insert(payloadAtual)
        .select()
        .single()

      if (!error) {
        return {
          data,
          colunasIgnoradas
        }
      }

      if (!erroDeColunaAusente(error)) {
        throw error
      }

      const colunaAusente = extrairColunaAusente(error)

      if (!colunaAusente || !(colunaAusente in payloadAtual)) {
        throw error
      }

      delete payloadAtual[colunaAusente]
      colunasIgnoradas.push(colunaAusente)
    }

    throw new Error(
      'Não foi possível criar o roteiro após múltiplas tentativas.'
    )
  }

  const validarFormulario = () => {
    if (!form.titulo.trim()) {
      return 'Informe o título do roteiro.'
    }

    if (!form.descricao.trim()) {
      return 'Informe a descrição do roteiro.'
    }

    if (!form.local.trim()) {
      return 'Informe o local/região do roteiro.'
    }

    const preco = parsePreco(form.preco)

    if (!preco || preco <= 0) {
      return 'Informe um preço válido.'
    }

    if (!user?.id) {
      return 'Guia não identificado. Faça login novamente.'
    }

    return ''
  }

  const criarRoteiro = async (event: FormEvent) => {
    event.preventDefault()

    setMensagem('')
    setTipoMensagem('')

    const erroValidacao = validarFormulario()

    if (erroValidacao) {
      setMensagem(erroValidacao)
      setTipoMensagem('erro')
      return
    }

    setSalvando(true)

    try {
      const precoNumerico = parsePreco(form.preco)
      const duracaoHoras = parseDuracaoHoras(form.duracao)
      const imagemUrlFinal = await uploadImagemRoteiro()

      const localFinal = form.local.trim()

      const embarqueDataHora = [
        form.data_roteiro.trim(),
        form.hora_roteiro.trim()
      ]
        .filter(Boolean)
        .join(' - ')

      const payload: Record<string, any> = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),

        local: localFinal,
        localizacao: localFinal,

        dificuldade: form.dificuldade,
        preco: precoNumerico,
        imagem_url: imagemUrlFinal,
        id_guia: user.id,
        ativo: true,

        duracao: form.duracao.trim() || null,
        duracao_horas: duracaoHoras,

        local_encontro: form.local_encontro.trim() || null,
        data_roteiro: form.data_roteiro.trim() || null,
        hora_roteiro: form.hora_roteiro.trim() || null,
        embarque_data_hora: embarqueDataHora || null,

        observacoes: form.observacoes.trim() || null
      }

      const resultado = await inserirRoteiroComFallback(payload)

      if (resultado.colunasIgnoradas.length > 0) {
        console.warn(
          'Roteiro criado, mas algumas colunas não existem no banco:',
          resultado.colunasIgnoradas
        )

        setMensagem(
          `✅ Roteiro criado com sucesso. Atenção: algumas colunas ainda não existem no banco e foram ignoradas: ${resultado.colunasIgnoradas.join(', ')}.`
        )
      } else {
        setMensagem('✅ Roteiro criado com sucesso!')
      }

      setTipoMensagem('sucesso')
      limparFormulario()
    } catch (error: any) {
      console.error('Erro ao criar roteiro:', error)

      setMensagem(
        error?.message ||
          'Erro ao criar roteiro. Verifique as colunas da tabela roteiros e o bucket roteiros no Supabase.'
      )

      setTipoMensagem('erro')
    } finally {
      setSalvando(false)
    }
  }

  const sair = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const imagemPreviewFinal = previewImagem || form.imagem_url.trim() || ''

  if (carregando) {
    return (
      <main
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          color: '#6b7280'
        }}
      >
        Carregando criação de roteiro...
      </main>
    )
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
            radial-gradient(circle at top left, rgba(22, 163, 74, 0.08), transparent 32%),
            linear-gradient(180deg, #f9fafb 0%, #eef2f7 100%);
          color: #111827;
        }

        .header {
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          padding: 14px 18px;
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .header-inner {
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .brand-title {
          margin: 0;
          font-size: 21px;
          font-weight: 900;
          color: #dc2626;
        }

        .brand-subtitle {
          margin: 3px 0 0;
          color: #6b7280;
          font-size: 12px;
        }

        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn-light {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-dark {
          background: #111827;
          color: #ffffff;
        }

        .btn-green {
          background: #16a34a;
          color: #ffffff;
        }

        .btn-red {
          background: #dc2626;
          color: #ffffff;
        }

        .btn-outline {
          background: #ffffff;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 46px;
        }

        .intro {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 18px;
          margin-bottom: 18px;
        }

        .hero-card,
        .side-card,
        .form-card {
          background: #ffffff;
          border-radius: 26px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          border: 1px solid #eef2f7;
        }

        .hero-card {
          padding: 24px;
        }

        .hero-label {
          color: #16a34a;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }

        .hero-title {
          margin: 0;
          font-size: 30px;
          line-height: 1.05;
          color: #111827;
          font-weight: 900;
        }

        .hero-text {
          margin: 12px 0 0;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.65;
          max-width: 720px;
        }

        .side-card {
          padding: 20px;
        }

        .side-title {
          font-size: 15px;
          font-weight: 900;
          color: #111827;
          margin-bottom: 10px;
        }

        .side-list {
          display: grid;
          gap: 10px;
          color: #6b7280;
          font-size: 13px;
          line-height: 1.45;
        }

        .side-item {
          display: flex;
          gap: 8px;
        }

        .side-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #16a34a;
          margin-top: 6px;
          flex: 0 0 auto;
        }

        .form-card {
          padding: 22px;
        }

        .section-title {
          font-size: 17px;
          font-weight: 900;
          color: #111827;
          margin: 0 0 14px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .form-group.full {
          grid-column: 1 / -1;
        }

        label {
          font-size: 12px;
          font-weight: 800;
          color: #374151;
        }

        input,
        textarea,
        select {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 16px;
          padding: 12px 13px;
          font-size: 14px;
          color: #111827;
          background: #ffffff;
          outline: none;
          transition: 0.2s ease;
        }

        input:focus,
        textarea:focus,
        select:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.10);
        }

        textarea {
          min-height: 120px;
          resize: vertical;
          line-height: 1.55;
        }

        .helper {
          color: #9ca3af;
          font-size: 11px;
          line-height: 1.4;
        }

        .divider {
          margin: 22px 0;
          height: 1px;
          background: #eef2f7;
        }

        .alert {
          padding: 13px 14px;
          border-radius: 16px;
          margin-bottom: 16px;
          font-size: 13px;
          line-height: 1.45;
        }

        .alert.sucesso {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert.erro {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .submit-row {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 22px;
        }

        .upload-box {
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          border-radius: 22px;
          padding: 16px;
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 16px;
          align-items: stretch;
        }

        .image-preview {
          min-height: 170px;
          border-radius: 18px;
          background:
            linear-gradient(135deg, rgba(22, 163, 74, 0.10), rgba(220, 38, 38, 0.06)),
            #ffffff;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-size: 13px;
          text-align: center;
          padding: 14px;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          min-height: 170px;
          object-fit: cover;
          display: block;
        }

        .upload-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          justify-content: center;
        }

        .file-input {
          border: 1px solid #d1d5db;
          background: #ffffff;
          border-radius: 16px;
          padding: 12px;
          font-size: 13px;
        }

        .preview-card {
          margin-top: 20px;
          border-radius: 22px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          padding: 16px;
          display: grid;
          grid-template-columns: 160px minmax(0, 1fr);
          gap: 14px;
        }

        .preview-image {
          height: 120px;
          border-radius: 16px;
          overflow: hidden;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-size: 12px;
          text-align: center;
          padding: 10px;
        }

        .preview-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-title {
          font-weight: 900;
          color: #111827;
          margin-bottom: 6px;
        }

        .preview-line {
          color: #6b7280;
          font-size: 13px;
          line-height: 1.5;
        }

        .preview-price {
          color: #16a34a;
          font-weight: 900;
          margin-top: 8px;
        }

        @media (max-width: 900px) {
          .intro {
            grid-template-columns: 1fr;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .header-inner {
            align-items: flex-start;
          }

          .actions {
            width: 100%;
          }

          .actions .btn {
            flex: 1;
          }

          .upload-box,
          .preview-card {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .container {
            padding: 16px 12px 38px;
          }

          .hero-card,
          .side-card,
          .form-card {
            border-radius: 22px;
          }

          .hero-title {
            font-size: 24px;
          }

          .submit-row {
            flex-direction: column-reverse;
          }

          .submit-row .btn {
            width: 100%;
          }
        }
      `}</style>

      <header className="header">
        <div className="header-inner">
          <div>
            <h1 className="brand-title">PrussikTrails</h1>
            <p className="brand-subtitle">Criar novo roteiro como guia</p>
          </div>

          <div className="actions">
            <button
              type="button"
              className="btn btn-light"
              onClick={() => router.push('/guia/dashboard')}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="btn btn-dark"
              onClick={() => router.push('/guia/roteiros')}
            >
              Meus roteiros
            </button>

            <button
              type="button"
              className="btn btn-red"
              onClick={sair}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="intro">
          <div className="hero-card">
            <div className="hero-label">Novo roteiro</div>

            <h2 className="hero-title">
              Cadastre uma experiência para os aventureiros.
            </h2>

            <p className="hero-text">
              O guia pode enviar uma foto do roteiro, definir data, horário,
              local de encontro, duração, preço e orientações principais da
              experiência. O sistema salva tanto o campo novo local quanto o campo
              antigo localizacao, evitando erro de coluna obrigatória.
            </p>
          </div>

          <aside className="side-card">
            <div className="side-title">Compatibilidade do banco</div>

            <div className="side-list">
              <div className="side-item">
                <span className="side-dot" />
                <span>
                  Local do roteiro será salvo em local e também em localizacao.
                </span>
              </div>

              <div className="side-item">
                <span className="side-dot" />
                <span>
                  Duração em texto será salva em duracao e o número em duracao_horas.
                </span>
              </div>

              <div className="side-item">
                <span className="side-dot" />
                <span>
                  Se uma coluna opcional não existir, ela será ignorada automaticamente.
                </span>
              </div>
            </div>
          </aside>
        </section>

        {mensagem && (
          <div className={`alert ${tipoMensagem}`}>
            {mensagem}
          </div>
        )}

        <form className="form-card" onSubmit={criarRoteiro}>
          <h3 className="section-title">Informações principais</h3>

          <div className="form-grid">
            <div className="form-group full">
              <label>Título do roteiro *</label>
              <input
                value={form.titulo}
                onChange={(event) =>
                  atualizarCampo('titulo', event.target.value)
                }
                placeholder="Ex: Nascer do sol na Pedra Grande"
              />
            </div>

            <div className="form-group full">
              <label>Descrição *</label>
              <textarea
                value={form.descricao}
                onChange={(event) =>
                  atualizarCampo('descricao', event.target.value)
                }
                placeholder="Descreva a experiência, nível de esforço, pontos de destaque e orientações gerais..."
              />
            </div>

            <div className="form-group">
              <label>Local / região do roteiro *</label>
              <input
                value={form.local}
                onChange={(event) =>
                  atualizarCampo('local', event.target.value)
                }
                placeholder="Ex: Atibaia/SP, Serra da Mantiqueira..."
              />
              <span className="helper">
                Será salvo em local e localizacao.
              </span>
            </div>

            <div className="form-group">
              <label>Dificuldade</label>
              <select
                value={form.dificuldade}
                onChange={(event) =>
                  atualizarCampo('dificuldade', event.target.value)
                }
              >
                <option value="iniciante">Iniciante</option>
                <option value="facil">Fácil</option>
                <option value="moderado">Moderado</option>
                <option value="dificil">Difícil</option>
                <option value="avancado">Avançado</option>
              </select>
            </div>

            <div className="form-group">
              <label>Duração</label>
              <input
                value={form.duracao}
                onChange={(event) =>
                  atualizarCampo('duracao', event.target.value)
                }
                placeholder="Ex: 4 horas, meio período, dia inteiro..."
              />
              <span className="helper">
                Se houver número, o sistema salva também em duracao_horas.
              </span>
            </div>

            <div className="form-group">
              <label>Preço *</label>
              <input
                value={form.preco}
                onChange={(event) =>
                  atualizarCampo('preco', event.target.value)
                }
                placeholder="Ex: 150,00"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="divider" />

          <h3 className="section-title">Foto do roteiro</h3>

          <div className="upload-box">
            <div className="image-preview">
              {imagemPreviewFinal ? (
                <img src={imagemPreviewFinal} alt="Prévia do roteiro" />
              ) : (
                <span>A prévia da imagem aparecerá aqui.</span>
              )}
            </div>

            <div className="upload-actions">
              <div className="form-group">
                <label>Enviar foto do roteiro</label>
                <input
                  className="file-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImagemChange}
                />
                <span className="helper">
                  A imagem será enviada para o bucket roteiros no Supabase Storage.
                </span>
              </div>

              {arquivoImagem && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={removerImagemSelecionada}
                  disabled={salvando}
                >
                  Remover imagem selecionada
                </button>
              )}

              <div className="form-group">
                <label>Ou cole uma URL de imagem</label>
                <input
                  value={form.imagem_url}
                  onChange={(event) => {
                    atualizarCampo('imagem_url', event.target.value)

                    if (arquivoImagem) {
                      setArquivoImagem(null)
                    }

                    if (previewImagem && previewImagem.startsWith('blob:')) {
                      URL.revokeObjectURL(previewImagem)
                    }

                    setPreviewImagem('')
                  }}
                  placeholder="https://..."
                />
                <span className="helper">
                  Se enviar arquivo, a URL manual será ignorada.
                </span>
              </div>
            </div>
          </div>

          <div className="divider" />

          <h3 className="section-title">Data, horário e encontro</h3>

          <div className="form-grid">
            <div className="form-group full">
              <label>Local de encontro / embarque</label>
              <input
                value={form.local_encontro}
                onChange={(event) =>
                  atualizarCampo('local_encontro', event.target.value)
                }
                placeholder="Ex: Portaria principal do parque, posto BR, estacionamento..."
              />
            </div>

            <div className="form-group">
              <label>Data do roteiro</label>
              <input
                value={form.data_roteiro}
                onChange={(event) =>
                  atualizarCampo('data_roteiro', event.target.value)
                }
                placeholder="Ex: 15/07/2026 ou a combinar"
              />
              <span className="helper">
                Campo livre para evitar erro de calendário ou fuso.
              </span>
            </div>

            <div className="form-group">
              <label>Horário</label>
              <input
                value={form.hora_roteiro}
                onChange={(event) =>
                  atualizarCampo('hora_roteiro', event.target.value)
                }
                placeholder="Ex: 07h30 ou saída ao amanhecer"
              />
            </div>

            <div className="form-group full">
              <label>Observações adicionais</label>
              <textarea
                value={form.observacoes}
                onChange={(event) =>
                  atualizarCampo('observacoes', event.target.value)
                }
                placeholder="Ex: levar água, lanterna, agasalho, documento, tolerância de atraso, política de clima..."
              />
            </div>
          </div>

          <div className="preview-card">
            <div className="preview-image">
              {imagemPreviewFinal ? (
                <img src={imagemPreviewFinal} alt="Prévia final do roteiro" />
              ) : (
                <span>Sem imagem</span>
              )}
            </div>

            <div>
              <div className="preview-title">Prévia rápida do roteiro</div>

              <div className="preview-line">
                <strong>Título:</strong> {form.titulo || 'Ainda não informado'}
              </div>

              <div className="preview-line">
                <strong>Local:</strong> {form.local || 'Ainda não informado'}
              </div>

              <div className="preview-line">
                <strong>Duração:</strong> {form.duracao || 'A definir'} |{' '}
                <strong>Horas:</strong> {parseDuracaoHoras(form.duracao)}
              </div>

              <div className="preview-line">
                <strong>Encontro:</strong> {form.local_encontro || 'A definir'}
              </div>

              <div className="preview-line">
                <strong>Data:</strong> {form.data_roteiro || 'A definir'}
              </div>

              <div className="preview-line">
                <strong>Horário:</strong> {form.hora_roteiro || 'A definir'}
              </div>

              <div className="preview-price">
                R$ {parsePreco(form.preco).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="submit-row">
            <button
              type="button"
              className="btn btn-light"
              onClick={limparFormulario}
              disabled={salvando}
            >
              Limpar
            </button>

            <button
              type="submit"
              className="btn btn-green"
              disabled={salvando}
            >
              {salvando ? 'Salvando roteiro...' : 'Criar roteiro'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}