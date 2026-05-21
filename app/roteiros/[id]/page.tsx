'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { registrarAtividade } from '@/lib/logAtividade'

type Roteiro = {
  id: string
  titulo: string
  descricao: string
  preco: number
  duracao_horas: number
  km: number
  dificuldade: string
  localizacao: string
  foto_capa: string | null
  galeria_fotos: string[]
  embarque_local: string
  embarque_data: string
  retorno_local: string
  retorno_data: string
  roteiro_detalhado?: string
  status: string
  id_guia: string
}

type Guia = {
  id: string
  nome: string
  email: string
  avatar_url: string | null
  bio: string | null
  instagram: string | null
}

export default function DetalhesRoteiro() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [roteiro, setRoteiro] = useState<Roteiro | null>(null)
  const [guia, setGuia] = useState<Guia | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [reservando, setReservando] = useState(false)
  const [quantidadePessoas, setQuantidadePessoas] = useState(1)
  const [mensagem, setMensagem] = useState('')
  const [fotoSelecionada, setFotoSelecionada] = useState(0)
  const [todasFotos, setTodasFotos] = useState<string[]>([])
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUsuarioLogado(JSON.parse(userData))
    }
    carregarRoteiro()
  }, [id])

  const carregarRoteiro = async () => {
    setCarregando(true)
    try {
      const { data: roteiroData, error: roteiroError } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id', id)
        .single()

      if (roteiroError) throw roteiroError

      if (roteiroData.status !== 'ativo') {
        setMensagem('Este roteiro não está disponível no momento.')
        setCarregando(false)
        return
      }

      setRoteiro(roteiroData)

      const fotosArray: string[] = roteiroData.galeria_fotos || []
      const fotosValidas = fotosArray.filter((foto: string) => foto && foto.trim() !== '')
      
      let listaFotos: string[] = []
      if (roteiroData.foto_capa) {
        listaFotos.push(roteiroData.foto_capa)
      }
      listaFotos = [...listaFotos, ...fotosValidas.filter((f: string) => f !== roteiroData.foto_capa)]
      setTodasFotos(listaFotos)

      if (roteiroData.id_guia) {
        const { data: guiaData } = await supabase
          .from('users')
          .select('id, nome, email, avatar_url, bio, instagram')
          .eq('id', roteiroData.id_guia)
          .single()

        if (guiaData) {
          setGuia(guiaData)
        }
      }

    } catch (err) {
      console.error('Erro ao carregar roteiro:', err)
      setMensagem('Erro ao carregar roteiro.')
    } finally {
      setCarregando(false)
    }
  }

  const handleReservar = async () => {
    if (!usuarioLogado) {
      localStorage.setItem('redirectAfterLogin', `/roteiros/${id}`)
      router.push('/login')
      return
    }

    if (usuarioLogado.tipo !== 'cliente') {
      setMensagem('⚠️ Apenas aventureiros podem fazer reservas')
      return
    }

    setReservando(true)
    setMensagem('')

    try {
      const dataTrilha = roteiro?.embarque_data 
        ? roteiro.embarque_data
        : new Date().toISOString().split('T')[0]

      const reservaData = {
        cliente_id: usuarioLogado.id,
        roteiro_id: roteiro?.id,
        data_trilha: dataTrilha,
        quantidade_pessoas: quantidadePessoas,
        valor_total: (roteiro?.preco || 0) * quantidadePessoas,
        status: 'pendente'
      }

      const { error } = await supabase.from('reservas').insert(reservaData)

      if (error) throw error

      const primeiroNome = usuarioLogado.nome?.split(' ')[0] || usuarioLogado.email?.split('@')[0] || 'Cliente'
      await registrarAtividade(
        usuarioLogado.id,
        'cliente',
        primeiroNome,
        'reservou',
        `${primeiroNome} reservou o roteiro "${roteiro?.titulo}"`,
        roteiro?.id
      )

      setMensagem('✅ Reserva solicitada com sucesso! Aguardando confirmação.')
      setTimeout(() => router.push('/cliente/minhas-reservas'), 2000)
    } catch (err: any) {
      setMensagem(`❌ Erro ao realizar reserva: ${err.message || 'Tente novamente.'}`)
    } finally {
      setReservando(false)
    }
  }

  const formatarDataHora = (dataHora: string) => {
    if (!dataHora) return { data: 'Não informada', hora: 'Não informado' }
    try {
      const dataObj = new Date(dataHora)
      if (isNaN(dataObj.getTime())) return { data: 'Data inválida', hora: 'Horário inválido' }
      
      return {
        data: dataObj.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }),
        hora: dataObj.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    } catch {
      return { data: 'Erro', hora: 'Erro' }
    }
  }

  const getDificuldadeIcone = (dificuldade: string) => {
    switch (dificuldade?.toLowerCase()) {
      case 'fácil': return '🥾'
      case 'médio': return '⛰️'
      case 'difícil': return '🏔️'
      case 'extremo': return '⚠️'
      default: return '🥾'
    }
  }

  const getDificuldadeCor = (dificuldade: string) => {
    switch (dificuldade?.toLowerCase()) {
      case 'fácil': return '#10b981'
      case 'médio': return '#f59e0b'
      case 'difícil': return '#ef4444'
      case 'extremo': return '#8b5cf6'
      default: return '#6b7280'
    }
  }

  const handleGuiaClick = () => guia?.id && router.push(`/guia/publico/${guia.id}`)

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid #e5e7eb', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>Carregando roteiro...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  if (!roteiro) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
        <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PussikTrails</h1>
            <button onClick={() => router.back()} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '6px 16px', borderRadius: '40px', cursor: 'pointer' }}>← Voltar</button>
          </div>
        </div>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '16px' }}>Roteiro não encontrado</h2>
          <button onClick={() => router.push('/cliente/roteiros')} style={{ marginTop: '16px', backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 24px', borderRadius: '40px', cursor: 'pointer' }}>Ver roteiros</button>
        </div>
      </div>
    )
  }

  const embarque = formatarDataHora(roteiro.embarque_data)
  const retorno = formatarDataHora(roteiro.retorno_data)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <style jsx global>{`
        @media (min-width: 768px) {
          .detalhes-container { padding: 32px 24px !important; }
          .galeria-principal { height: 500px !important; }
          .detalhes-grid { flex-direction: row !important; gap: 48px !important; }
          .detalhes-coluna { flex: 2 !important; min-width: 0 !important; }
          .reserva-coluna { flex: 1 !important; min-width: 0 !important; position: sticky; top: 100px; align-self: flex-start; }
          .caracteristicas-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>

      {/* HEADER */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PussikTrails</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => router.back()} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '6px 16px', borderRadius: '40px', cursor: 'pointer', fontSize: '12px' }}>← Voltar</button>
            {usuarioLogado?.tipo === 'cliente' && (
              <button onClick={() => router.push('/cliente/dashboard')} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '6px 12px', borderRadius: '40px', fontSize: '12px', cursor: 'pointer' }}>Dashboard</button>
            )}
          </div>
        </div>
      </div>

      <div className="detalhes-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
        
        {/* GALERIA */}
        {todasFotos.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div className="galeria-principal" style={{ borderRadius: '20px', overflow: 'hidden', height: '280px', position: 'relative', backgroundColor: '#1f2937' }}>
              <img src={todasFotos[fotoSelecionada]} alt={roteiro.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 12px', borderRadius: '20px' }}>
                <span style={{ color: 'white', fontSize: '12px' }}>{getDificuldadeIcone(roteiro.dificuldade)} {roteiro.dificuldade}</span>
              </div>
            </div>
            {todasFotos.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '12px', paddingBottom: '4px' }}>
                {todasFotos.map((foto, index) => (
                  <button key={index} onClick={() => setFotoSelecionada(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <img src={foto} alt="" style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '8px', border: fotoSelecionada === index ? '2px solid #dc2626' : '2px solid transparent' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <div className="detalhes-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* COLUNA ESQUERDA - INFORMAÇÕES */}
          <div className="detalhes-coluna" style={{ flex: '1', minWidth: '0' }}>
            
            {/* TÍTULO E DESCRIÇÃO */}
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, marginBottom: '12px' }}>{roteiro.titulo}</h1>
              <p style={{ color: '#4b5563', fontSize: '14px', lineHeight: 1.5 }}>{roteiro.descricao}</p>
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📍</span>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>{roteiro.localizacao}</span>
              </div>
            </div>

            {/* CARACTERÍSTICAS */}
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Características</h3>
              <div className="caracteristicas-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                  <div style={{ fontSize: '24px' }}>🥾</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{roteiro.km}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>KM</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                  <div style={{ fontSize: '24px' }}>⏱️</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{roteiro.duracao_horas}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>Horas</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                  <div style={{ fontSize: '24px' }}>{getDificuldadeIcone(roteiro.dificuldade)}</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: getDificuldadeCor(roteiro.dificuldade) }}>{roteiro.dificuldade}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>Dificuldade</div>
                </div>
              </div>
            </div>

            {/* LOGÍSTICA - COM DATA E HORA */}
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Logística</h3>
              
              <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📍</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px' }}>Embarque</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{roteiro.embarque_local || 'Não informado'}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    📅 {embarque.data} • ⏰ {embarque.hora}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏁</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px' }}>Retorno</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{roteiro.retorno_local || 'Não informado'}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    📅 {retorno.data} • ⏰ {retorno.hora}
                  </div>
                </div>
              </div>
            </div>

            {/* GUIA */}
            {guia && (
              <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Seu Guia</h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div onClick={handleGuiaClick} style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}>
                    {guia.avatar_url ? <img src={guia.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '24px', color: 'white' }}>{guia.nome?.charAt(0).toUpperCase() || 'G'}</span>}
                  </div>
                  <div>
                    <button onClick={handleGuiaClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#16a34a', textDecoration: 'underline' }}>{guia.nome}</div>
                    </button>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>📷 {guia.instagram || 'Instagram não informado'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA - RESERVA */}
          <div className="reserva-coluna" style={{ minWidth: '280px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', border: '1px solid #e5e7eb' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>R$ {roteiro.preco}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>por pessoa</div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Pessoas</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f9fafb', borderRadius: '40px', padding: '4px', border: '1px solid #e5e7eb' }}>
                  <button onClick={() => setQuantidadePessoas(Math.max(1, quantidadePessoas - 1))} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '18px' }}>-</button>
                  <span style={{ flex: 1, textAlign: 'center', fontSize: '16px', fontWeight: '600' }}>{quantidadePessoas}</span>
                  <button onClick={() => setQuantidadePessoas(quantidadePessoas + 1)} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '18px' }}>+</button>
                </div>
              </div>

              <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Valor por pessoa</span>
                  <span>R$ {roteiro.preco}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Quantidade</span>
                  <span>{quantidadePessoas}x</span>
                </div>
                <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '8px', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>Total</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>R$ {(roteiro.preco * quantidadePessoas).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {mensagem && (
                <div style={{ marginBottom: '16px', padding: '10px', borderRadius: '10px', fontSize: '12px', textAlign: 'center', backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2', color: mensagem.includes('✅') ? '#16a34a' : '#dc2626' }}>
                  {mensagem}
                </div>
              )}

              <button
                onClick={handleReservar}
                disabled={reservando}
                style={{ width: '100%', backgroundColor: usuarioLogado ? '#dc2626' : '#6b7280', color: 'white', padding: '14px', borderRadius: '40px', border: 'none', fontWeight: 'bold', cursor: usuarioLogado ? 'pointer' : 'pointer', opacity: reservando ? 0.6 : 1 }}
              >
                {reservando ? 'Processando...' : (usuarioLogado ? '📌 Reservar Agora' : '🔒 Faça login')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}