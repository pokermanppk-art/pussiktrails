'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

interface UploadAvatarModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onAvatarUpdated: (url: string) => void
}

export default function UploadAvatarModal({ isOpen, onClose, userId, onAvatarUpdated }: UploadAvatarModalProps) {
  const [uploading, setUploading] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMensagem('❌ Por favor, selecione uma imagem válida (JPG, PNG, GIF)')
      return
    }

    setUploading(true)
    setMensagem('')

    const fileExt = file.name.split('.').pop()
    const fileName = `avatar-${uuidv4()}.${fileExt}`
    const filePath = `avatars/${userId}/${fileName}`

    // Upload para o Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      setMensagem(`❌ Erro no upload: ${uploadError.message}`)
      setUploading(false)
      return
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath)

    // Salvar URL na tabela users
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)

    if (updateError) {
      setMensagem(`❌ Erro ao salvar: ${updateError.message}`)
      setUploading(false)
      return
    }

    setMensagem('✅ Avatar atualizado com sucesso!')
    onAvatarUpdated(publicUrl)
    
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        width: '90%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>📸 Alterar foto de perfil</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            backgroundColor: '#16a34a',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'inline-block'
          }}>
            {uploading ? 'Enviando...' : 'Escolher imagem'}
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {mensagem && (
          <p style={{ color: mensagem.includes('✅') ? '#16a34a' : '#dc2626', marginBottom: '16px' }}>
            {mensagem}
          </p>
        )}

        <button
          onClick={onClose}
          style={{
            backgroundColor: '#e5e7eb',
            color: '#374151',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}