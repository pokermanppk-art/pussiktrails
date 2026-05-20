'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  embarque_data_hora: string
  retorno_local: string
  retorno_data_hora: string
  roteiro_detalhado?: string
  status: string
  guia_id?: string
  guia_nome?: string
  guia_email?: string
  guia_avatar?: string
  guia_bio?: string
}

export default function ClienteRoteiroDetalhe() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [user, setUser] = useState<any>(null)
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null)
  const [roteiro, setRoteiro] = useState<Roteiro | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [reservando, setReservando] = useState(false)
  const [quantidadePessoas, setQuantidadePessoas] = useState(1)
  const [mensagem, setMensagem] = useState('')
  const [fotoSelecionada, setFotoSelecionada] = useState(0)
  const [todasFotos, setTodasFotos] = useState<string[]>([])

  // Carrega usuário logado
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUsuarioLogado(parsedUser)
      if (parsedUser.tipo === 'cliente') {
        setUser(parsedUser)
      }
    }
    carregarRoteiro()
  }, [id])

  const carregarRoteiro = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data.status !== 'ativo') {
        setMensagem('Este roteiro não está disponível no momento.')
        setCarregando(false)
        return
      }

      let guiaNome = 'Guia'
      let guiaEmail = ''
      let guiaAvatar = null
      let guiaBio = null

      if (data.id_guia) {
        const { data: guia } = await supabase
          .from('users')
          .select('nome, email, avatar_url, bio')
          .eq('id', data.id_guia)
          .single()
        if (guia) {
          guiaNome = guia.nome
          guiaEmail = guia.email
          guiaAvatar = guia.avatar_url
          guiaBio = guia.bio
        }
      }

      const fotosArray: string[] = data.galeria_fotos || []
      const fotosValidas = fotosArray.filter((foto: string) => foto && foto.trim() !== '')
      
      let listaFotos: string[] = []
      if (data.foto_capa) {
        listaFotos.push(data.foto_capa)
      }
      listaFotos = [...listaFotos, ...fotosValidas.filter((f: string) => f !== data.foto_capa)]
      
      setTodasFotos(listaFotos)
      
      setRoteiro({
        ...data,
        guia_nome: guiaNome,
        guia_email: guiaEmail,
        guia_id: data.id_guia,
        guia_avatar: guiaAvatar,
        guia_bio: guiaBio,
        galeria_fotos: fotosValidas
      })
    } catch (err) {
      console.error('Erro ao carregar roteiro:', err)
      setMensagem('Erro ao carregar roteiro.')
    } finally {
      setCarregando(false)
    }
  }

  const handleReservar = async () => {
    // VERIFICAÇÃO: Se não estiver logado, redireciona
    if (!usuarioLogado) {
      localStorage.setItem('redirectAfterLogin', `/cliente/roteiros/${id}`)
      router.push('/login')
      return
    }

    // Se for guia, não pode reservar
    if (usuarioLogado.tipo !== 'cliente') {
      setMensagem('⚠️ Apenas aventureiros podem fazer reservas')
      return
    }

    setReservando(true)
    setMensagem('')

    try {
      const dataTrilha = roteiro?.embarque_data_hora 
        ? new Date(roteiro.embarque_data_hora).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      const reservaData = {
        cliente_id: usuarioLogado.id,
        roteiro_id: roteiro?.id,
        data_trilha: dataTrilha,
        quantidade_pessoas: quantidadePessoas,
        valor_total: (roteiro?.preco || 0) * quantidadePessoas,
        status: 'pendente'
      }

      const { data: reserva, error } = await supabase
        .from('reservas')
        .insert(reservaData)
        .select()

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
      setTimeout(() => {
        router.push('/cliente/minhas-reservas')
      }, 2000)
    } catch (err: any) {
      console.error('Erro ao reservar:', err)
      setMensagem(`❌ Erro ao realizar reserva: ${err.message || 'Tente novamente.'}`)
    } finally {
      setReservando(false)
    }
  }

  const formatarData = (dataHora: string) => {
    if (!dataHora) return { data: 'Data não informada', hora: 'Horário não informado' }
    try {
      const data = new Date(dataHora)
      if (isNaN(data.getTime())) {
        return { data: 'Data não informada', hora: 'Horário não informado' }
      }
      return {
        data: data.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }),
        hora: data.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    } catch {
      return { data: 'Data não informada', hora: 'Horário não informado' }
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

  const handleGuiaClick = () => {
    if (roteiro?.guia_id) {
      router.push(`/guia/publico/${roteiro.guia_id}`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

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
        <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PrussikTrails</h1>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>Sair</button>
          </div>
        </div>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Roteiro não encontrado</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>{mensagem || 'O roteiro que você procura não está disponível.'}</p>
          <button onClick={() => router.push('/cliente/roteiros')} style={{ backgroundColor: '#dc2626', color: 'white', padding: '12px 24px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
            ← Voltar para roteiros
          </button>
        </div>
      </div>
    )
  }

  const embarque = formatarData(roteiro.embarque_data_hora)
  const retorno = formatarData(roteiro.retorno_data_hora)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PrussikTrails</h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>Detalhes da aventura</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => router.push('/roteiros')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', color: '#374151', fontWeight: '600', fontSize: '13px' }}>← Roteiros</button>
            {usuarioLogado && usuarioLogado.tipo === 'cliente' && (
              <button onClick={() => router.push('/cliente/perfil')} style={{ backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Perfil</button>
            )}
            {usuarioLogado && (
              <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Sair</button>
            )}
            {!usuarioLogado && (
              <button onClick={() => router.push('/login')} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Entrar</button>
            )}
          </div>
        </div>
      </div>

      {/* CONTEÚDO - (mantenha o resto do layout igual) */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        {/* GALERIA DE FOTOS */}
        {todasFotos.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ borderRadius: '24px', overflow: 'hidden', height: '420px', position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginBottom: '16px', backgroundColor: '#1f2937' }}>
              <img key={todasFotos[fotoSelecionada]} src={todasFotos[fotoSelecionada]} alt={roteiro.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: '20px', left: '20px', backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', padding: '8px 20px', borderRadius: '40px' }}>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
                  {getDificuldadeIcone(roteiro.dificuldade)} {roteiro.dificuldade?.toUpperCase()}
                </span>
              </div>
            </div>
            {todasFotos.length > 1 && (
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', justifyContent: 'center' }}>
                {todasFotos.map((foto: string, index: number) => (
                  <button key={index} onClick={() => setFotoSelecionada(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={foto} alt={`Foto ${index + 1}`} style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '12px', border: fotoSelecionada === index ? '2px solid #dc2626' : '2px solid transparent' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
          {/* COLUNA ESQUERDA */}
          <div>
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: '0 0 12px 0' }}>{roteiro.titulo}</h1>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>{roteiro.descricao}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: '20px' }}>📍</span>
                <span style={{ color: '#374151', fontWeight: '500' }}>{roteiro.localizacao}</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '20px' }}>Características da Trilha</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>🥾</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{roteiro.km}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>KM de trilha</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏱️</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{roteiro.duracao_horas}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Horas de duração</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{getDificuldadeIcone(roteiro.dificuldade)}</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: getDificuldadeCor(roteiro.dificuldade) }}>{roteiro.dificuldade}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Dificuldade</div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '20px' }}>Logística da Aventura</h3>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '20px' }}>📍</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>Ponto de Encontro</div>
                    <div style={{ fontSize: '14px', color: '#374151' }}>{roteiro.embarque_local}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>📅 {embarque.data} • ⏰ {embarque.hora}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '20px' }}>🏁</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>Ponto de Retorno</div>
                    <div style={{ fontSize: '14px', color: '#374151' }}>{roteiro.retorno_local}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>📅 {retorno.data} • ⏰ {retorno.hora}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD DO GUIA */}
            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '20px' }}>Seu Guia</h3>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {roteiro.guia_avatar ? (
                    <img src={roteiro.guia_avatar} alt={roteiro.guia_nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '28px', color: 'white' }}>{roteiro.guia_nome?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <button onClick={handleGuiaClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#111827', textDecoration: 'underline', textDecorationColor: '#dc2626' }}>
                      {roteiro.guia_nome}
                    </div>
                  </button>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{roteiro.guia_bio || 'Guia experiente, pronto para te mostrar o melhor da trilha!'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA - RESERVA */}
          <div style={{ position: 'sticky', top: '100px', alignSelf: 'start' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '28px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc2626' }}>
                  R$ {roteiro.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>por pessoa</div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Número de pessoas</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f9fafb', borderRadius: '40px', padding: '4px', border: '1px solid #e5e7eb' }}>
                  <button type="button" onClick={() => setQuantidadePessoas(Math.max(1, quantidadePessoas - 1))} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '20px' }}>-</button>
                  <span style={{ fontSize: '18px', fontWeight: '600', flex: 1, textAlign: 'center' }}>{quantidadePessoas}</span>
                  <button type="button" onClick={() => setQuantidadePessoas(quantidadePessoas + 1)} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '20px' }}>+</button>
                </div>
              </div>

              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#6b7280' }}>Valor por pessoa</span>
                  <span style={{ fontWeight: '500' }}>R$ {roteiro.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#6b7280' }}>Quantidade</span>
                  <span style={{ fontWeight: '500' }}>{quantidadePessoas}x</span>
                </div>
                <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>Total</span>
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
                      R$ {(roteiro.preco * quantidadePessoas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {mensagem && (
                <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '12px', backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2', color: mensagem.includes('✅') ? '#16a34a' : '#dc2626', fontSize: '13px', textAlign: 'center' }}>
                  {mensagem}
                </div>
              )}

              <button
                onClick={handleReservar}
                disabled={reservando}
                style={{
                  width: '100%',
                  backgroundColor: usuarioLogado ? '#dc2626' : '#6b7280',
                  color: 'white',
                  padding: '16px',
                  borderRadius: '40px',
                  border: 'none',
                  cursor: reservando ? 'not-allowed' : (usuarioLogado ? 'pointer' : 'pointer'),
                  fontWeight: 'bold',
                  fontSize: '16px',
                  transition: 'background-color 0.2s',
                  opacity: reservando ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!reservando && usuarioLogado) e.currentTarget.style.backgroundColor = '#b91c1c'
                }}
                onMouseLeave={(e) => {
                  if (!reservando && usuarioLogado) e.currentTarget.style.backgroundColor = '#dc2626'
                }}
              >
                {reservando ? 'Processando...' : (usuarioLogado ? '📌 Reservar Agora' : '🔒 Faça login para reservar')}
              </button>

              {!usuarioLogado && (
                <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
                  Crie uma conta ou faça login para garantir sua vaga
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}