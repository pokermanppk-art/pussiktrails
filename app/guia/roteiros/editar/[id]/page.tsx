'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

export default function EditarRoteiro() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [statusAtual, setStatusAtual] = useState('')
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    preco: '',
    duracao_horas: '',
    km: '',
    dificuldade: 'médio',
    localizacao: '',
    foto_capa: ''
  })
  const [fotosExistentes, setFotosExistentes] = useState<string[]>([])
  const [novasFotos, setNovasFotos] = useState<File[]>([])
  const [novasFotosPreview, setNovasFotosPreview] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const fetchRoteiro = async () => {
      const { data, error } = await supabase
        .from('roteiros')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setErro('Roteiro não encontrado')
        setCarregando(false)
        return
      }

      // Verificar se o roteiro está aprovado
      if (data.status === 'aprovado') {
        setErro('Este roteiro já foi aprovado e não pode mais ser editado por guias. Entre em contato com o administrador.')
        setCarregando(false)
        return
      }

      setStatusAtual(data.status)
      setFormData({
        titulo: data.titulo || '',
        descricao: data.descricao || '',
        preco: data.preco || '',
        duracao_horas: data.duracao_horas || '',
        km: data.km || '',
        dificuldade: data.dificuldade || 'médio',
        localizacao: data.localizacao || '',
        foto_capa: data.foto_capa || ''
      })
      setFotosExistentes(data.galeria_fotos || [])
      setCarregando(false)
    }

    fetchRoteiro()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleNovasFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + novasFotos.length + fotosExistentes.length > 3) {
      setErro('Máximo de 3 fotos por roteiro')
      return
    }
    setNovasFotos([...novasFotos, ...files])
    const previews = files.map(file => URL.createObjectURL(file))
    setNovasFotosPreview([...novasFotosPreview, ...previews])
  }

  const removerFotoExistente = (index: number) => {
    const novas = fotosExistentes.filter((_, i) => i !== index)
    setFotosExistentes(novas)
  }

  const removerNovaFoto = (index: number) => {
    const novas = novasFotos.filter((_, i) => i !== index)
    const novasPreviews = novasFotosPreview.filter((_, i) => i !== index)
    setNovasFotos(novas)
    setNovasFotosPreview(novasPreviews)
  }

  const uploadNovasFotos = async (guiaId: string): Promise<string[]> => {
    const urls: string[] = []
    for (const foto of novasFotos) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }
    const user = JSON.parse(userData)

    let novasUrls: string[] = []
    if (novasFotos.length > 0) {
      setUploading(true)
      try {
        novasUrls = await uploadNovasFotos(user.id)
      } catch (err: any) {
        setErro(`Erro no upload: ${err.message}`)
        setUploading(false)
        setLoading(false)
        return
      }
      setUploading(false)
    }

    const todasFotos = [...fotosExistentes, ...novasUrls]
    const galeriaFotos = todasFotos.slice(0, 3)

    const dados = {
      titulo: formData.titulo,
      descricao: formData.descricao,
      preco: parseFloat(formData.preco),
      duracao_horas: parseInt(formData.duracao_horas),
      km: parseFloat(formData.km),
      dificuldade: formData.dificuldade,
      localizacao: formData.localizacao,
      foto_capa: formData.foto_capa || galeriaFotos[0] || null,
      galeria_fotos: galeriaFotos,
      status: 'aguardando', // volta para aguardando após edição
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('roteiros')
      .update(dados)
      .eq('id', id)

    if (error) {
      setErro(error.message)
    } else {
      router.push('/guia/dashboard')
    }
    setLoading(false)
  }

  const handleExcluir = async () => {
    if (!confirm('Tem certeza que deseja excluir este roteiro? Esta ação não pode ser desfeita.')) return
    const { error } = await supabase.from('roteiros').delete().eq('id', id)
    if (!error) router.push('/guia/dashboard')
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>🏔️ PussikTrails</h1>
          <button onClick={() => router.push('/guia/dashboard')} style={{ backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            ← Dashboard
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>✏️ Editar Roteiro</h2>
          {statusAtual === 'aprovado' && <p style={{ color: '#dc2626', marginTop: '4px' }}>⚠️ Roteiro aprovado não pode ser editado por guias</p>}
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {erro && <div style={{ color: '#dc2626', fontSize: '14px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '8px', marginBottom: '20px' }}>{erro}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Título *</label>
              <input name="titulo" value={formData.titulo} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Descrição *</label>
              <textarea name="descricao" rows={4} value={formData.descricao} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Preço (R$) *</label>
                <input name="preco" type="number" step="0.01" value={formData.preco} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Duração (horas) *</label>
                <input name="duracao_horas" type="number" value={formData.duracao_horas} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Distância (km) *</label>
                <input name="km" type="number" step="0.1" value={formData.km} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Dificuldade *</label>
                <select name="dificuldade" value={formData.dificuldade} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <option value="fácil">Fácil</option>
                  <option value="médio">Médio</option>
                  <option value="difícil">Difícil</option>
                  <option value="extremo">Extremo</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Localização *</label>
              <input name="localizacao" value={formData.localizacao} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Foto de Capa (URL)</label>
              <input name="foto_capa" value={formData.foto_capa} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            </div>

            {/* GALERIA */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Galeria de Fotos (até 3)</label>
              {fotosExistentes.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {fotosExistentes.map((foto, index) => (
                    <div key={index} style={{ position: 'relative', width: '64px', height: '64px' }}>
                      <img src={foto} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      <button type="button" onClick={() => removerFotoExistente(index)} style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#dc2626', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {novasFotosPreview.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {novasFotosPreview.map((preview, index) => (
                    <div key={index} style={{ position: 'relative', width: '64px', height: '64px' }}>
                      <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      <button type="button" onClick={() => removerNovaFoto(index)} style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#dc2626', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <input type="file" accept="image/*" multiple onChange={handleNovasFotos} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Você pode adicionar até 3 fotos no total</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" disabled={loading || uploading} style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                {loading || uploading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button type="button" onClick={handleExcluir} style={{ backgroundColor: '#dc2626', color: 'white', padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                Excluir Roteiro
              </button>
              <button type="button" onClick={() => router.push('/guia/dashboard')} style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}