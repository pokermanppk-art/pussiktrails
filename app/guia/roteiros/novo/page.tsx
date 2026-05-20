'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { registrarAtividade } from '@/lib/logAtividade'
import { v4 as uuidv4 } from 'uuid'

export default function NovoRoteiro() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [fotos, setFotos] = useState<File[]>([])
  const [fotosPreview, setFotosPreview] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + fotos.length > 3) {
      setErro('Máximo de 3 fotos por roteiro')
      return
    }
    setFotos([...fotos, ...files])
    const previews = files.map(file => URL.createObjectURL(file))
    setFotosPreview([...fotosPreview, ...previews])
  }

  const removerFoto = (index: number) => {
    const novasFotos = fotos.filter((_, i) => i !== index)
    const novasPreviews = fotosPreview.filter((_, i) => i !== index)
    setFotos(novasFotos)
    setFotosPreview(novasPreviews)
  }

  const uploadFotos = async (guiaId: string): Promise<string[]> => {
    const urls: string[] = []
    for (const foto of fotos) {
      const fileExt = foto.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `roteiros/${guiaId}/${fileName}`
      const { error } = await supabase.storage
        .from('uploads')
        .upload(filePath, foto)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)
      urls.push(publicUrl)
    }
    return urls
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const formData = new FormData(e.currentTarget)
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const user = JSON.parse(userData)

    let galeriaUrls: string[] = []
    if (fotos.length > 0) {
      setUploading(true)
      try {
        galeriaUrls = await uploadFotos(user.id)
      } catch (err: any) {
        setErro(`Erro no upload: ${err.message}`)
        setUploading(false)
        setLoading(false)
        return
      }
      setUploading(false)
    }

    const embarqueData = formData.get('embarque_data') as string
    const retornoData = formData.get('retorno_data') as string
    const titulo = formData.get('titulo') as string

    const dados = {
      id_guia: user.id,
      titulo: titulo,
      descricao: formData.get('descricao'),
      preco: parseFloat(formData.get('preco') as string),
      duracao_horas: parseInt(formData.get('duracao_horas') as string),
      km: parseFloat(formData.get('km') as string),
      dificuldade: formData.get('dificuldade'),
      localizacao: formData.get('localizacao'),
      foto_capa: formData.get('foto_capa') || galeriaUrls[0] || null,
      galeria_fotos: galeriaUrls,
      status: 'aguardando',
      embarque_local: formData.get('embarque_local'),
      embarque_data: embarqueData ? new Date(embarqueData).toISOString() : null,
      retorno_local: formData.get('retorno_local'),
      retorno_data: retornoData ? new Date(retornoData).toISOString() : null
    }

    const { data: novoRoteiro, error } = await supabase
      .from('roteiros')
      .insert([dados])
      .select()

    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }

    const primeiroNome = user.nome?.split(' ')[0] || user.email?.split('@')[0] || 'Guia'
    const roteiroId = novoRoteiro?.[0]?.id
    
    if (roteiroId) {
      await registrarAtividade(
        user.id,
        'guia',
        primeiroNome,
        'criou_roteiro',
        `${primeiroNome} criou o roteiro "${titulo}"`,
        roteiroId
      )
    } else {
      await registrarAtividade(
        user.id,
        'guia',
        primeiroNome,
        'criou_roteiro',
        `${primeiroNome} criou o roteiro "${titulo}"`
      )
    }

    router.push('/guia/dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* CABEÇALHO SECUNDÁRIO - VERMELHO (PADRÃO PREMIUM) */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>🏔️ PrussikTrails</h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>Criar novo roteiro</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => router.push('/guia/dashboard')}
              style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', color: '#374151', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              ← Voltar
            </button>
            <button
              onClick={() => router.push('/guia/perfil')}
              style={{ backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'background-color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#374151'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#111827'}
            >
              Perfil
            </button>
            <button
              onClick={handleLogout}
              style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '40px', padding: '8px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'background-color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Cabeçalho da página */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: 0 }}>➕ Criar Novo Roteiro</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Preencha os dados da sua aventura</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '40px' }}>
              <span style={{ padding: '6px 20px', fontSize: '13px', color: '#6b7280' }}>Status: Aguardando aprovação</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {/* Coluna 1 e 2 - Informações principais */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏔️</span> Informações do Roteiro
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Título do Roteiro *</label>
                    <input 
                      name="titulo" 
                      type="text" 
                      required 
                      placeholder="Ex: Trilha do Pico da Neblina"
                      style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', transition: 'border 0.2s' }}
                      onFocus={(e) => e.target.style.borderColor = '#dc2626'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Descrição *</label>
                    <textarea 
                      name="descricao" 
                      rows={5} 
                      required 
                      placeholder="Descreva a aventura, pontos turísticos, dificuldades, equipamentos necessários..."
                      style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Preço (R$) *</label>
                      <input name="preco" type="number" step="0.01" required placeholder="0,00" style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Duração (horas) *</label>
                      <input name="duracao_horas" type="number" required placeholder="8" style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Distância (km) *</label>
                      <input name="km" type="number" step="0.1" required placeholder="12.5" style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Dificuldade *</label>
                      <select name="dificuldade" required style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: 'white' }}>
                        <option value="fácil">🥾 Fácil</option>
                        <option value="médio">⛰️ Médio</option>
                        <option value="difícil">🏔️ Difícil</option>
                        <option value="extremo">⚠️ Extremo</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Localização *</label>
                      <input name="localizacao" type="text" required placeholder="Cidade - Estado" style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ponto de Encontro e Retorno */}
              <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🚐</span> Logística da Trilha
                </h3>
                
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>Ponto de Encontro</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#6b7280' }}>Local de Embarque *</label>
                      <input name="embarque_local" type="text" required placeholder="Endereço completo" style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#6b7280' }}>Data e Hora *</label>
                      <input name="embarque_data" type="datetime-local" required style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>Ponto de Retorno</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#6b7280' }}>Local de Retorno *</label>
                      <input name="retorno_local" type="text" required placeholder="Endereço completo" style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#6b7280' }}>Data e Hora *</label>
                      <input name="retorno_data" type="datetime-local" required style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna 3 - Fotos e Ações */}
            <div style={{ gridColumn: 'span 1' }}>
              {/* Fotos */}
              <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '24px', position: 'sticky', top: '100px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📸</span> Mídia do Roteiro
                </h3>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Foto de Capa (URL)</label>
                  <input 
                    name="foto_capa" 
                    type="text" 
                    placeholder="https://exemplo.com/imagem.jpg" 
                    style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px' }} 
                  />
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>URL de uma imagem para capa do roteiro</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Galeria de Fotos (até 3)</label>
                  
                  {fotosPreview.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      {fotosPreview.map((preview, index) => (
                        <div key={index} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #e5e7eb' }}>
                          <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            type="button" 
                            onClick={() => removerFoto(index)} 
                            style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: '#dc2626', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', border: '2px dashed #e5e7eb', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#f9fafb', transition: 'all 0.2s' }}>
                    <span style={{ fontSize: '32px', marginBottom: '8px' }}>📤</span>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Clique para selecionar fotos</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>JPG, PNG, GIF (até 3)</span>
                    <input type="file" accept="image/*" multiple onChange={handleFotoChange} style={{ display: 'none' }} />
                  </label>
                </div>

                {erro && (
                  <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '13px', textAlign: 'center' }}>
                    ⚠️ {erro}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
                  <button 
                    type="submit" 
                    disabled={loading || uploading} 
                    style={{ 
                      flex: 1,
                      backgroundColor: '#dc2626', 
                      color: 'white', 
                      padding: '14px 24px', 
                      borderRadius: '40px', 
                      border: 'none', 
                      cursor: loading || uploading ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'background-color 0.2s',
                      opacity: loading || uploading ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => { if (!loading && !uploading) e.currentTarget.style.backgroundColor = '#b91c1c' }}
                    onMouseLeave={(e) => { if (!loading && !uploading) e.currentTarget.style.backgroundColor = '#dc2626' }}
                  >
                    {loading || uploading ? 'Salvando...' : '📌 Criar Roteiro'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => router.push('/guia/dashboard')} 
                    style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '14px 24px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '14px', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}