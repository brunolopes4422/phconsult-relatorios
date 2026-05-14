import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function Setup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/setup/status').then(({ data }) => {
      if (data.configured) navigate('/login')
      else setChecking(false)
    })
  }, [])

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      await api.post('/setup', form)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar admin')
    } finally {
      setLoading(false)
    }
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400">Verificando...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">PH</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Configuração inicial</h1>
          <p className="text-slate-500 mt-1">Crie o usuário administrador</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Seu nome" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@phconsultpro.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>}

          <button className="btn-primary w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Criando...' : 'Criar administrador'}
          </button>
        </div>
      </div>
    </div>
  )
}
