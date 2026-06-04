'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

type UsuarioLocal = {
  id: string
  nome?: string | null
  name?: string | null
  email?: string | null
  tipo?: string | null
  avatar_url?: string | null
  foto_url?: string | null
  imagem_url?: string | null
}

type AnyRecord = Record<string, any>

type LocalizacaoRoteiroValue = {
  endereco_local: string
  ponto_referencia: string
  endereco_formatado?: string
  cidade?: string
  uf?: string
  pais?: string
  latitude?: number | null
  longitude?: number | null
  geocoding_provider?: string
  geocoding_place_id?: string
  geocoding_confianca?: string
}

type FormRoteiro = {
  titulo: string
  descricao: string
  preco: string
  duracao: string
  km: string
  dificuldade: string
  foto_capa: string
  roteiro_detalhado: string
  inclui: string
  nao_inclui: string
  orientacoes: string
  limite_pessoas: string
  recorrencia: string
}

const BUCKET_ROTEIROS = 'fotos-aventuras'

const DIFICULDADES = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Médio' },
  { value: 'dificil', label: 'Difícil' },
  { value: 'extremo', label: 'Extremo' }
]

const RECORRENCIAS = [
  { value: 'unica', label: 'Experiência única' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual' }
]

function texto(valor: unknown) {
  return String(valor || '').trim()
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function numeroDecimal(valor: string) {
  const limpo = texto(valor)
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

function slugify(valor: string) {
  return texto(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'roteiro'
}

function erroDeColunaAusente(error: any) {
  const mensagem = String(error?.message || error?.details || error?.hint || '').toLowerCase()

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    mensagem.includes('schema cache') ||
    mensagem.includes('could not find') ||
    mensagem.includes('column') ||
    mensagem.includes('does not exist')
  )
}

function extrairColunaAusente(error: any) {
  const textoErro = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')

  const matchRoteiros = textoErro.match(/roteiros\.([a-zA-Z0-9_]+)/)
  if (matchRoteiros?.[1]) return matchRoteiros[1]

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

function criarLocalizacaoVazia(): LocalizacaoRoteiroValue {
  return {
    endereco_local: '',
    ponto_referencia: '',
    endereco_formatado: '',
    cidade: '',
    uf: '',
    pais: 'Brasil',
    latitude: null,
    longitude: null,
    geocoding_provider: '',
    geocoding_place_id: '',
    geocoding_confianca: ''
  }
}

function temCoordenadas(localizacao: LocalizacaoRoteiroValue) {
  return (
    Number.isFinite(Number(localizacao.latitude)) &&
    Number.isFinite(Number(localizacao.longitude))
  )
}

function normalizarDificuldade(valor: unknown) {
  const n = normalizar(valor)

  if (n === 'facil' || n === 'leve') return 'facil'
  if (n === 'medio' || n === 'moderado') return 'medio'
  if (n === 'dificil' || n === 'avancado') return 'dificil'
  if (n === 'extremo') return 'extremo'

  return 'medio'
}

function arrayFotos(valor: unknown) {
  if (Array.isArray(valor)) return valor.map((item) => texto(item)).filter(Boolean)
  return []
}

function montarFotosDoRoteiro(roteiro: AnyRecord) {
  const fotos = [
    ...arrayFotos(roteiro.galeria_fotos),
    ...arrayFotos(roteiro.imagens),
    texto(roteiro.foto_capa),
    texto(roteiro.foto_url),
    texto(roteiro.imagem_url),
    texto(roteiro.image_url),
    texto(roteiro.capa_url)
  ].filter(Boolean)

  return Array.from(new Set(fotos)).slice(0, 3)
}

function LocalizacaoRoteiroBox({
  value,
  onChange
}: {
  value: LocalizacaoRoteiroValue
  onChange: (value: LocalizacaoRoteiroValue) => void
}) {
  const [buscando, setBuscando] = useState(false)
  const [erroLocalizacao, setErroLocalizacao] = useState('')
  const [mensagemLocalizacao, setMensagemLocalizacao] = useState('')

  const coordenadasConfirmadas = temCoordenadas(value)

  function atualizarCampo(campo: 'endereco_local' | 'ponto_referencia', novoValor: string) {
    onChange({
      ...value,
      [campo]: novoValor,
      endereco_formatado: '',
      cidade: '',
      uf: '',
      latitude: null,
      longitude: null,
      geocoding_provider: '',
      geocoding_place_id: '',
      geocoding_confianca: ''
    })
    setMensagemLocalizacao('')
    setErroLocalizacao('')
  }

  async function localizarEndereco() {
    setErroLocalizacao('')
    setMensagemLocalizacao('')

    const endereco = texto(value.endereco_local)
    const pontoReferencia = texto(value.ponto_referencia)

    if (!endereco) {
      setErroLocalizacao('Informe o local principal do roteiro.')
      return
    }

    try {
      setBuscando(true)

      const response = await fetch('/api/geocoding/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endereco,
          pontoReferencia
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.erro || 'Não foi possível localizar este endereço.')
      }

      const resultado = data.resultado || {}
      const latitude = Number(resultado.latitude)
      const longitude = Number(resultado.longitude)

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('O local foi encontrado, mas não retornou coordenadas válidas.')
      }

      onChange({
        ...value,
        endereco_local: endereco,
        ponto_referencia: pontoReferencia,
        endereco_formatado: texto(resultado.endereco_formatado),
        cidade: texto(resultado.cidade),
        uf: texto(resultado.uf),
        pais: texto(resultado.pais) || 'Brasil',
        latitude,
        longitude,
        geocoding_provider: texto(resultado.provider) || 'google',
        geocoding_place_id: texto(resultado.place_id),
        geocoding_confianca: texto(resultado.confianca) || 'media'
      })

      setMensagemLocalizacao('Local encontrado. Confira se é o ponto correto antes de salvar o roteiro.')
    } catch (error) {
      setErroLocalizacao(error instanceof Error ? error.message : 'Erro ao localizar endereço.')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <section className="geoBox">
      <div className="geoHeader">
        <div className="geoEyebrow">Localização do roteiro</div>
        <h2>Onde começa a experiência?</h2>
        <p>
          Informe o local de forma simples. O PrussikTrails localiza o endereço e salva as coordenadas para clima, mapa e segurança.
        </p>
      </div>

      <div className="geoFields">
        <label className="field full">
          <span>Local principal do roteiro *</span>
          <input
            value={value.endereco_local}
            onChange={(event) => atualizarCampo('endereco_local', event.target.value)}
            placeholder="Ex.: Pedra do Lagarto, Serra do Itapety, Mogi das Cruzes/SP"
          />
        </label>

        <label className="field full">
          <span>Ponto de encontro ou referência</span>
          <input
            value={value.ponto_referencia}
            onChange={(event) => atualizarCampo('ponto_referencia', event.target.value)}
            placeholder="Ex.: estacionamento, portaria, restaurante próximo, entrada da trilha"
          />
        </label>
      </div>

      <div className="geoActions">
        <button type="button" className="geoButton" onClick={localizarEndereco} disabled={buscando}>
          {buscando ? 'Localizando...' : 'Localizar endereço'}
        </button>
        <span>O guia não precisa digitar latitude e longitude.</span>
      </div>

      {coordenadasConfirmadas && (
        <div className="geoResult">
          <strong>Local encontrado</strong>
          <span>{value.endereco_formatado || value.endereco_local}</span>
          {(value.cidade || value.uf) && (
            <small>
              {value.cidade}{value.uf ? `/${value.uf}` : ''}
            </small>
          )}
          <em>
            Coordenadas salvas · {Number(value.latitude).toFixed(5)}, {Number(value.longitude).toFixed(5)}
            {value.geocoding_confianca ? ` · precisão ${value.geocoding_confianca}` : ''}
          </em>
        </div>
      )}

      {mensagemLocalizacao && <div className="geoOk">{mensagemLocalizacao}</div>}
      {erroLocalizacao && <div className="geoErro">{erroLocalizacao}</div>}
    </section>
  )
}

export default function EditarRoteiro() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = String(params?.id || '')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [statusAtual, setStatusAtual] = useState('')
  const [formData, setFormData] = useState<FormRoteiro>({
    titulo: '',
    descricao: '',
    preco: '',
    duracao: '',
    km: '',
    dificuldade: 'medio',
    foto_capa: '',
    roteiro_detalhado: '',
    inclui: '',
    nao_inclui: '',
    orientacoes: '',
    limite_pessoas: '10',
    recorrencia: 'unica'
  })
  const [localizacao, setLocalizacao] = useState<LocalizacaoRoteiroValue>(criarLocalizacaoVazia())
  const [fotosExistentes, setFotosExistentes] = useState<string[]>([])
  const [novasFotos, setNovasFotos] = useState<File[]>([])
  const [novasFotosPreview, setNovasFotosPreview] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    void iniciar()

    return () => {
      novasFotosPreview.forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const avatarGuia = user?.avatar_url || user?.foto_url || user?.imagem_url || ''
  const nomeGuia = user?.nome || user?.name || user?.email || 'Guia'

  const podeSalvar = useMemo(() => {
    return (
      texto(formData.titulo).length >= 4 &&
      texto(formData.descricao).length >= 12 &&
      texto(localizacao.endereco_local).length >= 3 &&
      temCoordenadas(localizacao) &&
      numeroDecimal(formData.preco) > 0 &&
      !loading &&
      !uploading
    )
  }, [formData, localizacao, loading, uploading])

  async function iniciar() {
    if (!id) {
      setErro('Roteiro não informado.')
      setCarregando(false)
      return
    }

    setCarregando(true)
    setErro('')
    setMensagem('')

    try {
      const salvo = localStorage.getItem('user')

      if (!salvo) {
        router.replace('/login')
        return
      }

      const usuario = JSON.parse(salvo) as UsuarioLocal

      if (normalizar(usuario.tipo) !== 'guia') {
        router.replace('/login')
        return
      }

      setUser(usuario)

      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) {
        setErro('Roteiro não encontrado.')
        return
      }

      const status = normalizar(data.status || data.situacao || data.publicacao)

      if (status === 'aprovado' || data.aprovado === true) {
        setErro('Este roteiro já foi aprovado e não pode mais ser editado por guias. Entre em contato com o administrador.')
        return
      }

      const guiaId = texto(data.id_guia || data.guia_id || data.user_id || data.usuario_id)
      if (guiaId && guiaId !== usuario.id) {
        setErro('Este roteiro pertence a outro guia.')
        return
      }

      setStatusAtual(data.status || data.situacao || 'pendente')
      setFormData({
        titulo: texto(data.titulo || data.nome),
        descricao: texto(data.descricao),
        preco: texto(data.preco || data.valor || data.preco_por_pessoa),
        duracao: texto(data.duracao || data.duracao_horas || '1'),
        km: texto(data.km || data.distancia_km),
        dificuldade: normalizarDificuldade(data.dificuldade || data.nivel || data.intensidade),
        foto_capa: texto(data.foto_capa || data.foto_url || data.imagem_url || data.image_url || data.capa_url),
        roteiro_detalhado: texto(data.roteiro_detalhado || data.detalhes),
        inclui: texto(data.inclui),
        nao_inclui: texto(data.nao_inclui),
        orientacoes: texto(data.orientacoes),
        limite_pessoas: texto(data.limite_pessoas || data.capacidade || data.max_pessoas || '10'),
        recorrencia: texto(data.recorrencia || 'unica')
      })

      setLocalizacao({
        endereco_local: texto(data.endereco_local || data.local || data.localizacao || data.embarque_local),
        ponto_referencia: texto(data.ponto_referencia || data.ponto_encontro || data.local_encontro),
        endereco_formatado: texto(data.endereco_formatado || data.localizacao || data.local),
        cidade: texto(data.cidade),
        uf: texto(data.uf),
        pais: texto(data.pais) || 'Brasil',
        latitude: data.latitude !== null && data.latitude !== undefined ? Number(data.latitude) : null,
        longitude: data.longitude !== null && data.longitude !== undefined ? Number(data.longitude) : null,
        geocoding_provider: texto(data.geocoding_provider),
        geocoding_place_id: texto(data.geocoding_place_id),
        geocoding_confianca: texto(data.geocoding_confianca)
      })

      setFotosExistentes(montarFotosDoRoteiro(data))
    } catch (error) {
      console.error('Erro ao carregar roteiro:', error)
      setErro('Não foi possível carregar o roteiro agora.')
    } finally {
      setCarregando(false)
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  function handleNovasFotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])

    if (files.length + novasFotos.length + fotosExistentes.length > 3) {
      setErro('Máximo de 3 fotos por roteiro.')
      event.target.value = ''
      return
    }

    const imagensValidas = files.filter((file) => file.type.startsWith('image/'))

    if (imagensValidas.length !== files.length) {
      setErro('Selecione apenas arquivos de imagem.')
      event.target.value = ''
      return
    }

    setErro('')
    setNovasFotos((prev) => [...prev, ...imagensValidas])
    setNovasFotosPreview((prev) => [...prev, ...imagensValidas.map((file) => URL.createObjectURL(file))])
  }

  function removerFotoExistente(index: number) {
    setFotosExistentes((prev) => prev.filter((_, i) => i !== index))
  }

  function removerNovaFoto(index: number) {
    setNovasFotos((prev) => prev.filter((_, i) => i !== index))
    setNovasFotosPreview((prev) => {
      const url = prev[index]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function uploadNovasFotos(guiaId: string): Promise<string[]> {
    const urls: string[] = []

    for (const foto of novasFotos) {
      const fileExt = foto.name.split('.').pop() || 'jpg'
      const fileName = `${Date.now()}-${slugify(foto.name)}-${uuidv4()}.${fileExt}`
      const filePath = `roteiros/${guiaId}/${fileName}`

      const { error } = await supabase.storage
        .from(BUCKET_ROTEIROS)
        .upload(filePath, foto, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data } = supabase.storage
        .from(BUCKET_ROTEIROS)
        .getPublicUrl(filePath)

      if (data?.publicUrl) urls.push(data.publicUrl)
    }

    return urls
  }

  async function atualizarRoteiroComFallback(payloadOriginal: AnyRecord) {
    let payload: AnyRecord = { ...payloadOriginal }

    for (let tentativa = 0; tentativa < 24; tentativa++) {
      const { data, error } = await supabase
        .from('roteiros')
        .update(payload)
        .eq('id', id)
        .select('*')
        .maybeSingle()

      if (!error) return data as AnyRecord | null

      if (!erroDeColunaAusente(error)) throw error

      const coluna = extrairColunaAusente(error)

      if (!coluna || !(coluna in payload)) {
        console.error('Coluna ausente não mapeada ao atualizar roteiro:', error)
        throw error
      }

      delete payload[coluna]

      if (Object.keys(payload).length === 0) {
        throw new Error('Nenhuma coluna disponível para atualizar o roteiro.')
      }
    }

    throw new Error('Não foi possível atualizar o roteiro após ajustar colunas.')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!user?.id) {
      router.replace('/login')
      return
    }

    setLoading(true)
    setErro('')
    setMensagem('')

    const tituloLimpo = texto(formData.titulo)
    const descricaoLimpa = texto(formData.descricao)
    const precoNumero = numeroDecimal(formData.preco)
    const kmNumero = numeroDecimal(formData.km)
    const limiteNumero = Math.max(1, Math.floor(Number(formData.limite_pessoas || 1)))
    const localPrincipal = texto(localizacao.endereco_local)
    const pontoReferencia = texto(localizacao.ponto_referencia)
    const localFormatado = texto(localizacao.endereco_formatado) || localPrincipal

    if (tituloLimpo.length < 4) {
      setErro('Informe um título claro para o roteiro.')
      setLoading(false)
      return
    }

    if (descricaoLimpa.length < 12) {
      setErro('Escreva uma descrição curta para apresentar o roteiro.')
      setLoading(false)
      return
    }

    if (!localPrincipal) {
      setErro('Informe o local principal do roteiro.')
      setLoading(false)
      return
    }

    if (!temCoordenadas(localizacao)) {
      setErro('Clique em "Localizar endereço" antes de salvar o roteiro. Isso libera clima, mapa e segurança.')
      setLoading(false)
      return
    }

    if (precoNumero <= 0) {
      setErro('Informe um valor válido para o roteiro.')
      setLoading(false)
      return
    }

    try {
      let novasUrls: string[] = []

      if (novasFotos.length > 0) {
        setUploading(true)
        novasUrls = await uploadNovasFotos(user.id)
        setUploading(false)
      }

      const todasFotos = Array.from(new Set([...fotosExistentes, ...novasUrls])).slice(0, 3)
      const fotoCapa = texto(formData.foto_capa) || todasFotos[0] || null

      const payload: AnyRecord = {
        titulo: tituloLimpo,
        nome: tituloLimpo,
        descricao: descricaoLimpa,
        roteiro_detalhado: texto(formData.roteiro_detalhado) || null,
        detalhes: texto(formData.roteiro_detalhado) || null,

        local: localFormatado,
        localizacao: localFormatado,
        endereco_local: localPrincipal,
        endereco_formatado: localFormatado,
        cidade: texto(localizacao.cidade) || null,
        uf: texto(localizacao.uf) || null,
        pais: texto(localizacao.pais) || 'Brasil',
        latitude: Number(localizacao.latitude),
        longitude: Number(localizacao.longitude),
        geocoding_provider: texto(localizacao.geocoding_provider) || 'google',
        geocoding_place_id: texto(localizacao.geocoding_place_id) || null,
        geocoding_confianca: texto(localizacao.geocoding_confianca) || null,
        geocoding_atualizado_em: new Date().toISOString(),

        embarque_local: pontoReferencia || localFormatado,
        local_encontro: pontoReferencia || localFormatado,
        ponto_encontro: pontoReferencia || localFormatado,
        ponto_referencia: pontoReferencia || null,

        preco: precoNumero,
        valor: precoNumero,
        preco_total: precoNumero,
        preco_por_pessoa: precoNumero,

        km: kmNumero,
        distancia_km: kmNumero,
        duracao: texto(formData.duracao) || null,
        duracao_horas: Number(formData.duracao) || null,

        dificuldade: formData.dificuldade,
        nivel: formData.dificuldade,
        intensidade: formData.dificuldade,
        recorrencia: formData.recorrencia || 'unica',

        limite_pessoas: limiteNumero,
        capacidade: limiteNumero,
        max_pessoas: limiteNumero,

        inclui: texto(formData.inclui) || null,
        nao_inclui: texto(formData.nao_inclui) || null,
        orientacoes: texto(formData.orientacoes) || null,

        foto_capa: fotoCapa,
        foto_url: fotoCapa,
        imagem_url: fotoCapa,
        image_url: fotoCapa,
        capa_url: fotoCapa,
        galeria_fotos: todasFotos,
        imagens: todasFotos,

        ativo: false,
        status: 'pendente_aprovacao',
        situacao: 'pendente_aprovacao',
        publicacao: 'em_analise',
        observacao_guia: 'Roteiro editado pelo guia e reenviado para aprovação.',
        revisao_solicitada_em: new Date().toISOString(),
        enviado_para_aprovacao_em: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await atualizarRoteiroComFallback(payload)

      setMensagem('Roteiro atualizado e reenviado para aprovação do Admin.')
      window.setTimeout(() => {
        router.push('/guia/roteiros')
      }, 900)
    } catch (error: any) {
      console.error('Erro ao salvar roteiro:', error)
      setErro(error?.message || 'Não foi possível salvar o roteiro agora.')
      setUploading(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleExcluir() {
    if (!confirm('Tem certeza que deseja excluir este roteiro? Esta ação não pode ser desfeita.')) return

    const { error } = await supabase.from('roteiros').delete().eq('id', id)

    if (error) {
      setErro(error.message || 'Não foi possível excluir o roteiro.')
      return
    }

    router.push('/guia/roteiros')
  }

  if (carregando) {
    return (
      <main className="page">
        <style>{styles}</style>
        <section className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <p>Carregando edição de roteiro...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <header className="header">
        <button
          type="button"
          className="brand"
          onClick={() => router.push('/guia/dashboard')}
          aria-label="Voltar para dashboard do guia"
        >
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <span>Editar roteiro outdoor</span>
        </button>

        <button
          type="button"
          className="profileButton"
          onClick={() => router.push('/guia/perfil')}
          aria-label="Abrir perfil do guia"
        >
          {avatarGuia ? <img src={avatarGuia} alt={nomeGuia} /> : <span>{nomeGuia.slice(0, 1).toUpperCase()}</span>}
        </button>
      </header>

      <div className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">Guia PrussikTrails</p>
            <h1>Edite sua experiência.</h1>
            <p>
              Ajuste as informações do roteiro, confirme o local pelo endereço e reenvie para aprovação do Admin.
            </p>
          </div>

          <div className="heroTip">
            <strong>Status atual</strong>
            <span>{statusAtual || 'Roteiro em edição'}</span>
          </div>
        </section>

        {erro && <div className="alert error">{erro}</div>}
        {mensagem && <div className="alert success">{mensagem}</div>}

        {!erro.includes('não pode mais ser editado') && !erro.includes('pertence a outro guia') && (
          <form className="formGrid" onSubmit={handleSubmit}>
            <section className="card mainCard">
              <div className="cardHeader">
                <span>01</span>
                <div>
                  <h2>Informações principais</h2>
                  <p>Esses dados aparecem nos cards públicos e na página de detalhe.</p>
                </div>
              </div>

              <div className="fieldsGrid">
                <label className="field full">
                  <span>Título do roteiro *</span>
                  <input name="titulo" value={formData.titulo} onChange={handleChange} maxLength={90} />
                </label>

                <label className="field full">
                  <span>Descrição curta *</span>
                  <textarea name="descricao" value={formData.descricao} onChange={handleChange} maxLength={420} />
                </label>

                <div className="field full">
                  <LocalizacaoRoteiroBox value={localizacao} onChange={setLocalizacao} />
                </div>

                <label className="field">
                  <span>Valor por pessoa *</span>
                  <input name="preco" value={formData.preco} onChange={handleChange} inputMode="decimal" />
                </label>

                <label className="field">
                  <span>Distância em km</span>
                  <input name="km" value={formData.km} onChange={handleChange} inputMode="decimal" />
                </label>

                <label className="field">
                  <span>Duração</span>
                  <input name="duracao" value={formData.duracao} onChange={handleChange} placeholder="Ex.: 4h, 1 dia" />
                </label>

                <label className="field">
                  <span>Limite de pessoas</span>
                  <input name="limite_pessoas" type="number" min={1} max={200} value={formData.limite_pessoas} onChange={handleChange} />
                </label>

                <label className="field">
                  <span>Dificuldade</span>
                  <select name="dificuldade" value={formData.dificuldade} onChange={handleChange}>
                    {DIFICULDADES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Recorrência</span>
                  <select name="recorrencia" value={formData.recorrencia} onChange={handleChange}>
                    {RECORRENCIAS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <aside className="card imageCard">
              <div className="cardHeader">
                <span>02</span>
                <div>
                  <h2>Fotos do roteiro</h2>
                  <p>Até 3 fotos no total. A primeira será usada como capa quando não houver URL de capa.</p>
                </div>
              </div>

              <label className="field full">
                <span>Foto de capa URL</span>
                <input name="foto_capa" value={formData.foto_capa} onChange={handleChange} />
              </label>

              <div className="galeriaGrid">
                {fotosExistentes.map((foto, index) => (
                  <div className="fotoMini" key={foto}>
                    <img src={foto} alt={`Foto existente ${index + 1}`} />
                    <button type="button" onClick={() => removerFotoExistente(index)}>×</button>
                  </div>
                ))}

                {novasFotosPreview.map((foto, index) => (
                  <div className="fotoMini" key={foto}>
                    <img src={foto} alt={`Nova foto ${index + 1}`} />
                    <button type="button" onClick={() => removerNovaFoto(index)}>×</button>
                  </div>
                ))}
              </div>

              <input
                ref={fileInputRef}
                className="fileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleNovasFotos}
              />

              <button type="button" className="lightButton" onClick={() => fileInputRef.current?.click()} disabled={fotosExistentes.length + novasFotos.length >= 3}>
                Adicionar fotos
              </button>

              <div className="imageHelp">
                <strong>Imagem recomendada:</strong>
                <span>1200 x 900 px · formato horizontal · boa iluminação · ponto principal centralizado.</span>
              </div>
            </aside>

            <section className="card fullWidth">
              <div className="cardHeader">
                <span>03</span>
                <div>
                  <h2>Roteiro detalhado</h2>
                  <p>Atualize preparo, percurso, itens inclusos e orientações.</p>
                </div>
              </div>

              <div className="fieldsGrid lowerFields">
                <label className="field full">
                  <span>Roteiro detalhado</span>
                  <textarea className="large" name="roteiro_detalhado" value={formData.roteiro_detalhado} onChange={handleChange} />
                </label>

                <label className="field">
                  <span>Inclui</span>
                  <textarea name="inclui" value={formData.inclui} onChange={handleChange} />
                </label>

                <label className="field">
                  <span>Não inclui</span>
                  <textarea name="nao_inclui" value={formData.nao_inclui} onChange={handleChange} />
                </label>

                <label className="field full">
                  <span>Orientações ao aventureiro</span>
                  <textarea name="orientacoes" value={formData.orientacoes} onChange={handleChange} />
                </label>
              </div>
            </section>

            <section className="submitBar">
              <div>
                <strong>Salvar alterações</strong>
                <span>Após editar, o roteiro volta para análise do Admin.</span>
              </div>

              <div className="submitActions">
                <button type="button" className="dangerButton" onClick={handleExcluir} disabled={loading || uploading}>
                  Excluir
                </button>

                <button type="button" className="secondaryButton" onClick={() => router.push('/guia/roteiros')} disabled={loading || uploading}>
                  Cancelar
                </button>

                <button type="submit" className="primaryButton" disabled={!podeSalvar}>
                  {loading || uploading ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </section>
          </form>
        )}
      </div>
    </main>
  )
}

const styles = `
  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: #f6f7f1;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .page {
    min-height: 100vh;
    min-height: 100dvh;
    background:
      radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 28%),
      radial-gradient(circle at 92% 10%, rgba(251, 146, 60, 0.14), transparent 28%),
      linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
    color: #172018;
    padding-bottom: 54px;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: 40;
    min-height: 76px;
    padding: 8px 18px;
    background: rgba(255, 253, 247, 0.90);
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(18px);
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 14px;
  }

  .brand {
    width: fit-content;
    min-width: 0;
    border: none;
    background: transparent;
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    color: inherit;
    text-align: left;
  }

  .brand img {
    width: 122px;
    height: 54px;
    object-fit: contain;
    display: block;
  }

  .brand span {
    color: #7b8372;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .profileButton {
    width: 42px;
    height: 42px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.78);
    color: #172018;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    cursor: pointer;
    font-weight: 950;
  }

  .profileButton img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .container {
    width: min(1180px, calc(100% - 28px));
    margin: 0 auto;
    padding-top: 22px;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 18px;
    align-items: stretch;
    margin-bottom: 16px;
  }

  .hero > div:first-child {
    border-radius: 34px;
    padding: clamp(22px, 4vw, 38px);
    background:
      linear-gradient(135deg, rgba(32, 60, 46, 0.96), rgba(32, 60, 46, 0.70)),
      radial-gradient(circle at top right, rgba(190, 242, 100, 0.25), transparent 35%);
    color: #fffdf7;
    box-shadow: 0 22px 58px rgba(32, 60, 46, 0.18);
  }

  .eyebrow {
    margin: 0 0 12px;
    color: #d9f99d;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.17em;
    text-transform: uppercase;
  }

  .hero h1 {
    margin: 0;
    font-size: clamp(42px, 6vw, 72px);
    line-height: 0.92;
    letter-spacing: -0.08em;
    font-weight: 950;
  }

  .hero p {
    max-width: 720px;
    margin: 16px 0 0;
    color: rgba(255, 253, 247, 0.78);
    font-size: 15px;
    line-height: 1.55;
    font-weight: 750;
  }

  .heroTip {
    border-radius: 34px;
    padding: 22px;
    background: rgba(255, 253, 247, 0.84);
    border: 1px solid rgba(32, 60, 46, 0.08);
    box-shadow: 0 18px 44px rgba(32, 60, 46, 0.08);
    display: grid;
    align-content: center;
    gap: 8px;
  }

  .heroTip strong {
    color: #203c2e;
    font-size: 20px;
    font-weight: 950;
    letter-spacing: -0.04em;
  }

  .heroTip span {
    color: rgba(23, 32, 24, 0.66);
    font-size: 13px;
    line-height: 1.55;
    font-weight: 800;
  }

  .alert {
    border-radius: 18px;
    padding: 13px 15px;
    margin-bottom: 14px;
    font-size: 13px;
    font-weight: 850;
    line-height: 1.45;
  }

  .alert.error {
    background: #fee2e2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .alert.success {
    background: #ecfdf5;
    border: 1px solid #bbf7d0;
    color: #166534;
  }

  .formGrid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 390px;
    gap: 16px;
    align-items: start;
  }

  .card {
    border-radius: 30px;
    background: rgba(255, 253, 247, 0.88);
    border: 1px solid rgba(32, 60, 46, 0.08);
    box-shadow: 0 16px 42px rgba(32, 60, 46, 0.07);
    padding: 20px;
    min-width: 0;
  }

  .mainCard { grid-column: 1; }

  .imageCard {
    grid-column: 2;
    position: sticky;
    top: 96px;
  }

  .fullWidth { grid-column: 1 / -1; }

  .cardHeader {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 18px;
  }

  .cardHeader > span {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: rgba(153, 27, 27, 0.10);
    color: #991b1b;
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 950;
    flex: 0 0 auto;
  }

  .cardHeader h2 {
    margin: 0;
    color: #172018;
    font-size: 22px;
    line-height: 1;
    letter-spacing: -0.045em;
    font-weight: 950;
  }

  .cardHeader p {
    margin: 6px 0 0;
    color: rgba(23, 32, 24, 0.58);
    font-size: 12px;
    line-height: 1.4;
    font-weight: 750;
  }

  .fieldsGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .lowerFields { margin-top: 16px; }

  .field {
    display: grid;
    gap: 7px;
  }

  .field.full { grid-column: 1 / -1; }

  .field span {
    color: #475569;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  input, textarea, select {
    width: 100%;
    border: 1px solid rgba(32, 60, 46, 0.10);
    background: rgba(255, 255, 255, 0.74);
    color: #172018;
    border-radius: 18px;
    padding: 13px 14px;
    font: inherit;
    font-size: 14px;
    font-weight: 750;
    outline: none;
  }

  textarea {
    min-height: 112px;
    resize: vertical;
    line-height: 1.5;
  }

  textarea.large { min-height: 170px; }

  input:focus, textarea:focus, select:focus {
    border-color: rgba(132, 204, 22, 0.55);
    box-shadow: 0 0 0 4px rgba(132, 204, 22, 0.13);
  }

  .geoBox {
    border-radius: 26px;
    padding: 18px;
    background: rgba(255, 253, 247, 0.78);
    border: 1px solid rgba(32, 60, 46, 0.10);
    box-shadow: 0 16px 38px rgba(32, 60, 46, 0.07);
  }

  .geoHeader { margin-bottom: 14px; }

  .geoEyebrow {
    color: #dc2626;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.13em;
  }

  .geoHeader h2 {
    margin: 6px 0 0;
    color: #203c2e;
    font-size: 22px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.045em;
  }

  .geoHeader p {
    margin: 7px 0 0;
    color: rgba(23, 32, 24, 0.62);
    font-size: 13px;
    line-height: 1.45;
    font-weight: 750;
  }

  .geoFields {
    display: grid;
    gap: 12px;
  }

  .geoActions {
    margin-top: 14px;
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .geoActions span {
    color: #64748b;
    font-size: 12px;
    font-weight: 750;
    line-height: 1.4;
  }

  .geoButton {
    border: 0;
    border-radius: 999px;
    background: #203c2e;
    color: #fffdf7;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    transition: 0.18s ease;
  }

  .geoButton:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 14px 28px rgba(32, 60, 46, 0.18);
  }

  .geoButton:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }

  .geoResult {
    margin-top: 14px;
    border-radius: 20px;
    padding: 14px;
    background: rgba(236, 253, 245, 0.82);
    border: 1px solid rgba(22, 163, 74, 0.18);
    color: #14532d;
    display: grid;
    gap: 4px;
  }

  .geoResult strong {
    font-size: 13px;
    font-weight: 950;
  }

  .geoResult span, .geoResult small {
    color: #166534;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 760;
  }

  .geoResult em {
    color: #64748b;
    font-size: 11px;
    line-height: 1.35;
    font-style: normal;
    font-weight: 850;
  }

  .geoOk, .geoErro {
    margin-top: 12px;
    border-radius: 16px;
    padding: 11px 12px;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 850;
  }

  .geoOk {
    background: rgba(22, 163, 74, 0.08);
    border: 1px solid rgba(22, 163, 74, 0.16);
    color: #166534;
  }

  .geoErro {
    background: rgba(153, 27, 27, 0.08);
    border: 1px solid rgba(153, 27, 27, 0.16);
    color: #7f1d1d;
  }

  .galeriaGrid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .fotoMini {
    position: relative;
    aspect-ratio: 4 / 3;
    border-radius: 18px;
    overflow: hidden;
    background: #eef2e5;
  }

  .fotoMini img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .fotoMini button {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: 0;
    background: rgba(153, 27, 27, 0.92);
    color: #fff;
    cursor: pointer;
    font-weight: 950;
  }

  .fileInput { display: none; }

  .imageHelp {
    margin-top: 12px;
    border-radius: 20px;
    padding: 13px;
    background: rgba(32, 60, 46, 0.05);
    display: grid;
    gap: 5px;
  }

  .imageHelp strong {
    color: #203c2e;
    font-size: 12px;
    font-weight: 950;
  }

  .imageHelp span {
    color: rgba(23, 32, 24, 0.62);
    font-size: 12px;
    line-height: 1.42;
    font-weight: 750;
  }

  .submitBar {
    grid-column: 1 / -1;
    border-radius: 26px;
    background: rgba(23, 32, 24, 0.94);
    color: #fffdf7;
    padding: 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    box-shadow: 0 22px 58px rgba(23, 32, 24, 0.18);
  }

  .submitBar strong {
    display: block;
    font-size: 17px;
    font-weight: 950;
  }

  .submitBar span {
    display: block;
    margin-top: 4px;
    color: rgba(255, 253, 247, 0.70);
    font-size: 12px;
    line-height: 1.35;
    font-weight: 750;
  }

  .submitActions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .primaryButton, .secondaryButton, .lightButton, .dangerButton {
    border: none;
    border-radius: 999px;
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    transition: 0.18s ease;
    white-space: nowrap;
  }

  .primaryButton {
    background: #bef264;
    color: #172018;
  }

  .primaryButton:disabled, .secondaryButton:disabled, .dangerButton:disabled, .lightButton:disabled {
    opacity: 0.52;
    cursor: not-allowed;
  }

  .secondaryButton {
    background: rgba(255, 255, 255, 0.12);
    color: #fffdf7;
    border: 1px solid rgba(255, 255, 255, 0.18);
  }

  .dangerButton {
    background: rgba(220, 38, 38, 0.16);
    color: #fffdf7;
    border: 1px solid rgba(254, 202, 202, 0.20);
  }

  .lightButton {
    width: 100%;
    margin-top: 12px;
    background: #fffdf7;
    color: #203c2e;
    border: 1px solid rgba(32, 60, 46, 0.12);
  }

  .loadingCard {
    width: min(420px, calc(100% - 32px));
    margin: 80px auto;
    border-radius: 30px;
    background: rgba(255, 253, 247, 0.90);
    border: 1px solid rgba(32, 60, 46, 0.08);
    box-shadow: 0 18px 48px rgba(32, 60, 46, 0.10);
    padding: 28px;
    text-align: center;
    color: #203c2e;
    font-weight: 850;
  }

  .loadingCard img {
    width: 150px;
    height: auto;
    object-fit: contain;
  }

  @media (max-width: 980px) {
    .hero, .formGrid {
      grid-template-columns: 1fr;
    }

    .imageCard {
      grid-column: 1;
      position: static;
    }
  }

  @media (max-width: 700px) {
    .header {
      min-height: 66px;
      padding: 7px 12px;
    }

    .brand { gap: 8px; }

    .brand img {
      width: 96px;
      height: 44px;
    }

    .brand span {
      font-size: 8px;
      letter-spacing: 0.08em;
    }

    .profileButton {
      width: 36px;
      height: 36px;
    }

    .container {
      width: min(100% - 20px, 1180px);
      padding-top: 14px;
    }

    .hero > div:first-child, .heroTip, .card {
      border-radius: 24px;
    }

    .hero > div:first-child { padding: 22px; }

    .hero h1 { font-size: 40px; }

    .fieldsGrid {
      grid-template-columns: 1fr;
    }

    .submitBar {
      border-radius: 22px;
      align-items: stretch;
      flex-direction: column;
    }

    .submitActions {
      display: grid;
      width: 100%;
    }

    .primaryButton, .secondaryButton, .dangerButton, .geoButton {
      width: 100%;
    }
  }
`
