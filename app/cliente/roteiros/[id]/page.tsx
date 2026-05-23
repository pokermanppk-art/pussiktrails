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

  const [mostrarPix, setMostrarPix] = useState(false)

  const [pixCode, setPixCode] = useState('')
  const [pixQrCode, setPixQrCode] = useState('')

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

      setRoteiro(roteiroData)

      const fotosArray: string[] = roteiroData.galeria_fotos || []

      const fotosValidas = fotosArray.filter(
        (foto: string) => foto && foto.trim() !== ''
      )

      let listaFotos: string[] = []

      if (roteiroData.foto_capa) {
        listaFotos.push(roteiroData.foto_capa)
      }

      listaFotos = [
        ...listaFotos,
        ...fotosValidas.filter(
          (f: string) => f !== roteiroData.foto_capa
        )
      ]

      setTodasFotos(listaFotos)

      if (roteiroData.id_guia) {

        const { data: guiaData } = await supabase
          .from('users')
          .select('*')
          .eq('id', roteiroData.id_guia)
          .single()

        setGuia(guiaData)
      }

    } catch (err) {

      console.error(err)

    } finally {

      setCarregando(false)
    }
  }

  const handleReservar = async () => {

    if (!usuarioLogado) {

      router.push('/login')
      return
    }

    setReservando(true)

    try {

      const valorTotal =
        (roteiro?.preco || 0) * quantidadePessoas

      // 1️⃣ CRIAR RESERVA

      const { data: reserva, error: reservaError } =
        await supabase
          .from('reservas')
          .insert({
            cliente_id: usuarioLogado.id,
            roteiro_id: roteiro?.id,
            quantidade_pessoas: quantidadePessoas,
            valor_total: valorTotal,
            status: 'aguardando_pagamento',
            status_pagamento: 'pendente'
          })
          .select()
          .single()

      if (reservaError) throw reservaError

      // 2️⃣ GERAR PIX

      const response = await fetch('/api/paghiper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: valorTotal,
          email: usuarioLogado.email,
          description: roteiro?.titulo,
          reservationId: reserva.id
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error)
      }

      // 3️⃣ SALVAR PIX

      await supabase
        .from('reservas')
        .update({
          transaction_id: data.transaction_id,
          pix_code: data.qr_code_text,
          pix_qrcode: data.qr_code_base64
        })
        .eq('id', reserva.id)

      setPixCode(data.qr_code_text)
      setPixQrCode(data.qr_code_base64)

      setMostrarPix(true)

      // LOG

      const primeiroNome =
        usuarioLogado.nome?.split(' ')[0] ||
        usuarioLogado.email?.split('@')[0] ||
        'Cliente'

      await registrarAtividade(
        usuarioLogado.id,
        'cliente',
        primeiroNome,
        'reservou',
        `${primeiroNome} iniciou pagamento PIX do roteiro "${roteiro?.titulo}"`,
        roteiro?.id
      )

    } catch (err: any) {

      setMensagem(
        `❌ ${err.message || 'Erro ao gerar PIX'}`
      )

    } finally {

      setReservando(false)
    }
  }

  if (carregando) {

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        Carregando...
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        padding: '20px'
      }}
    >

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}
      >

        <h1
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: '10px'
          }}
        >
          {roteiro?.titulo}
        </h1>

        <p
          style={{
            color: '#6b7280',
            marginBottom: '20px'
          }}
        >
          {roteiro?.descricao}
        </p>

        {/* RESERVA */}

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            padding: '24px',
            maxWidth: '420px'
          }}
        >

          <div
            style={{
              fontSize: '34px',
              fontWeight: 'bold',
              color: '#dc2626',
              marginBottom: '20px'
            }}
          >
            R$ {roteiro?.preco}
          </div>

          <div
            style={{
              marginBottom: '20px'
            }}
          >

            <label>
              Pessoas
            </label>

            <input
              type="number"
              min={1}
              value={quantidadePessoas}
              onChange={(e) =>
                setQuantidadePessoas(
                  Number(e.target.value)
                )
              }
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #d1d5db'
              }}
            />

          </div>

          <button
            onClick={handleReservar}
            disabled={reservando}
            style={{
              width: '100%',
              backgroundColor: '#dc2626',
              color: 'white',
              padding: '16px',
              borderRadius: '999px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {reservando
              ? 'Gerando PIX...'
              : '💳 Reservar via PIX'}
          </button>

          {mensagem && (

            <div
              style={{
                marginTop: '16px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '12px',
                borderRadius: '12px'
              }}
            >
              {mensagem}
            </div>

          )}

        </div>

      </div>

      {/* MODAL PIX */}

      {mostrarPix && (

        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
        >

          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '32px',
              width: '95%',
              maxWidth: '420px',
              textAlign: 'center'
            }}
          >

            <h2
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '20px'
              }}
            >
              ✅ Pagamento PIX
            </h2>

            <img
              src={`data:image/png;base64,${pixQrCode}`}
              alt="PIX"
              style={{
                width: '240px',
                margin: '0 auto 20px'
              }}
            />

            <textarea
              value={pixCode}
              readOnly
              style={{
                width: '100%',
                height: '120px',
                borderRadius: '12px',
                padding: '12px',
                border: '1px solid #d1d5db',
                fontSize: '12px'
              }}
            />

            <button
              onClick={() => {
                navigator.clipboard.writeText(pixCode)
                alert('PIX copiado!')
              }}
              style={{
                width: '100%',
                marginTop: '16px',
                backgroundColor: '#16a34a',
                color: 'white',
                padding: '14px',
                borderRadius: '999px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              📋 Copiar PIX
            </button>

            <button
              onClick={() => {
                setMostrarPix(false)
                router.push('/cliente/minhas-reservas')
              }}
              style={{
                width: '100%',
                marginTop: '10px',
                backgroundColor: '#111827',
                color: 'white',
                padding: '14px',
                borderRadius: '999px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Fechar
            </button>

          </div>

        </div>

      )}

    </div>
  )
}