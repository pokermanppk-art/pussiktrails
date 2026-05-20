'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AvaliarCliente() {
  const router = useRouter()
  const params = useParams()
  const reservaId = params.id as string
  
  const [user, setUser] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [reserva, setReserva] = useState<any>(null)
  const [cliente, setCliente] = useState<any>(null)
  const [roteiro, setRoteiro] = useState<any>(null)
  const [nota, setNota] = useState<number>(0)
  const [comentario, setComentario] = useState('')
  const [notaHover, setNotaHover] = useState<number>(0)

  useEffect(() => {
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
    carregarDados(parsedUser.id)
  }, [router, reservaId])

  const carregarDados = async (guiaId: string) => {
    setCarregando(true)
    setErro(null)
    
    try {
      // 1. Buscar reserva
      const { data: reservaData, error: reservaError } = await supabase
        .from('reservas')
        .select('*')
        .eq('id', reservaId)
        .single()

      if (reservaError) throw reservaError

      if (!reservaData) {
        setErro('Reserva não encontrada')
        setCarregando(false)
        return
      }

      // 2. Buscar roteiro e verificar se pertence ao guia
      const { data: roteiroData, error: roteiroError } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id', reservaData.roteiro_id)
        .single()

      if (roteiroError) throw roteiroError

      if (roteiroData.id_guia !== guiaId) {
        setErro('Você não tem permissão para avaliar esta reserva')
        setCarregando(false)
        return
      }

      // 3. Buscar dados do cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from('users')
        .select('id, nome, email, celular')
        .eq('id', reservaData.cliente_id)
        .single()

      if (clienteError) {
        console.error('Erro ao buscar cliente:', clienteError)
      }

      // 4. Verificar se já foi avaliada
      if (reservaData.avaliacao_guia_nota && reservaData.avaliacao_guia_nota > 0) {
        setErro('Esta reserva já foi avaliada')
        setCarregando(false)
        return
      }

      setReserva(reservaData)
      setRoteiro(roteiroData)
      setCliente(clienteData || null)
      
    } catch (err: any) {
      console.error('Erro:', err)
      setErro(err?.message || 'Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nota === 0) {
      setErro('Selecione uma nota para o cliente')
      return
    }

    setEnviando(true)
    setErro(null)

    try {
      const { error: updateError } = await supabase
        .from('reservas')
        .update({ 
          avaliacao_guia_nota: nota,
          avaliacao_guia_comentario: comentario,
          avaliacao_guia_data: new Date().toISOString()
        })
        .eq('id', reservaId)

      if (updateError) throw updateError

      router.push('/guia/reservas')
      
    } catch (err: any) {
      console.error('Erro ao salvar avaliação:', err)
      setErro(err?.message || 'Erro ao salvar avaliação')
    } finally {
      setEnviando(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <p>Carregando...</p>
      </div>
    )
  }

  if (erro || !reserva) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
        <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PrussikTrails</h1>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>Sair</button>
          </div>
        </div>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <p style={{ fontSize: '18px', color: '#dc2626' }}>{erro || 'Reserva não encontrada'}</p>
            <button onClick={() => router.push('/guia/reservas')} style={{ marginTop: '20px', backgroundColor: '#16a34a', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Voltar para Reservas
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PrussikTrails</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => router.push('/guia/reservas')} style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>← Voltar</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>Sair</button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>⭐ Avaliar Cliente</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Sua avaliação ajuda outros guias e melhora a comunidade</p>
        </div>

        {/* Card da Reserva */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '12px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', overflow: 'hidden' }}>
              {roteiro?.foto_capa ? (
                <img src={roteiro.foto_capa} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                '🏔️'
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{roteiro?.titulo || 'Roteiro'}</h3>
              <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: '14px' }}>
                📅 {reserva.data_trilha ? new Date(reserva.data_trilha).toLocaleDateString('pt-BR') : '-'}
                {' • '}
                👥 {reserva.quantidade_pessoas} pessoa(s)
              </p>
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>Cliente: {cliente?.nome || 'Cliente'}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>📞 {cliente?.celular || 'Telefone não informado'}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold', fontSize: '20px', color: '#16a34a' }}>
                R$ {Number(reserva.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de Avaliação */}
        <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', fontSize: '16px' }}>Sua nota para o cliente</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNota(star)}
                  onMouseEnter={() => setNotaHover(star)}
                  onMouseLeave={() => setNotaHover(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '40px',
                    cursor: 'pointer',
                    color: (notaHover || nota) >= star ? '#fbbf24' : '#e5e7eb',
                    transition: 'transform 0.1s'
                  }}
                >
                  ★
                </button>
              ))}
              <span style={{ marginLeft: '12px', fontSize: '14px', color: '#6b7280' }}>
                {nota === 1 && 'Muito Ruim'}
                {nota === 2 && 'Ruim'}
                {nota === 3 && 'Regular'}
                {nota === 4 && 'Bom'}
                {nota === 5 && 'Excelente!'}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '16px' }}>Comentário (opcional)</label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={4}
              placeholder="Compartilhe sua experiência com este cliente..."
              style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', resize: 'vertical' }}
            />
          </div>

          {erro && (
            <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', textAlign: 'center' }}>
              ⚠️ {erro}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => router.push('/guia/reservas')}
              style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || nota === 0}
              style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '12px 28px', borderRadius: '8px', border: 'none', cursor: enviando || nota === 0 ? 'not-allowed' : 'pointer', fontWeight: '500', opacity: enviando || nota === 0 ? 0.6 : 1 }}
            >
              {enviando ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}