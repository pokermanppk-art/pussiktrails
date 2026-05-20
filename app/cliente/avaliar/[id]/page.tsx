'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AvaliarReserva() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [reserva, setReserva] = useState<any>(null)
  const [roteiro, setRoteiro] = useState<any>(null)
  const [guia, setGuia] = useState<any>(null)
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [fotoPrincipal, setFotoPrincipal] = useState('')
  const [galeriaFotos, setGaleriaFotos] = useState<string[]>([])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const user = JSON.parse(userData)
    setClienteId(user.id)

    const carregarDados = async () => {
      try {
        // 1. Buscar reserva
        const { data: reservaData, error: reservaError } = await supabase
          .from('reservas')
          .select('*')
          .eq('id', id)
          .single()

        if (reservaError) {
          console.error('Erro ao buscar reserva:', reservaError)
          setMensagem('Erro ao carregar dados da reserva')
          setCarregando(false)
          return
        }
        if (!reservaData) {
          setMensagem('Reserva não encontrada.')
          setCarregando(false)
          return
        }
        setReserva(reservaData)

        // 2. Buscar roteiro
        if (reservaData.roteiro_id) {
          const { data: roteiroData, error: roteiroError } = await supabase
            .from('roteiros')
            .select('*')
            .eq('id', reservaData.roteiro_id)
            .single()

          if (roteiroError) {
            console.error('Erro ao buscar roteiro:', roteiroError)
          } else {
            setRoteiro(roteiroData)
            if (roteiroData.foto_capa) setFotoPrincipal(roteiroData.foto_capa)
            if (roteiroData.galeria_fotos && Array.isArray(roteiroData.galeria_fotos)) {
              setGaleriaFotos(roteiroData.galeria_fotos.slice(0, 3))
            }
          }

          // 3. Buscar guia
          if (roteiroData && roteiroData.id_guia) {
            const { data: guiaData } = await supabase
              .from('users')
              .select('id, nome, avatar_url')
              .eq('id', roteiroData.id_guia)
              .single()
            setGuia(guiaData)
          }
        }

        setCarregando(false)
      } catch (err) {
        console.error('Erro inesperado:', err)
        setMensagem('Ocorreu um erro inesperado.')
        setCarregando(false)
      }
    }

    if (id) carregarDados()
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação: nota é obrigatória
    if (nota === 0) {
      setMensagem('Selecione uma nota de 1 a 5 montanhas')
      return
    }

    // VALIDAÇÃO: Se nota for 1 ou 2, comentário é OBRIGATÓRIO
    if (nota <= 2 && (!comentario || comentario.trim() === '')) {
      setMensagem('⚠️ Para notas baixas (1 ou 2), é obrigatório explicar o motivo no campo de comentário.')
      return
    }

    setEnviando(true)
    setMensagem('')

    // Determina status de moderação: nota >= 3 aprovada, nota <= 2 pendente
    const statusModeracao = nota >= 3 ? 'aprovada' : 'pendente'

    // 1. Inserir avaliação
    const { error: insertError } = await supabase
      .from('avaliacoes')
      .insert({
        reserva_id: id,
        cliente_id: clienteId,
        guia_id: guia?.id,
        nota: nota,
        comentario: comentario,
        resposta_guia: null,
        status_moderacao: statusModeracao
      })

    if (insertError) {
      console.error('Erro ao salvar avaliação:', insertError)
      setMensagem(`❌ Erro ao salvar avaliação: ${insertError.message}`)
      setEnviando(false)
      return
    }

    // 2. Atualizar reserva: cliente_confirmou = true
    await supabase
      .from('reservas')
      .update({ cliente_confirmou: true })
      .eq('id', id)

    // 3. Verificar se guia já confirmou
    const { data: reservaAtualizada } = await supabase
      .from('reservas')
      .select('guia_confirmou')
      .eq('id', id)
      .single()

    if (reservaAtualizada?.guia_confirmou) {
      await supabase
        .from('reservas')
        .update({ status: 'realizada' })
        .eq('id', id)
    }

    // 4. Se avaliação aprovada automaticamente, recalcular média do guia
    if (statusModeracao === 'aprovada') {
      const { data: avaliacoes } = await supabase
        .from('avaliacoes')
        .select('nota')
        .eq('guia_id', guia?.id)

      if (avaliacoes && avaliacoes.length > 0) {
        const soma = avaliacoes.reduce((acc, curr) => acc + curr.nota, 0)
        const media = soma / avaliacoes.length
        await supabase
          .from('users')
          .update({ avaliacao_media: media, total_avaliacoes: avaliacoes.length })
          .eq('id', guia?.id)
      }
      setMensagem('✅ Avaliação enviada com sucesso! Obrigado.')
    } else {
      setMensagem('✅ Avaliação registrada. O guia será notificado para responder.')
    }

    setTimeout(() => router.push('/cliente/minhas-reservas'), 2000)
    setEnviando(false)
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Carregando dados da avaliação...</p>
      </div>
    )
  }

  if (!reserva || !roteiro) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ color: '#dc2626' }}>{mensagem || 'Não foi possível carregar os dados da reserva.'}</p>
        <button onClick={() => router.back()} style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
          Voltar
        </button>
      </div>
    )
  }

  const dataTrilha = reserva.data_trilha ? new Date(reserva.data_trilha).toLocaleDateString('pt-BR') : 'Data não informada'
  const horaTrilha = reserva.data_trilha ? new Date(reserva.data_trilha).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* CABEÇALHO */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>🏔️ PrussikTrails</h1>
          <button
            onClick={() => router.back()}
            style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            ← Voltar
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          
          {/* TOPO: GUIA NO CANTO SUPERIOR DIREITO */}
          {guia && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 24px 0 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f9fafb', padding: '12px 20px', borderRadius: '40px' }}>
                {guia.avatar_url ? (
                  <img src={guia.avatar_url} alt={guia.nome} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                    {guia.nome?.charAt(0).toUpperCase() || 'G'}
                  </div>
                )}
                <div>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Guia</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{guia.nome}</p>
                </div>
              </div>
            </div>
          )}

          {/* CARD BRANCO */}
          <div style={{ margin: '24px 24px 0 24px', backgroundColor: '#f9fafb', borderRadius: '20px', padding: '20px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
            <p style={{ color: '#6b7280', margin: 0 }}>✨ Sua opinião é muito importante para nós ✨</p>
          </div>

          {/* ÁREA DE FOTOS */}
          <div style={{ padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: '250px' }}>
              {fotoPrincipal ? (
                <img src={fotoPrincipal} alt={roteiro.titulo} style={{ width: '100%', borderRadius: '20px', objectFit: 'cover', aspectRatio: '4/3' }} />
              ) : (
                <div style={{ width: '100%', aspectRatio: '4/3', backgroundColor: '#e5e7eb', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  🏔️ Sem imagem
                </div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '150px' }}>
              {galeriaFotos.length > 0 ? (
                galeriaFotos.map((foto, idx) => (
                  <div key={idx} style={{ backgroundColor: '#f1f5f9', borderRadius: '16px', overflow: 'hidden', aspectRatio: '1/1' }}>
                    <img src={foto} alt={`Galeria ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))
              ) : (
                Array(3).fill(0).map((_, idx) => (
                  <div key={idx} style={{ backgroundColor: '#f1f5f9', borderRadius: '16px', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                    📸
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DESCRIÇÃO DO ROTEIRO */}
          <div style={{ padding: '0 24px 16px 24px' }}>
            <p style={{ fontSize: '16px', color: '#4b5563', lineHeight: '1.5', textAlign: 'center' }}>
              {roteiro.descricao || 'Descrição não disponível.'}
            </p>
          </div>

          {/* DATA E HORA */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ backgroundColor: '#f3f4f6', padding: '6px 16px', borderRadius: '40px', fontSize: '14px', color: '#1f2937' }}>
              📅 {dataTrilha} {horaTrilha ? `⏰ ${horaTrilha}` : ''}
            </span>
          </div>

          {/* FORMULÁRIO DE AVALIAÇÃO */}
          <form onSubmit={handleSubmit} style={{ padding: '24px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '500', marginBottom: '16px', color: '#1f2937' }}>
                Como foi sua experiência?
              </label>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNota(star)}
                    style={{
                      fontSize: '40px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'transform 0.1s',
                      filter: nota >= star ? 'none' : 'grayscale(0.7)',
                      opacity: nota >= star ? 1 : 0.5,
                      transform: nota === star ? 'scale(1.1)' : 'scale(1)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    🏔️
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '14px', marginTop: '12px', color: '#6b7280' }}>
                {nota === 1 && '🌱 Muito a melhorar'}
                {nota === 2 && '👍 Razoável'}
                {nota === 3 && '😊 Bom'}
                {nota === 4 && '🌟 Muito bom!'}
                {nota === 5 && '🏆 Excelente! Aventura inesquecível!'}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#1f2937' }}>
                Comentário {nota <= 2 && <span style={{ color: '#dc2626' }}>* (obrigatório para notas baixas)</span>}
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={4}
                placeholder="Compartilhe sua experiência, elogios ou sugestões..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${nota <= 2 && comentario.trim() === '' ? '#dc2626' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              {nota <= 2 && comentario.trim() === '' && (
                <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                  ⚠️ Por favor, explique o motivo da avaliação baixa
                </p>
              )}
            </div>

            {mensagem && (
              <div style={{
                marginBottom: '24px',
                padding: '12px',
                borderRadius: '12px',
                textAlign: 'center',
                backgroundColor: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2',
                color: mensagem.includes('✅') ? '#16a34a' : '#dc2626'
              }}>
                {mensagem}
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              style={{
                width: '100%',
                backgroundColor: '#16a34a',
                color: 'white',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                opacity: enviando ? 0.7 : 1
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
            >
              {enviando ? 'Enviando avaliação...' : 'Enviar avaliação'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}