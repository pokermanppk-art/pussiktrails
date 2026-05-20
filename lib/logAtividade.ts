import { supabase } from './supabase/client'

export async function registrarAtividade(
  usuarioId: string,
  tipoUsuario: string,
  primeiroNome: string,
  acao: string,
  detalhes: string,
  alvoId?: string
) {
  try {
    const { error } = await supabase.from('logs_atividades').insert({
      usuario_id: usuarioId,
      tipo_usuario: tipoUsuario,
      primeiro_nome: primeiroNome,
      acao: acao,
      detalhes: detalhes,
      alvo_id: alvoId,
      created_at: new Date().toISOString()
    })
    if (error) console.error('Erro ao registrar atividade:', error)
  } catch (err) {
    console.error('Falha ao registrar atividade:', err)
  }
}