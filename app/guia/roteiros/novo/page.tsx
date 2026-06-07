'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

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

type DificuldadeValue = 'facil' | 'medio' | 'dificil'
type RecorrenciaValue = 'unica' | 'semanal' | 'mensal' | 'anual'

type ImagemInfo = {
  nome: string
  width: number
  height: number
  aviso: string
}

const BUCKET_ROTEIROS = 'fotos-aventuras'

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

const RECORRENCIAS: Array<{
  value: RecorrenciaValue
  label: string
}> = [
  {
    value: 'unica',
    label: 'Experiência única'
  },
  {
    value: 'semanal',
    label: 'Semanal'
  },
  {
    value: 'mensal',
    label: 'Mensal'
  },
  {
    value: 'anual',
    label: 'Anual'
  }
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

function gerarIdCurto() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function erroDeColunaAusente(error: any) {
  const mensagem = String(
    error?.message ||
      error?.details ||
      error?.hint ||
      ''
  ).toLowerCase()

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
  const textoErro = [
    error?.message,
    error?.details,
    error?.hint
  ]
    .filter(Boolean)
    .join(' ')

  const matchRoteiros = textoErro.match(/roteiros\.([a-zA-Z0-9_]+)/)
  if (matchRoteiros?.[1]) return matchRoteiros[1]

  const matchAspas = textoErro.match(/'([^']+)'/)
  if (matchAspas?.[1]) return matchAspas[1]

  const matchColumn = textoErro.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i)
  if (matchColumn?.[1]) return matchColumn[1]

  return ''
}

function montarDataHoraBrasil(data: string, hora: string) {
  const dataLimpa = texto(data)
  const horaLimpa = texto(hora)

  if (!dataLimpa || !horaLimpa) return ''

  return `${dataLimpa}T${horaLimpa}:00-03:00`
}

function carregarDimensoesImagem(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const imagem = new Image()

    imagem.onload = () => {
      const width = imagem.naturalWidth || 0
      const height = imagem.naturalHeight || 0
      URL.revokeObjectURL(url)
      resolve({ width, height })
    }

    imagem.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler as dimensões da imagem.'))
    }

    imagem.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Não foi possível gerar a imagem compactada.'))
          return
        }

        resolve(blob)
      },
      type,
      quality
    )
  })
}

async function normalizarImagemRoteiro(file: File) {
  const imagemUrl = URL.createObjectURL(file)

  try {
    const imagem = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'))
      img.src = imagemUrl
    })

    const origemW = imagem.naturalWidth || imagem.width
    const origemH = imagem.naturalHeight || imagem.height

    if (!origemW || !origemH) {
      throw new Error('Imagem inválida.')
    }

    const alvoW = 1200
    const alvoH = 900
    const alvoRatio = alvoW / alvoH
    const origemRatio = origemW / origemH

    let sx = 0
    let sy = 0
    let sw = origemW
    let sh = origemH

    if (origemRatio > alvoRatio) {
      sw = origemH * alvoRatio
      sx = (origemW - sw) / 2
    } else if (origemRatio < alvoRatio) {
      sh = origemW / alvoRatio
      sy = (origemH - sh) / 2
    }

    const canvas = document.createElement('canvas')
    canvas.width = alvoW
    canvas.height = alvoH

    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Não foi possível preparar a imagem.')
    }

    ctx.drawImage(imagem, sx, sy, sw, sh, 0, 0, alvoW, alvoH)

    const blob = await canvasToBlob(canvas, 'image/webp', 0.86)

    return new File(
      [blob],
      `${slugify(file.name.replace(/\.[^.]+$/, '')) || 'roteiro'}-1200x900.webp`,
      {
        type: 'image/webp',
        lastModified: Date.now()
      }
    )
  } finally {
    URL.revokeObjectURL(imagemUrl)
  }
}


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

