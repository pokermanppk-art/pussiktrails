'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { registrarAtividade } from '@/lib/logAtividade'

export default function NovoRoteiro() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState('')

  // Campos do formulário
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    preco: '',
    duracao_horas: '',
    km: '',
    dificuldade: 'fácil',
    localizacao: '',
    embarque_local: '',
    embarque_data_hora: '',
    retorno_local: '',
    retorno_data_hora: '',
    roteiro_detalhado: '',
    foto_capa: '',
    galeria_fotos: '',
    // NOVOS CAMPOS
    limite_pessoas: '', // vazio = sem limite
    recorrencia: 'unica', // unica, semanal, mensal, anual
    renovar_automaticamente: false,
    proxima_data: ''
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const parsed = JSON.parse(userData)
    if (parsed.tipo !== 'guia') {
      router.push('/login')
      return
    }
    setUser(parsed)
  }, [])

  const setCampo = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const salvar = async () => {
    if (!user) return

    // Validações básicas
    if (!form.titulo || !form.descricao || !form.preco) {
      setMensagem('Preencha título, descrição e preço.')
      return
    }

    if (form.recorrencia !== 'unica' && !form.proxima_data) {
      setMensagem('Para roteiros recorrentes, informe a próxima data.')
      return
    }

    setLoading(true)
    setMensagem('')

    try {
      // Processar galeria de fotos
      const galeria = String(form.galeria_fotos || '')
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean)

      // Processar limite de pessoas (vazio = null = sem limite)
      let limite = null
      if (form.limite_pessoas && String(form.limite_pessoas).trim() !== '') {
        limite = parseInt(form.limite_pessoas)
        if (isNaN(limite) || limite < 1) limite = 1
        if (limite > 100) limite = 100
      }

      // Data inicial (usada como próxima data)
      const dataInicial = form.embarque_data_hora
        ? new Date(form.embarque_data_hora)
        : null

      const payload = {
        id_guia: user.id,
        titulo: form.titulo,
        descricao: form.descricao,
        preco: Number(form.preco),
        duracao_horas: Number(form.duracao_horas || 0),
        km: Number(form.km || 0),
        dificuldade: form.dificuldade,
        localizacao: form.localizacao,
        embarque_local: form.embarque_local,
        embarque_data_hora: form.embarque_data_hora || null,
        retorno_local: form.retorno_local,
        retorno_data_hora: form.retorno_data_hora || null,
        roteiro_detalhado: form.roteiro_detalhado,
        foto_capa: form.foto_capa || null,
        galeria_fotos: galeria,
        status: 'aguardando_aprovacao',
        // NOVOS CAMPOS
        limite_pessoas: limite,
        recorrencia: form.recorrencia,
        renovar_automaticamente: form.renovar_automaticamente,
        proxima_data: form.proxima_data || (dataInicial ? dataInicial.toISOString().split('T')[0] : null),
        ativo: true
      }

      const { data, error } = await supabase
        .from('roteiros')
        .insert(payload)
        .select('id')
        .single()

      if (error) throw error

      // Registrar atividade
      const primeiroNome = user.nome?.split(' ')[0] || 'Guia'
      await registrarAtividade(
        user.id,
        'guia',
        primeiroNome,
        'criou_roteiro',
        `${primeiroNome} criou o roteiro "${form.titulo}"`,
        data.id
      )

      setMensagem(
        form.recorrencia === 'unica'
          ? '✅ Roteiro enviado para aprovação!'
          : `✅ Roteiro recorrente (${form.recorrencia}) enviado para aprovação!`
      )

      setTimeout(() => router.push('/guia/dashboard'), 1500)
    } catch (err: any) {
      console.error('Erro ao salvar roteiro:', err)
      setMensagem(`❌ ${err.message || 'Erro ao salvar.'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Carregando...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <style jsx global>{`
        .novo-roteiro-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px 16px;
        }
        .form-card {
          background: white;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-label {
          display: block;
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 6px;
          color: #374151;
        }
        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          font-size: 14px;
        }
        .form-textarea {
          resize: vertical;
        }
        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .btn-primary {
          width: 100%;
          background: #16a34a;
          color: white;
          border: none;
          border-radius: 40px;
          padding: 14px;
          font-weight: 800;
          cursor: pointer;
          margin-top: 16px;
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border: none;
          border-radius: 40px;
          padding: 12px 20px;
          cursor: pointer;
          font-weight: 600;
        }
        .mensagem-sucesso {
          background: #dcfce7;
          color: #166534;
          padding: 12px;
          border-radius: 14px;
          margin-bottom: 16px;
        }
        .mensagem-erro {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px;
          border-radius: 14px;
          margin-bottom: 16px;
        }
        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
        .info-text {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }
        hr {
          margin: 20px 0;
          border: none;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>

      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '14px 16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#dc2626', fontSize: '22px', fontWeight: 'bold' }}>🏔️ Criar Novo Roteiro</h1>
          <button onClick={() => router.push('/guia/dashboard')} className="btn-secondary">← Dashboard</button>
        </div>
      </div>

      <div className="novo-roteiro-container">
        <div className="form-card">
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            O roteiro ficará público apenas após aprovação do ADM.
          </p>

          {mensagem && (
            <div className={mensagem.includes('✅') ? 'mensagem-sucesso' : 'mensagem-erro'}>
              {mensagem}
            </div>
          )}

          {/* INFORMAÇÕES BÁSICAS */}
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input
              className="form-input"
              value={form.titulo}
              onChange={(e) => setCampo('titulo', e.target.value)}
              placeholder="Ex: Trilha da Pedra do Lagarto"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descrição *</label>
          </div>
          <div className="form-group">
            <textarea
              className="form-textarea"
              rows={4}
              value={form.descricao}
              onChange={(e) => setCampo('descricao', e.target.value)}
              placeholder="Descreva a experiência, pontos turísticos, dificuldades..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Preço (R$) *</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={form.preco}
                onChange={(e) => setCampo('preco', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duração (horas)</label>
              <input
                className="form-input"
                type="number"
                step="0.5"
                value={form.duracao_horas}
                onChange={(e) => setCampo('duracao_horas', e.target.value)}
                placeholder="4"
              />
            </div>
            <div className="form-group">
              <label className="form-label">KM</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                value={form.km}
                onChange={(e) => setCampo('km', e.target.value)}
                placeholder="8.5"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Dificuldade</label>
              <select
                className="form-select"
                value={form.dificuldade}
                onChange={(e) => setCampo('dificuldade', e.target.value)}
              >
                <option value="fácil">🥾 Fácil</option>
                <option value="médio">⛰️ Médio</option>
                <option value="difícil">🏔️ Difícil</option>
                <option value="extremo">⚠️ Extremo</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Localização</label>
              <input
                className="form-input"
                value={form.localizacao}
                onChange={(e) => setCampo('localizacao', e.target.value)}
                placeholder="Cidade/Estado"
              />
            </div>
          </div>

          <hr />

          {/* LOGÍSTICA */}
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>📍 Ponto de Encontro</h3>
          <div className="form-group">
            <label className="form-label">Local de Embarque</label>
            <input
              className="form-input"
              value={form.embarque_local}
              onChange={(e) => setCampo('embarque_local', e.target.value)}
              placeholder="Endereço completo do ponto de encontro"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data e Hora do Embarque</label>
            <input
              className="form-input"
              type="datetime-local"
              value={form.embarque_data_hora}
              onChange={(e) => setCampo('embarque_data_hora', e.target.value)}
            />
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', marginTop: '24px' }}>🏁 Ponto de Retorno</h3>
          <div className="form-group">
            <label className="form-label">Local de Retorno</label>
            <input
              className="form-input"
              value={form.retorno_local}
              onChange={(e) => setCampo('retorno_local', e.target.value)}
              placeholder="Endereço do ponto de retorno"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data e Hora do Retorno</label>
            <input
              className="form-input"
              type="datetime-local"
              value={form.retorno_data_hora}
              onChange={(e) => setCampo('retorno_data_hora', e.target.value)}
            />
          </div>

          <hr />

          {/* NOVOS CAMPOS – LIMITE E RECORRÊNCIA */}
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>👥 Limite de Pessoas</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Limite máximo de participantes</label>
              <select
                className="form-select"
                value={form.limite_pessoas || ''}
                onChange={(e) => setCampo('limite_pessoas', e.target.value)}
              >
                <option value="">📌 Sem limite</option>
                <option value="1">1 pessoa</option>
                <option value="2">2 pessoas</option>
                <option value="3">3 pessoas</option>
                <option value="4">4 pessoas</option>
                <option value="5">5 pessoas</option>
                <option value="6">6 pessoas</option>
                <option value="7">7 pessoas</option>
                <option value="8">8 pessoas</option>
                <option value="9">9 pessoas</option>
                <option value="10">10 pessoas</option>
                <option value="15">15 pessoas</option>
                <option value="20">20 pessoas</option>
                <option value="30">30 pessoas</option>
                <option value="50">50 pessoas</option>
                <option value="100">100 pessoas</option>
              </select>
              <p className="info-text">Selecione "Sem limite" para não restringir vagas.</p>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', marginTop: '8px' }}>🔄 Recorrência do Roteiro</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo de recorrência</label>
              <select
                className="form-select"
                value={form.recorrencia}
                onChange={(e) => setCampo('recorrencia', e.target.value)}
              >
                <option value="unica">🎯 Uma única vez</option>
                <option value="semanal">📅 Semanal – toda semana na mesma data</option>
                <option value="mensal">🗓️ Mensal – todo mês no mesmo dia</option>
                <option value="anual">📆 Anual – todo ano na mesma data</option>
              </select>
            </div>
          </div>

          {(form.recorrencia === 'semanal' || form.recorrencia === 'mensal' || form.recorrencia === 'anual') && (
            <>
              <div className="form-group">
                <label className="form-label">Próxima data disponível</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.proxima_data}
                  onChange={(e) => setCampo('proxima_data', e.target.value)}
                />
                <p className="info-text">
                  {form.recorrencia === 'semanal' && 'Esta data será usada como referência semanal.'}
                  {form.recorrencia === 'mensal' && 'Esta data será usada como referência mensal (ex: dia 15 de cada mês).'}
                  {form.recorrencia === 'anual' && 'Esta data será usada como referência anual (ex: 25 de dezembro).'}
                </p>
              </div>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="renovar_automaticamente"
                  checked={form.renovar_automaticamente}
                  onChange={(e) => setCampo('renovar_automaticamente', e.target.checked)}
                />
                <label htmlFor="renovar_automaticamente" style={{ fontWeight: 'normal' }}>
                  ✅ Renovar automaticamente após cada ocorrência
                </label>
              </div>
              <p className="info-text" style={{ marginLeft: '22px' }}>
                Se marcado, após a data passar, o sistema calculará a próxima ocorrência automaticamente.
              </p>
            </>
          )}

          <hr />

          {/* FOTOS */}
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>📸 Fotos do Roteiro</h3>
          <div className="form-group">
            <label className="form-label">URL da foto de capa</label>
            <input
              className="form-input"
              value={form.foto_capa}
              onChange={(e) => setCampo('foto_capa', e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Galeria de fotos (uma URL por linha)</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.galeria_fotos}
              onChange={(e) => setCampo('galeria_fotos', e.target.value)}
              placeholder="https://exemplo.com/foto1.jpg&#10;https://exemplo.com/foto2.jpg"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Roteiro detalhado (opcional)</label>
            <textarea
              className="form-textarea"
              rows={6}
              value={form.roteiro_detalhado}
              onChange={(e) => setCampo('roteiro_detalhado', e.target.value)}
              placeholder="Descreva o roteiro passo a passo, paradas, pontos de interesse..."
            />
          </div>

          <button
            onClick={salvar}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Salvando...' : '📤 Enviar para aprovação'}
          </button>
        </div>
      </div>
    </div>
  )
}