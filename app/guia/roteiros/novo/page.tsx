'use client'

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type UsuarioLocal = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
}

type RoteiroCriado = {
  id: string
  titulo?: string | null
  nome?: string | null
  [key: string]: any
}

type DificuldadeValue = 'facil' | 'medio' | 'dificil'

const DIFICULDADES: Array<{
  value: DificuldadeValue
  label: string
  descricao: string
}> = [
  {
    value: 'facil',
    label: 'Fácil',
    descricao: 'Boa para iniciantes e experiências leves.'
  },
  {
    value: 'medio',
    label: 'Médio',
    descricao: 'Exige um pouco mais de preparo físico.'
  },
  {
    value: 'dificil',
    label: 'Difícil',
    descricao: 'Experiência mais intensa, para pessoas preparadas.'
  }
]

export default function GuiaNovoRoteiroPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [local, setLocal] = useState('')
  const [dataRoteiro, setDataRoteiro] = useState('')
  const [horaRoteiro, setHoraRoteiro] = useState('')
  const [preco, setPreco] = useState('')
  const [duracaoHoras, setDuracaoHoras] = useState('1')
  const [km, setKm] = useState('')
  const [limitePessoas, setLimitePessoas] = useState('10')
  const [dificuldade, setDificuldade] = useState<DificuldadeValue>('facil')
  const [recorrencia, setRecorrencia] = useState('Experiência única')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState('')

  useEffect(() => {
    if (iniciouRef.current) return

    iniciouRef.current = true
    iniciar()
  }, [])

  const iniciar = async () => {
    setCarregando(true)
    setErro('')

    try {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.replace('/login')
        return
      }

      const parsedUser = JSON.parse(userData) as UsuarioLocal

      if (parsedUser.tipo !== 'guia') {
        router.replace('/login')
        return
      }

      setUser(parsedUser)
    } catch (error) {
      console.error('Erro ao iniciar criação de roteiro:', error)
      setErro('Não foi possível carregar sua sessão.')
    } finally {
      setCarregando(false)
    }
  }

  const normalizarNumero = (valor: string, fallback = 0) => {
    const limpo = String(valor || '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.]/g, '')

    const numero = Number(limpo)

    if (!Number.isFinite(numero)) return fallback

    return numero
  }

  const tituloUsuario = (usuario?: UsuarioLocal | null) => {
    return usuario?.nome || usuario?.name || usuario?.email || 'Guia'
  }

  const limparTexto = (valor: any) => {
    return String(valor || '').trim()
  }

  const extrairColunaAusente = (error: any) => {
    const texto = [error?.message, error?.details, error?.hint]
      .filter(Boolean)
      .join(' ')

    const matchAspas = texto.match(/'([^']+)'/)

    if (matchAspas?.[1]) return matchAspas[1]

    const matchColumn = texto.match(/column\s+([a-zA-Z0-9_]+)/i)

    if (matchColumn?.[1]) return matchColumn[1]

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

  const erroDeConstraintDificuldade = (error: any) => {
    const texto = String(
      error?.message ||
        error?.details ||
        error?.hint ||
        ''
    ).toLowerCase()

    return (
      error?.code === '23514' &&
      (
        texto.includes('dificuldade') ||
        texto.includes('roteiros_dificuldade_check')
      )
    )
  }

  const variantesDificuldade = (valor: DificuldadeValue) => {
    if (valor === 'facil') {
      return ['facil', 'Fácil', 'Facil', 'fácil']
    }

    if (valor === 'medio') {
      return ['medio', 'Médio', 'Medio', 'médio', 'media', 'Média', 'moderado', 'Moderado']
    }

    return ['dificil', 'Difícil', 'Dificil', 'difícil', 'avancado', 'Avançado', 'avancada', 'Avançada']
  }

  const inserirRoteiroComFallbackDeColunas = async (
    payloadOriginal: Record<string, any>
  ) => {
    let payloadAtual = { ...payloadOriginal }
    const colunasIgnoradas: string[] = []

    for (let tentativa = 0; tentativa < 20; tentativa++) {
      const { data, error } = await supabase
        .from('roteiros')
        .insert(payloadAtual)
        .select('*')
        .maybeSingle()

      if (!error) {
        return {
          data: data as RoteiroCriado | null,
          colunasIgnoradas
        }
      }

      if (!erroDeColunaAusente(error)) {
        throw error
      }

      const coluna = extrairColunaAusente(error)

      if (!coluna || !(coluna in payloadAtual)) {
        throw error
      }

      delete payloadAtual[coluna]
      colunasIgnoradas.push(coluna)
    }

    throw new Error('Não foi possível criar o roteiro após ajustar as colunas.')
  }

  const inserirRoteiroComFallbackDificuldade = async (
    payloadBase: Record<string, any>
  ) => {
    const variantes = variantesDificuldade(dificuldade)
    let ultimoErro: any = null

    for (const dificuldadeTentativa of variantes) {
      try {
        const resultado = await inserirRoteiroComFallbackDeColunas({
          ...payloadBase,
          dificuldade: dificuldadeTentativa
        })

        return {
          ...resultado,
          dificuldadeUsada: dificuldadeTentativa
        }
      } catch (error: any) {
        ultimoErro = error

        if (!erroDeConstraintDificuldade(error)) {
          throw error
        }

        console.warn(
          `Dificuldade "${dificuldadeTentativa}" recusada pelo check constraint. Tentando próxima...`,
          error
        )
      }
    }

    throw ultimoErro || new Error('Dificuldade não aceita pela tabela roteiros.')
  }

  const atualizarRoteiroComFallback = async (
    roteiroId: string,
    payloadOriginal: Record<string, any>
  ) => {
    let payloadAtual = { ...payloadOriginal }

    for (let tentativa = 0; tentativa < 15; tentativa++) {
      const { error } = await supabase
        .from('roteiros')
        .update(payloadAtual)
        .eq('id', roteiroId)

      if (!error) return true

      if (!erroDeColunaAusente(error)) {
        console.warn('Erro ao atualizar roteiro:', error)
        return false
      }

      const coluna = extrairColunaAusente(error)

      if (!coluna || !(coluna in payloadAtual)) {
        console.warn('Erro ao atualizar roteiro sem coluna identificada:', error)
        return false
      }

      delete payloadAtual[coluna]
    }

    return false
  }

  const uploadFotoRoteiro = async (roteiroId: string) => {
    if (!fotoFile || !user?.id) return ''

    try {
      const extensao =
        fotoFile.name.split('.').pop()?.toLowerCase() ||
        'jpg'

      const caminho = `roteiros/${user.id}/${roteiroId}-${Date.now()}.${extensao}`

      const { error } = await supabase.storage
        .from('roteiros')
        .upload(caminho, fotoFile, {
          upsert: true,
          contentType: fotoFile.type || 'image/jpeg'
        })

      if (error) {
        console.warn('Erro ao enviar foto para o bucket roteiros:', error)
        return ''
      }

      const { data } = supabase.storage
        .from('roteiros')
        .getPublicUrl(caminho)

      return data?.publicUrl || ''
    } catch (error) {
      console.warn('Erro inesperado no upload da foto:', error)
      return ''
    }
  }

  const garantirGrupoDoRoteiro = async (roteiroId: string) => {
    if (!roteiroId) return null

    try {
      const response = await fetch('/api/grupos/garantir-grupo-roteiro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roteiroId
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.sucesso) {
        console.warn('Grupo do roteiro não foi criado automaticamente:', data)
        return null
      }

      return data?.grupo || null
    } catch (error) {
      console.warn('Erro ao garantir grupo do roteiro:', error)
      return null
    }
  }

  const handleFotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null

    setFotoFile(file)

    if (!file) {
      setFotoPreview('')
      return
    }

    const url = URL.createObjectURL(file)
    setFotoPreview(url)
  }

  const validarFormulario = () => {
    const tituloLimpo = limparTexto(titulo)
    const descricaoLimpa = limparTexto(descricao)
    const localLimpo = limparTexto(local)
    const precoNumero = normalizarNumero(preco, 0)
    const duracaoNumero = Math.max(1, Math.round(normalizarNumero(duracaoHoras, 1)))
    const limiteNumero = Math.max(1, Math.round(normalizarNumero(limitePessoas, 10)))

    if (!tituloLimpo) {
      return 'Informe o título do roteiro.'
    }

    if (!descricaoLimpa) {
      return 'Informe uma descrição para o roteiro.'
    }

    if (!localLimpo) {
      return 'Informe o local ou ponto de encontro.'
    }

    if (precoNumero <= 0) {
      return 'Informe um valor por pessoa maior que zero.'
    }

    if (duracaoNumero <= 0) {
      return 'Informe uma duração válida.'
    }

    if (limiteNumero <= 0) {
      return 'Informe o limite de pessoas.'
    }

    return ''
  }

  const limparFormulario = () => {
    setTitulo('')
    setDescricao('')
    setLocal('')
    setDataRoteiro('')
    setHoraRoteiro('')
    setPreco('')
    setDuracaoHoras('1')
    setKm('')
    setLimitePessoas('10')
    setDificuldade('facil')
    setRecorrencia('Experiência única')
    setFotoFile(null)
    setFotoPreview('')
  }

  const criarRoteiro = async (event: FormEvent) => {
    event.preventDefault()

    if (!user?.id) {
      router.replace('/login')
      return
    }

    setErro('')
    setMensagem('')

    const erroValidacao = validarFormulario()

    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    setSalvando(true)

    try {
      const tituloLimpo = limparTexto(titulo)
      const descricaoLimpa = limparTexto(descricao)
      const localLimpo = limparTexto(local)
      const dataLimpa = limparTexto(dataRoteiro)
      const horaLimpa = limparTexto(horaRoteiro)
      const precoNumero = normalizarNumero(preco, 0)
      const duracaoNumero = Math.max(1, Math.round(normalizarNumero(duracaoHoras, 1)))
      const kmNumero = normalizarNumero(km, 0)
      const limiteNumero = Math.max(1, Math.round(normalizarNumero(limitePessoas, 10)))
      const recorrenciaLimpa = limparTexto(recorrencia) || 'Experiência única'

      const agora = new Date().toISOString()

      const payloadBase: Record<string, any> = {
        titulo: tituloLimpo,
        nome: tituloLimpo,

        descricao: descricaoLimpa,

        preco: precoNumero,
        valor: precoNumero,

        id_guia: user.id,
        guia_id: user.id,

        local: localLimpo,
        localizacao: localLimpo,
        local_encontro: localLimpo,
        ponto_encontro: localLimpo,

        data_roteiro: dataLimpa || null,
        data_saida: dataLimpa || null,
        data: dataLimpa || null,

        hora_roteiro: horaLimpa || null,
        hora_saida: horaLimpa || null,
        hora: horaLimpa || null,

        duracao_horas: duracaoNumero,
        duracao: `${duracaoNumero}h`,

        km: kmNumero,
        distancia_km: kmNumero,

        limite_pessoas: limiteNumero,
        capacidade: limiteNumero,
        max_pessoas: limiteNumero,

        recorrencia: recorrenciaLimpa,
        frequencia: recorrenciaLimpa,

        status: 'pendente',
        ativo: false,

        created_at: agora,
        updated_at: agora
      }

      const resultado = await inserirRoteiroComFallbackDificuldade(payloadBase)
      const roteiroCriado = resultado.data

      if (!roteiroCriado?.id) {
        setErro('O roteiro foi criado, mas não foi possível localizar o ID.')
        return
      }

      let fotoUrl = ''

      if (fotoFile) {
        fotoUrl = await uploadFotoRoteiro(roteiroCriado.id)

        if (fotoUrl) {
          await atualizarRoteiroComFallback(roteiroCriado.id, {
            foto_url: fotoUrl,
            foto_capa: fotoUrl,
            imagem_url: fotoUrl,
            imagem: fotoUrl,
            updated_at: new Date().toISOString()
          })
        }
      }

      const grupo = await garantirGrupoDoRoteiro(roteiroCriado.id)

      setMensagem(
        grupo?.id
          ? 'Roteiro criado com sucesso. O grupo interno foi preparado automaticamente.'
          : 'Roteiro criado com sucesso. O grupo interno poderá ser preparado depois.'
      )

      limparFormulario()

      setTimeout(() => {
        router.push('/guia/roteiros')
      }, 900)
    } catch (error: any) {
      console.error('Erro ao criar roteiro:', error)

      const texto = String(error?.message || '').toLowerCase()

      if (texto.includes('duracao_horas')) {
        setErro('O campo duração é obrigatório. Informe a duração em horas.')
      } else if (texto.includes('dificuldade') || texto.includes('roteiros_dificuldade_check')) {
        setErro('A dificuldade escolhida não foi aceita pelo banco. Use Fácil, Médio ou Difícil.')
      } else {
        setErro(error?.message || 'Não foi possível criar o roteiro.')
      }
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <main className="loading">
        <style>{`
          * { box-sizing: border-box; }

          body {
            margin: 0;
            background: #f6f7f1;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          .loading {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(circle at top left, rgba(132, 204, 22, 0.18), transparent 30%),
              linear-gradient(180deg, #fffdf7 0%, #eef2e5 100%);
            color: #374151;
          }

          .loadingCard {
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 30px;
            padding: 28px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
            text-align: center;
          }

          .loadingCard img {
            height: 68px;
            width: auto;
            margin-bottom: 12px;
          }
        `}</style>

        <div className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <div>Preparando criação de roteiro...</div>
        </div>
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
          background: #f6f7f1;
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
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          color: #172018;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255, 253, 247, 0.86);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(18px);
          padding: 10px 16px;
        }

        .headerInner {
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          min-width: 0;
        }

        .brand img {
          height: 42px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .brandTitle {
          font-size: 18px;
          font-weight: 950;
          color: #dc2626;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .brandSub {
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          margin-top: 3px;
        }

        .headerActions {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .iconBtn {
          height: 38px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255,255,255,0.78);
          border-radius: 999px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          transition: 0.2s ease;
          color: #172018;
          white-space: nowrap;
        }

        .iconBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.10);
        }

        .iconBtn.primary {
          background: #172018;
          color: #ffffff;
          border-color: #172018;
        }

        .iconBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 16px 48px;
        }

        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 38px;
          padding: 30px;
          min-height: 315px;
          background:
            linear-gradient(135deg, rgba(23, 32, 24, 0.76), rgba(23, 32, 24, 0.34)),
            radial-gradient(circle at top right, rgba(190, 242, 100, 0.30), transparent 34%),
            linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%);
          color: #ffffff;
          box-shadow: 0 24px 60px rgba(23, 32, 24, 0.18);
          margin-bottom: 16px;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: linear-gradient(to bottom, black, transparent);
          pointer-events: none;
        }

        .heroContent {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 24px;
          align-items: end;
          min-height: 255px;
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.26);
          background: rgba(255, 255, 255, 0.12);
          color: #f7fee7;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .heroTitle {
          margin: 0;
          max-width: 760px;
          font-size: clamp(40px, 6vw, 70px);
          line-height: 0.92;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .heroTitle span {
          color: #bef264;
          text-shadow: 0 0 28px rgba(190, 242, 100, 0.32);
        }

        .heroText {
          max-width: 650px;
          color: rgba(255,255,255,0.82);
          line-height: 1.62;
          margin: 16px 0 0;
          font-size: 14px;
        }

        .heroCard {
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 30px;
          padding: 20px;
          backdrop-filter: blur(16px);
        }

        .heroCardLabel {
          color: rgba(255,255,255,0.76);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .heroCardValue {
          margin-top: 9px;
          color: #ffffff;
          font-size: 28px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .heroCardText {
          margin-top: 8px;
          color: rgba(255,255,255,0.78);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .alert {
          border-radius: 18px;
          padding: 13px 15px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
        }

        .alert.success {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .alert.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(330px, 0.9fr);
          gap: 16px;
          align-items: start;
        }

        .panel {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 32px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .panelHeader {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
        }

        .panelTitle {
          margin: 0;
          font-size: 19px;
          font-weight: 950;
          color: #172018;
          letter-spacing: -0.04em;
        }

        .panelSub {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.45;
        }

        .panelBody {
          padding: 18px;
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .label {
          color: #475569;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .input,
        .textarea,
        .select {
          width: 100%;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #fffdf7;
          border-radius: 18px;
          padding: 14px 15px;
          font-size: 14px;
          color: #172018;
          outline: none;
          font-weight: 750;
        }

        .textarea {
          min-height: 130px;
          resize: vertical;
          line-height: 1.55;
        }

        .input:focus,
        .textarea:focus,
        .select:focus {
          border-color: #84cc16;
          box-shadow: 0 0 0 4px rgba(132, 204, 22, 0.12);
        }

        .helper {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.45;
        }

        .difficultyGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .difficultyCard {
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #fffdf7;
          border-radius: 22px;
          padding: 14px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .difficultyCard.active {
          border-color: #16a34a;
          background: #f0fdf4;
          box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.08);
        }

        .difficultyTitle {
          color: #172018;
          font-size: 14px;
          font-weight: 950;
        }

        .difficultyText {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.4;
          margin-top: 4px;
        }

        .photoBox {
          border: 1px dashed rgba(15, 23, 42, 0.18);
          background: #fffdf7;
          border-radius: 28px;
          min-height: 260px;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          overflow: hidden;
          position: relative;
        }

        .photoBox img {
          width: 100%;
          height: 100%;
          max-height: 330px;
          object-fit: cover;
          border-radius: 22px;
          display: block;
        }

        .photoEmpty {
          max-width: 260px;
          color: #64748b;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.5;
        }

        .photoIcon {
          width: 58px;
          height: 58px;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0fdf4;
          color: #16a34a;
          font-size: 26px;
          margin: 0 auto 12px;
        }

        .fileInput {
          display: none;
        }

        .photoButton {
          border: none;
          background: #172018;
          color: #ffffff;
          border-radius: 999px;
          padding: 12px 15px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          margin-top: 13px;
          display: inline-flex;
        }

        .summaryCard {
          background:
            radial-gradient(circle at top right, rgba(190, 242, 100, 0.22), transparent 38%),
            #172018;
          color: #ffffff;
          border-radius: 30px;
          padding: 22px;
          margin-bottom: 16px;
        }

        .summaryLabel {
          color: rgba(255,255,255,0.68);
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }

        .summaryTitle {
          margin-top: 8px;
          color: #ffffff;
          font-size: 28px;
          line-height: 1.02;
          font-weight: 950;
          letter-spacing: -0.06em;
          word-break: break-word;
        }

        .summaryText {
          margin-top: 10px;
          color: rgba(255,255,255,0.74);
          font-size: 13px;
          line-height: 1.55;
          font-weight: 700;
        }

        .summaryRows {
          display: grid;
          gap: 9px;
          margin-top: 16px;
        }

        .summaryRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: rgba(255,255,255,0.82);
          font-size: 12px;
          font-weight: 800;
        }

        .infoCard {
          background: #fffdf7;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 26px;
          padding: 16px;
        }

        .infoTitle {
          color: #172018;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.25;
        }

        .infoText {
          margin-top: 6px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 700;
        }

        .actions {
          display: flex;
          gap: 10px;
          margin-top: 18px;
          flex-wrap: wrap;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 14px 18px;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.10);
        }

        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn.primary {
          background: #16a34a;
          color: #ffffff;
        }

        .btn.secondary {
          background: #eef2e5;
          color: #475569;
        }

        @media (max-width: 1040px) {
          .mainGrid,
          .heroContent {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .header {
            padding: 9px 12px;
          }

          .brandTitle,
          .brandSub {
            display: none;
          }

          .headerActions .hideMobile {
            display: none;
          }

          .container {
            padding: 16px 12px 42px;
          }

          .hero,
          .panel {
            border-radius: 28px;
          }

          .hero {
            padding: 22px;
            min-height: auto;
          }

          .heroContent {
            min-height: auto;
          }

          .formGrid,
          .difficultyGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .heroTitle {
            font-size: 40px;
          }

          .brand img {
            height: 38px;
          }

          .actions {
            display: grid;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>

      <header className="header">
        <div className="headerInner">
          <div
            className="brand"
            onClick={() => router.push('/guia/dashboard')}
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />

            <div>
              <div className="brandTitle">PrussikTrails</div>
              <div className="brandSub">Novo roteiro</div>
            </div>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="iconBtn hideMobile"
              onClick={() => router.push('/guia/dashboard')}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="iconBtn hideMobile"
              onClick={() => router.push('/guia/roteiros')}
            >
              Meus roteiros
            </button>

            <button
              type="button"
              className="iconBtn primary"
              onClick={() => router.push('/guia/perfil')}
            >
              Perfil
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="hero">
          <div className="heroContent">
            <div>
              <div className="eyebrow">Criação do guia</div>

              <h1 className="heroTitle">
                Crie uma experiência que faça alguém <span>sair da rotina.</span>
              </h1>

              <p className="heroText">
                Cadastre o roteiro com foto, local, data, hora, valor e informações
                simples. O grupo interno será criado automaticamente para você administrar
                a experiência quando as reservas forem confirmadas.
              </p>
            </div>

            <aside className="heroCard">
              <div className="heroCardLabel">Guia responsável</div>
              <div className="heroCardValue">{tituloUsuario(user)}</div>
              <div className="heroCardText">
                O grupo do roteiro será criado automaticamente e você entrará como administrador.
              </div>
            </aside>
          </div>
        </section>

        {mensagem && (
          <div className="alert success">{mensagem}</div>
        )}

        {erro && (
          <div className="alert error">{erro}</div>
        )}

        <section className="mainGrid">
          <form className="panel" onSubmit={criarRoteiro}>
            <div className="panelHeader">
              <h2 className="panelTitle">Informações do roteiro</h2>
              <div className="panelSub">
                Use campos simples e objetivos. O admin poderá acompanhar e aprovar o roteiro depois.
              </div>
            </div>

            <div className="panelBody">
              <div className="formGrid">
                <div className="field full">
                  <label className="label">Título do roteiro</label>
                  <input
                    className="input"
                    value={titulo}
                    onChange={(event) => setTitulo(event.target.value)}
                    placeholder="Ex.: Trilha ao nascer do sol"
                    maxLength={120}
                  />
                </div>

                <div className="field full">
                  <label className="label">Descrição</label>
                  <textarea
                    className="textarea"
                    value={descricao}
                    onChange={(event) => setDescricao(event.target.value)}
                    placeholder="Conte o que torna essa experiência especial, o que está incluso e o que o aventureiro precisa saber."
                  />
                </div>

                <div className="field full">
                  <label className="label">Local / ponto de encontro</label>
                  <input
                    className="input"
                    value={local}
                    onChange={(event) => setLocal(event.target.value)}
                    placeholder="Ex.: Estacionamento principal do parque"
                  />
                  <div className="helper">
                    Campo simples para escrever o local como o guia deseja informar.
                  </div>
                </div>

                <div className="field">
                  <label className="label">Data</label>
                  <input
                    className="input"
                    type="date"
                    value={dataRoteiro}
                    onChange={(event) => setDataRoteiro(event.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="label">Hora</label>
                  <input
                    className="input"
                    type="time"
                    value={horaRoteiro}
                    onChange={(event) => setHoraRoteiro(event.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="label">Valor por pessoa</label>
                  <input
                    className="input"
                    value={preco}
                    onChange={(event) => setPreco(event.target.value)}
                    placeholder="Ex.: 120"
                    inputMode="decimal"
                  />
                </div>

                <div className="field">
                  <label className="label">Duração em horas</label>
                  <input
                    className="input"
                    value={duracaoHoras}
                    onChange={(event) => setDuracaoHoras(event.target.value)}
                    placeholder="Ex.: 4"
                    inputMode="numeric"
                  />
                </div>

                <div className="field">
                  <label className="label">Distância em km</label>
                  <input
                    className="input"
                    value={km}
                    onChange={(event) => setKm(event.target.value)}
                    placeholder="Ex.: 8"
                    inputMode="decimal"
                  />
                </div>

                <div className="field">
                  <label className="label">Limite de pessoas</label>
                  <input
                    className="input"
                    value={limitePessoas}
                    onChange={(event) => setLimitePessoas(event.target.value)}
                    placeholder="Ex.: 10"
                    inputMode="numeric"
                  />
                </div>

                <div className="field full">
                  <label className="label">Recorrência</label>
                  <select
                    className="select"
                    value={recorrencia}
                    onChange={(event) => setRecorrencia(event.target.value)}
                  >
                    <option value="Experiência única">Experiência única</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Quinzenal">Quinzenal</option>
                    <option value="Mensal">Mensal</option>
                    <option value="Sob demanda">Sob demanda</option>
                  </select>
                </div>

                <div className="field full">
                  <label className="label">Dificuldade</label>

                  <div className="difficultyGrid">
                    {DIFICULDADES.map((item) => (
                      <button
                        type="button"
                        key={item.value}
                        className={`difficultyCard ${dificuldade === item.value ? 'active' : ''}`}
                        onClick={() => setDificuldade(item.value)}
                      >
                        <div className="difficultyTitle">{item.label}</div>
                        <div className="difficultyText">{item.descricao}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field full">
                  <label className="label">Foto do roteiro</label>

                  <div className="photoBox">
                    {fotoPreview ? (
                      <img src={fotoPreview} alt="Prévia do roteiro" />
                    ) : (
                      <div className="photoEmpty">
                        <div className="photoIcon">🌄</div>
                        Envie uma foto bonita do roteiro. Ela será usada nos cards e na vitrine da experiência.
                        <br />
                        <label className="photoButton">
                          Escolher foto
                          <input
                            className="fileInput"
                            type="file"
                            accept="image/*"
                            onChange={handleFotoChange}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {fotoPreview && (
                    <label className="photoButton">
                      Trocar foto
                      <input
                        className="fileInput"
                        type="file"
                        accept="image/*"
                        onChange={handleFotoChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="actions">
                <button
                  type="submit"
                  className="btn primary"
                  disabled={salvando}
                >
                  {salvando ? 'Criando roteiro...' : 'Criar roteiro'}
                </button>

                <button
                  type="button"
                  className="btn secondary"
                  disabled={salvando}
                  onClick={() => router.push('/guia/roteiros')}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>

          <aside>
            <section className="summaryCard">
              <div className="summaryLabel">Prévia do roteiro</div>

              <div className="summaryTitle">
                {titulo || 'Novo roteiro'}
              </div>

              <div className="summaryText">
                {descricao
                  ? descricao.slice(0, 150) + (descricao.length > 150 ? '...' : '')
                  : 'A descrição aparecerá aqui conforme você preenche.'}
              </div>

              <div className="summaryRows">
                <div className="summaryRow">
                  <span>Local</span>
                  <strong>{local || '-'}</strong>
                </div>

                <div className="summaryRow">
                  <span>Data</span>
                  <strong>{dataRoteiro || '-'}</strong>
                </div>

                <div className="summaryRow">
                  <span>Hora</span>
                  <strong>{horaRoteiro || '-'}</strong>
                </div>

                <div className="summaryRow">
                  <span>Valor</span>
                  <strong>
                    {preco
                      ? new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(normalizarNumero(preco, 0))
                      : '-'}
                  </strong>
                </div>

                <div className="summaryRow">
                  <span>Duração</span>
                  <strong>{duracaoHoras || '1'}h</strong>
                </div>

                <div className="summaryRow">
                  <span>Dificuldade</span>
                  <strong>
                    {DIFICULDADES.find((item) => item.value === dificuldade)?.label || 'Fácil'}
                  </strong>
                </div>
              </div>
            </section>

            <section className="infoCard">
              <div className="infoTitle">Grupo criado automaticamente</div>
              <div className="infoText">
                Ao salvar o roteiro, o sistema cria um grupo interno para essa experiência
                e adiciona você como administrador. Os clientes só entram depois que o pagamento
                da reserva for confirmado pelo sistema.
              </div>
            </section>

            <section className="infoCard" style={{ marginTop: 16 }}>
              <div className="infoTitle">Status inicial</div>
              <div className="infoText">
                O roteiro será criado como pendente para controle do app. Depois ele poderá ser
                aprovado/ativado no fluxo administrativo, conforme a estrutura atual do PrussikTrails.
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}