export default function GuiaNovoRoteiroPage() {
  const router = useRouter()
  const iniciouRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [user, setUser] = useState<UsuarioLocal | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [localizacao, setLocalizacao] = useState<LocalizacaoRoteiroValue>(criarLocalizacaoVazia())
  const [dataRoteiro, setDataRoteiro] = useState('')
  const [horaRoteiro, setHoraRoteiro] = useState('')
  const [preco, setPreco] = useState('')
  const [duracao, setDuracao] = useState('1')
  const [km, setKm] = useState('')
  const [limitePessoas, setLimitePessoas] = useState('10')
  const [dificuldade, setDificuldade] = useState<DificuldadeValue>('facil')
  const [recorrencia, setRecorrencia] = useState<RecorrenciaValue>('unica')
  const [roteiroDetalhado, setRoteiroDetalhado] = useState('')
  const [inclui, setInclui] = useState('')
  const [naoInclui, setNaoInclui] = useState('')
  const [orientacoes, setOrientacoes] = useState('')

  const [imagemFile, setImagemFile] = useState<File | null>(null)
  const [imagemPreview, setImagemPreview] = useState('')
  const [imagemInfo, setImagemInfo] = useState<ImagemInfo | null>(null)
  const [preparandoImagem, setPreparandoImagem] = useState(false)

  useEffect(() => {
    if (iniciouRef.current) return
    iniciouRef.current = true

    iniciar()

    return () => {
      if (imagemPreview) URL.revokeObjectURL(imagemPreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const avatarGuia = user?.avatar_url || user?.foto_url || user?.imagem_url || ''
  const nomeGuia = user?.nome || user?.name || user?.email || 'Guia'

  const podeSalvar = useMemo(() => {
    return (
      texto(titulo).length >= 4 &&
      texto(descricao).length >= 12 &&
      texto(localizacao.endereco_local).length >= 3 &&
      temCoordenadas(localizacao) &&
      texto(dataRoteiro).length > 0 &&
      texto(horaRoteiro).length > 0 &&
      numeroDecimal(preco) > 0 &&
      Boolean(imagemFile) &&
      !salvando &&
      !preparandoImagem
    )
  }, [
    titulo,
    descricao,
    localizacao,
    dataRoteiro,
    horaRoteiro,
    preco,
    imagemFile,
    salvando,
    preparandoImagem
  ])

  async function iniciar() {
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
    } catch (error) {
      console.error('Erro ao iniciar criação de roteiro:', error)
      setErro('Não foi possível carregar seus dados de guia.')
    } finally {
      setCarregando(false)
    }
  }

  function limparImagem() {
    if (imagemPreview) {
      URL.revokeObjectURL(imagemPreview)
    }

    setImagemFile(null)
    setImagemPreview('')
    setImagemInfo(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleImagemChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    setErro('')
    setMensagem('')

    if (!file.type.startsWith('image/')) {
      setErro('Selecione uma imagem válida em JPG, PNG ou WebP.')
      event.target.value = ''
      return
    }

    if (file.size > 12 * 1024 * 1024) {
      setErro('A imagem está muito grande. Use uma foto com até 12 MB.')
      event.target.value = ''
      return
    }

    try {
      setPreparandoImagem(true)

      const dimensoes = await carregarDimensoesImagem(file)
      const preview = URL.createObjectURL(file)

      if (imagemPreview) {
        URL.revokeObjectURL(imagemPreview)
      }

      let aviso = ''

      if (dimensoes.width < 900 || dimensoes.height < 675) {
        aviso = 'A imagem é menor que o ideal. O recomendado é 1200 x 900 px para melhor qualidade.'
      } else if (dimensoes.width < dimensoes.height) {
        aviso = 'A foto está na vertical. Ela será recortada em 4:3 nos cards; prefira foto horizontal quando possível.'
      } else if (Math.abs(dimensoes.width / dimensoes.height - 4 / 3) > 0.35) {
        aviso = 'A proporção está diferente de 4:3. O sistema fará um corte central para padronizar o card.'
      }

      setImagemFile(file)
      setImagemPreview(preview)
      setImagemInfo({
        nome: file.name,
        width: dimensoes.width,
        height: dimensoes.height,
        aviso
      })
    } catch (error) {
      console.error('Erro ao carregar imagem:', error)
      setErro('Não foi possível ler a imagem selecionada.')
      event.target.value = ''
    } finally {
      setPreparandoImagem(false)
    }
  }

  async function inserirRoteiroComFallback(payloadOriginal: AnyRecord) {
    let payload: AnyRecord = { ...payloadOriginal }

    for (let tentativa = 0; tentativa < 24; tentativa++) {
      const { data, error } = await supabase
        .from('roteiros')
        .insert(payload)
        .select('*')
        .maybeSingle()

      if (!error) return data as AnyRecord | null

      if (!erroDeColunaAusente(error)) throw error

      const coluna = extrairColunaAusente(error)

      if (!coluna || !(coluna in payload)) {
        console.error('Coluna ausente não mapeada ao criar roteiro:', error)
        throw error
      }

      delete payload[coluna]

      if (Object.keys(payload).length === 0) {
        throw new Error('Nenhuma coluna disponível para criar o roteiro.')
      }
    }

    throw new Error('Não foi possível criar o roteiro após ajustar colunas.')
  }

  async function uploadFotoRoteiro(guiaId: string) {
    if (!imagemFile) {
      throw new Error('Selecione uma foto de capa para o roteiro.')
    }

    const arquivoNormalizado = await normalizarImagemRoteiro(imagemFile)
    const filePath = `roteiros/${guiaId}/${Date.now()}-${slugify(titulo)}-${gerarIdCurto()}.webp`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_ROTEIROS)
      .upload(filePath, arquivoNormalizado, {
        cacheControl: '3600',
        contentType: 'image/webp',
        upsert: true
      })

    if (uploadError) {
      throw new Error(uploadError.message || 'Não foi possível enviar a foto do roteiro.')
    }

    const { data } = supabase.storage
      .from(BUCKET_ROTEIROS)
      .getPublicUrl(filePath)

    const publicUrl = data?.publicUrl || ''

    if (!publicUrl) {
      throw new Error('Não foi possível obter a URL pública da foto.')
    }

    return publicUrl
  }

  async function garantirGrupoDoRoteiro(roteiroId: string, guiaId: string) {
    try {
      const response = await fetch('/api/grupos/garantir-grupo-roteiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roteiroId,
          roteiro_id: roteiroId,
          guiaId,
          guia_id: guiaId
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.sucesso === false) {
        console.warn('Grupo do roteiro não foi criado agora:', data?.erro || data?.message || response.status)
        return null
      }

      return data?.grupo || data?.data || null
    } catch (error) {
      console.warn('Grupo do roteiro não foi criado agora. O fluxo poderá sincronizar depois:', error)
      return null
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!user?.id) {
      router.replace('/login')
      return
    }

    setErro('')
    setMensagem('')

    const tituloLimpo = texto(titulo)
    const descricaoLimpa = texto(descricao)
    const localPrincipal = texto(localizacao.endereco_local)
    const pontoReferencia = texto(localizacao.ponto_referencia)
    const localFormatado = texto(localizacao.endereco_formatado) || localPrincipal
    const dataLimpa = texto(dataRoteiro)
    const horaLimpa = texto(horaRoteiro)
    const precoNumero = numeroDecimal(preco)
    const kmNumero = numeroDecimal(km)
    const duracaoValor = texto(duracao)
    const limiteNumero = Math.max(1, Math.floor(Number(limitePessoas || 1)))
    const dataHoraBrasil = montarDataHoraBrasil(dataLimpa, horaLimpa)

    if (tituloLimpo.length < 4) {
      setErro('Informe um título claro para o roteiro.')
      return
    }

    if (descricaoLimpa.length < 12) {
      setErro('Escreva uma descrição curta para apresentar o roteiro.')
      return
    }

    if (!localPrincipal) {
      setErro('Informe o local principal do roteiro.')
      return
    }

    if (!temCoordenadas(localizacao)) {
      setErro('Clique em "Localizar endereço" antes de salvar o roteiro. Isso libera clima, mapa e segurança.')
      return
    }

    if (!dataLimpa || !horaLimpa) {
      setErro('Informe data e horário da experiência.')
      return
    }

    if (precoNumero <= 0) {
      setErro('Informe um valor válido para o roteiro.')
      return
    }

    if (!imagemFile) {
      setErro('Selecione uma foto de capa para o roteiro. O padrão recomendado é 1200 x 900 px.')
      return
    }

    setSalvando(true)

    try {
      const fotoUrl = await uploadFotoRoteiro(user.id)

      const payload: AnyRecord = {
        titulo: tituloLimpo,
        nome: tituloLimpo,
        descricao: descricaoLimpa,
        roteiro_detalhado: texto(roteiroDetalhado) || null,
        detalhes: texto(roteiroDetalhado) || null,

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

        embarque_data: dataLimpa,
        hora_trilha: horaLimpa,
        proxima_data: dataHoraBrasil || dataLimpa,
        data_trilha: dataHoraBrasil || dataLimpa,
        data_roteiro: dataHoraBrasil || dataLimpa,
        embarque_data_hora: dataHoraBrasil || dataLimpa,

        preco: precoNumero,
        valor: precoNumero,
        preco_total: precoNumero,
        preco_por_pessoa: precoNumero,

        km: kmNumero,
        distancia_km: kmNumero,
        duracao: duracaoValor,

        dificuldade,
        nivel: dificuldade,
        intensidade: dificuldade,
        recorrencia,

        limite_pessoas: limiteNumero,
        capacidade: limiteNumero,
        max_pessoas: limiteNumero,

        inclui: texto(inclui) || null,
        nao_inclui: texto(naoInclui) || null,
        orientacoes: texto(orientacoes) || null,

        foto_capa: fotoUrl,
        foto_url: fotoUrl,
        imagem_url: fotoUrl,
        image_url: fotoUrl,
        capa_url: fotoUrl,

        id_guia: user.id,
        guia_id: user.id,
        user_id: user.id,
        usuario_id: user.id,
        criado_por: user.id,
        created_by: user.id,
        owner_id: user.id,

        guia_nome: user.nome || user.name || user.email || 'Guia PrussikTrails',
        nome_guia: user.nome || user.name || user.email || 'Guia PrussikTrails',

        ativo: false,
        status: 'pendente_aprovacao',
        situacao: 'pendente_aprovacao',
        publicacao: 'em_analise',

        observacao_guia: 'Roteiro criado pelo guia e enviado para aprovação.',
        solicitacao_ativacao_em: new Date().toISOString(),
        solicitado_ativacao_em: new Date().toISOString(),
        revisao_solicitada_em: new Date().toISOString(),
        enviado_para_aprovacao_em: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const roteiroCriado = await inserirRoteiroComFallback(payload)

      if (!roteiroCriado?.id) {
        throw new Error('O roteiro foi salvo, mas o ID não foi retornado.')
      }

      const grupo = await garantirGrupoDoRoteiro(String(roteiroCriado.id), user.id)

      setMensagem(
        grupo?.id
          ? 'Roteiro criado, grupo da experiência disponível e enviado para aprovação do Admin.'
          : 'Roteiro criado e enviado para aprovação do Admin. O grupo poderá ser sincronizado automaticamente.'
      )
      window.setTimeout(() => {
        router.push('/guia/roteiros')
      }, 900)
    } catch (error: any) {
      console.error('Erro ao criar roteiro:', error)
      setErro(error?.message || 'Não foi possível criar o roteiro agora.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <main className="page">
        <style>{styles}</style>

        <section className="loadingCard">
          <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          <p>Carregando criação de roteiro...</p>
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
          <span>Novo roteiro outdoor</span>
        </button>

        <button
          type="button"
          className="profileButton"
          onClick={() => router.push('/guia/perfil')}
          aria-label="Abrir perfil do guia"
        >
          {avatarGuia ? (
            <img src={avatarGuia} alt={nomeGuia} />
          ) : (
            <span>{nomeGuia.slice(0, 1).toUpperCase()}</span>
          )}
        </button>
      </header>

      <div className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">Guia PrussikTrails</p>
            <h1>Crie uma nova experiência.</h1>
            <p>
              Cadastre o roteiro com informações claras, foto padronizada e dados operacionais para o Admin revisar antes de publicar.
            </p>
          </div>

          <div className="heroTip">
            <strong>Padrão da foto</strong>
            <span>Imagem recomendada: 1200 x 900 px, formato horizontal, boa iluminação e ponto principal centralizado.</span>
          </div>
        </section>

        {erro && <div className="alert error">{erro}</div>}
        {mensagem && <div className="alert success">{mensagem}</div>}

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
                <input
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
                  placeholder="Ex.: Rapel Pedra do Elefante"
                  maxLength={90}
                />
              </label>

              <label className="field full">
                <span>Descrição curta *</span>
                <textarea
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  placeholder="Resumo atrativo para o aventureiro entender a experiência."
                  maxLength={420}
                />
              </label>

              <div className="field full">
                <LocalizacaoRoteiroBox value={localizacao} onChange={setLocalizacao} />
              </div>

              <label className="field">
                <span>Data *</span>
                <input
                  type="date"
                  value={dataRoteiro}
                  onChange={(event) => setDataRoteiro(event.target.value)}
                />
              </label>

              <label className="field">
                <span>Hora *</span>
                <input
                  type="time"
                  value={horaRoteiro}
                  onChange={(event) => setHoraRoteiro(event.target.value)}
                />
              </label>

              <label className="field">
                <span>Valor por pessoa *</span>
                <input
                  value={preco}
                  onChange={(event) => setPreco(event.target.value)}
                  placeholder="Ex.: 120,00"
                  inputMode="decimal"
                />
              </label>

              <label className="field">
                <span>Distância em km</span>
                <input
                  value={km}
                  onChange={(event) => setKm(event.target.value)}
                  placeholder="Ex.: 8"
                  inputMode="decimal"
                />
              </label>

              <label className="field">
                <span>Duração</span>
                <input
                  value={duracao}
                  onChange={(event) => setDuracao(event.target.value)}
                  placeholder="Ex.: 4h, 1 dia, fim de semana"
                />
              </label>

              <label className="field">
                <span>Limite de pessoas</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={limitePessoas}
                  onChange={(event) => setLimitePessoas(event.target.value)}
                />
              </label>

              <label className="field">
                <span>Recorrência</span>
                <select
                  value={recorrencia}
                  onChange={(event) => setRecorrencia(event.target.value as RecorrenciaValue)}
                >
                  {RECORRENCIAS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <aside className="card imageCard">
            <div className="cardHeader">
              <span>02</span>
              <div>
                <h2>Foto de capa</h2>
                <p>A imagem será usada nos cards, detalhes e compartilhamentos.</p>
              </div>
            </div>

            <div
              className={`uploadPreview ${imagemPreview ? 'hasImage' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
              }}
            >
              {imagemPreview ? (
                <img src={imagemPreview} alt="Prévia do roteiro" />
              ) : (
                <div>
                  <strong>Selecionar foto</strong>
                  <small>Preview em 4:3, o mesmo padrão dos cards públicos.</small>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              className="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImagemChange}
            />

            <div className="imageHelp">
              <strong>Imagem recomendada:</strong>
              <span>1200 x 900 px · formato horizontal · boa iluminação · ponto principal centralizado.</span>
              <span>O sistema fará corte central em 4:3 e salvará a foto compactada em WebP.</span>
            </div>

            {imagemInfo && (
              <div className="imageInfo">
                <strong>{imagemInfo.nome}</strong>
                <span>{imagemInfo.width} x {imagemInfo.height} px</span>
                {imagemInfo.aviso && <em>{imagemInfo.aviso}</em>}
              </div>
            )}

            {imagemPreview && (
              <button
                type="button"
                className="lightButton"
                onClick={limparImagem}
                disabled={salvando}
              >
                Trocar imagem
              </button>
            )}
          </aside>

          <section className="card fullWidth">
            <div className="cardHeader">
              <span>03</span>
              <div>
                <h2>Nível e roteiro detalhado</h2>
                <p>Ajude o aventureiro a entender preparo, percurso e itens importantes.</p>
              </div>
            </div>

            <div className="difficultyGrid">
              {DIFICULDADES.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={`difficulty ${dificuldade === item.value ? 'active' : ''}`}
                  onClick={() => setDificuldade(item.value)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.descricao}</span>
                </button>
              ))}
            </div>

            <div className="fieldsGrid lowerFields">
              <label className="field full">
                <span>Roteiro detalhado</span>
                <textarea
                  className="large"
                  value={roteiroDetalhado}
                  onChange={(event) => setRoteiroDetalhado(event.target.value)}
                  placeholder="Descreva como a aventura deve acontecer: encontro, acesso, percurso, paradas, cuidados, retorno..."
                />
              </label>

              <label className="field">
                <span>Inclui</span>
                <textarea
                  value={inclui}
                  onChange={(event) => setInclui(event.target.value)}
                  placeholder="Um item por linha: guia, equipamentos, seguro..."
                />
              </label>

              <label className="field">
                <span>Não inclui</span>
                <textarea
                  value={naoInclui}
                  onChange={(event) => setNaoInclui(event.target.value)}
                  placeholder="Transporte, alimentação, estacionamento..."
                />
              </label>

              <label className="field full">
                <span>Orientações ao aventureiro</span>
                <textarea
                  value={orientacoes}
                  onChange={(event) => setOrientacoes(event.target.value)}
                  placeholder="O que levar, preparo físico, roupa recomendada, clima, documentos, restrições..."
                />
              </label>
            </div>
          </section>

          <section className="submitBar">
            <div>
              <strong>Enviar para aprovação</strong>
              <span>O roteiro ficará pendente até o Admin revisar e publicar.</span>
            </div>

            <div className="submitActions">
              <button
                type="button"
                className="secondaryButton"
                onClick={() => router.push('/guia/roteiros')}
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="primaryButton"
                disabled={!podeSalvar}
              >
                {salvando ? 'Salvando...' : preparandoImagem ? 'Preparando imagem...' : 'Criar roteiro'}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  )
}

const styles = `
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
    grid-template-columns: minmax(0, 1fr) 360px;
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

  .mainCard {
    grid-column: 1;
  }

  .imageCard {
    grid-column: 2;
    position: relative;
    top: auto;
    align-self: start;
    height: fit-content;
    overflow: visible;
  }

  .fullWidth {
    grid-column: 1 / -1;
  }

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

  .lowerFields {
    margin-top: 16px;
  }

  .field {
    display: grid;
    gap: 7px;
  }

  .field.full {
    grid-column: 1 / -1;
  }

  .field span {
    color: #475569;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  input,
  textarea,
  select {
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

  textarea.large {
    min-height: 170px;
  }

  input:focus,
  textarea:focus,
  select:focus {
    border-color: rgba(132, 204, 22, 0.55);
    box-shadow: 0 0 0 4px rgba(132, 204, 22, 0.13);
  }

  .uploadPreview {
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: 26px;
    border: 1px dashed rgba(32, 60, 46, 0.22);
    background:
      radial-gradient(circle at 50% 0%, rgba(132, 204, 22, 0.12), transparent 38%),
      #eef2e5;
    display: grid;
    place-items: center;
    overflow: hidden;
    cursor: pointer;
    text-align: center;
    color: #203c2e;
    transition: 0.2s ease;
  }

  .uploadPreview:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 30px rgba(32, 60, 46, 0.10);
  }

  .uploadPreview.hasImage {
    border-style: solid;
    border-color: rgba(32, 60, 46, 0.10);
  }

  .uploadPreview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }

  .uploadPreview strong {
    display: block;
    font-size: 18px;
    font-weight: 950;
  }

  .uploadPreview small {
    display: block;
    max-width: 240px;
    margin: 7px auto 0;
    color: rgba(23, 32, 24, 0.58);
    font-size: 12px;
    line-height: 1.4;
    font-weight: 750;
  }

  .fileInput {
    display: none;
  }

  .imageHelp,
  .imageInfo {
    margin-top: 12px;
    border-radius: 20px;
    padding: 13px;
    background: rgba(32, 60, 46, 0.05);
    display: grid;
    gap: 5px;
  }

  .imageHelp strong,
  .imageInfo strong {
    color: #203c2e;
    font-size: 12px;
    font-weight: 950;
  }

  .imageHelp span,
  .imageInfo span {
    color: rgba(23, 32, 24, 0.62);
    font-size: 12px;
    line-height: 1.42;
    font-weight: 750;
  }

  .imageInfo em {
    color: #92400e;
    background: #fef3c7;
    border-radius: 14px;
    padding: 8px 10px;
    font-size: 11px;
    line-height: 1.35;
    font-style: normal;
    font-weight: 850;
  }


  .geoBox {
    border-radius: 26px;
    padding: 18px;
    background: rgba(255, 253, 247, 0.78);
    border: 1px solid rgba(32, 60, 46, 0.10);
    box-shadow: 0 16px 38px rgba(32, 60, 46, 0.07);
  }

  .geoHeader {
    margin-bottom: 14px;
  }

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

  .geoResult span,
  .geoResult small {
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

  .geoOk,
  .geoErro {
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

  .difficultyGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .difficulty {
    border: 1px solid rgba(32, 60, 46, 0.10);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.68);
    padding: 14px;
    color: #172018;
    text-align: left;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .difficulty:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(32, 60, 46, 0.08);
  }

  .difficulty.active {
    background: #203c2e;
    color: #fffdf7;
    border-color: #203c2e;
  }

  .difficulty strong {
    display: block;
    font-size: 14px;
    font-weight: 950;
  }

  .difficulty span {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 750;
    color: rgba(23, 32, 24, 0.62);
  }

  .difficulty.active span {
    color: rgba(255, 253, 247, 0.74);
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

  .primaryButton,
  .secondaryButton,
  .lightButton {
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

  .primaryButton:disabled {
    opacity: 0.52;
    cursor: not-allowed;
  }

  .secondaryButton {
    background: rgba(255, 255, 255, 0.12);
    color: #fffdf7;
    border: 1px solid rgba(255, 255, 255, 0.18);
  }

  .lightButton {
    width: 100%;
    margin-top: 12px;
    background: #fffdf7;
    color: #203c2e;
    border: 1px solid rgba(32, 60, 46, 0.12);
  }

  .primaryButton:hover:not(:disabled),
  .secondaryButton:hover:not(:disabled),
  .lightButton:hover:not(:disabled) {
    transform: translateY(-1px);
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
    .hero,
    .formGrid {
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

    .brand {
      gap: 8px;
    }

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

    .hero > div:first-child,
    .heroTip,
    .card {
      border-radius: 24px;
    }

    .hero > div:first-child {
      padding: 22px;
    }

    .hero h1 {
      font-size: 40px;
    }

    .fieldsGrid,
  
  .geoBox {
    border-radius: 26px;
    padding: 18px;
    background: rgba(255, 253, 247, 0.78);
    border: 1px solid rgba(32, 60, 46, 0.10);
    box-shadow: 0 16px 38px rgba(32, 60, 46, 0.07);
  }

  .geoHeader {
    margin-bottom: 14px;
  }

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

  .geoResult span,
  .geoResult small {
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

  .geoOk,
  .geoErro {
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

  .difficultyGrid {
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

    .primaryButton,
    .secondaryButton,
    .geoButton {
      width: 100%;
    }
  }
`
