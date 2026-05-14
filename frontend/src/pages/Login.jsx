import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import api from '../lib/api'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">PH</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">PH Consult Pro</h1>
          <p className="text-slate-500 mt-1">Relatórios financeiros</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="seu@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="••••••••" />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>}

          <button className="btn-primary w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
