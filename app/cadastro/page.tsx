const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setErro('')
  setSucesso('')
  setCarregando(true)

  // Validações básicas
  if (senha !== confirmarSenha) {
    setErro('As senhas não conferem')
    setCarregando(false)
    return
  }

  const cpfLimpo = cpf.replace(/\D/g, '')
  const celularLimpo = celular.replace(/\D/g, '')
  const instagramLimpo = instagram.replace('@', '').trim()

  // Dados base
  const dadosBase = {
    nome,
    email,
    celular: celularLimpo,
    cpf: cpfLimpo,
    senha,
    tipo,
    status: tipo === 'cliente' ? 'ativo' : 'pendente',
    created_at: new Date().toISOString(),
  }

  // Dados específicos para guia
  const dadosGuia = tipo === 'guia' ? {
    instagram: instagramLimpo,
    cadastur,
    cnpj: cnpj.replace(/\D/g, ''),
  } : {}

  const dadosCompletos = { ...dadosBase, ...dadosGuia }

  console.log('🔵 [REGISTER] Enviando dados:', JSON.stringify(dadosCompletos, null, 2))

  try {
    // Usar supabase normal (com as políticas RLS que criamos)
    const { data, error } = await supabase
      .from('users')
      .insert([dadosCompletos])
      .select()

    if (error) {
      console.error('❌ [REGISTER] Erro detalhado:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      if (error.message.includes('duplicate key')) {
        setErro('CPF, e-mail ou celular já cadastrado')
      } else if (error.code === '42501') {
        setErro('Erro de permissão. Contate o administrador.')
      } else {
        setErro(`Erro: ${error.message}`)
      }
      setCarregando(false)
      return
    }

    console.log('✅ [REGISTER] Sucesso:', data)
    setSucesso('Cadastro realizado com sucesso! Redirecionando para o login...')
    setTimeout(() => {
      router.push('/login')
    }, 2000)

  } catch (err: any) {
    console.error('❌ [REGISTER] Exceção:', err)
    setErro(err.message || 'Erro ao cadastrar')
    setCarregando(false)
  }
}