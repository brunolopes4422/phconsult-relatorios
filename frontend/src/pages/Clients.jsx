import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(null)
  const navigate = useNavigate()

  async function load() {
    const { data } = await api.get('/clients')
    setClients(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function copyLink(id) {
    const link = `${window.location.origin}/conectar/${id}`
    navigator.clipboard.writeText(link)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function save() {
    setSaving(true)
    try {
      if (modal.id) {
        await api.put(`/clients/${modal.id}`, { name: modal.name, status: modal.status })
      } else {
        await api.post('/clients', { name: modal.name, status: modal.status || 'active' })
      }
      setModal(null)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id, name) {
    if (!confirm(`Remover cliente "${name}"?`)) return
    await api.delete(`/clients/${id}`)
    load()
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500">Gerencie os clientes e conexões Conta Azul</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ name: '', status: 'active' })}>
          + Novo cliente
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">CNPJ</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Conta Azul</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <button className="font-medium text-brand-600 hover:underline" onClick={() => navigate(`/clients/${c.id}`)}>
                      {c.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{c.documento || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={c.status === 'active' ? 'badge-green' : 'badge-red'}>
                      {c.status === 'active' ? '● Ativo' : '● Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {c.ca_connected ? (
                      <span className="badge-green">● Conectado</span>
                    ) : (
                      <button
                        className="text-sm text-brand-600 hover:underline"
                        onClick={() => copyLink(c.id)}
                      >
                        {copied === c.id ? '✓ Link copiado!' : '📋 Copiar link'}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="btn-secondary text-sm" onClick={() => setModal({ id: c.id, name: c.name, status: c.status })}>
                        Editar
                      </button>
                      <button className="text-red-500 hover:text-red-700 text-sm px-2" onClick={() => remove(c.id, c.name)}>
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhum cliente cadastrado</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {modal.id ? 'Editar cliente' : 'Novo cliente'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input className="input" value={modal.name} onChange={e => setModal(m => ({ ...m, name: e.target.value }))} placeholder="Nome do cliente" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select className="input" value={modal.status} onChange={e => setModal(m => ({ ...m, status: e.target.value }))}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-primary flex-1" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              <button className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}