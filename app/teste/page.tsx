'use client'

import { useState } from 'react'

export default function TestePage() {
  const [cor, setCor] = useState('cinza')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Teste de Cores</h1>
      
      <button
        onClick={() => setCor('verde')}
        className={`px-4 py-2 rounded mr-2 ${
          cor === 'verde' ? 'bg-green-600 text-white' : 'bg-gray-300'
        }`}
      >
        Verde
      </button>
      
      <button
        onClick={() => setCor('cinza')}
        className={`px-4 py-2 rounded ${
          cor === 'cinza' ? 'bg-green-600 text-white' : 'bg-gray-300'
        }`}
      >
        Cinza
      </button>
      
      <p className="mt-4">Botão selecionado: <strong>{cor}</strong></p>
    </div>
  )
}