import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: c }, { data: r }] = await Promise.all([
      api.get(`/clients/${id}`),
      api.get(`/clients/${id}/recipients`),
    ])
    setClient(c)
    setRecipients(r)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function saveRecipient() {
    setSaving(true)
    try {
      if (modal.id) {
        await api.put(`/recipients/${modal.id}`, modal)
      } else {
        await api.post(`/clients/${id}/recipients`, modal)
      }
      setModal(null)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function removeRecipient(rid, name) {
    if (!confirm(`Remover destinatário "${name}"?`)) return
    await api.delete(`/recipients/${rid}`)
    load()
  }

  async function connectCA() {
    const { data } = await api.get(`/clients/${id}/ca-auth-url`)
    window.open(data.url, '_blank', 'width=600,height=700')
  }

  if (loading) return <div className="p-8 text-slate-400">Carregando...</div>
  if (!client) return <div className="p-8 text-red-500">Cliente não encontrado</div>

  return (
    <div className="p-8">
      <div className="mb-2">
        <button className="text-sm text-brand-600 hover:underline" onClick={() => navigate('/clients')}>← Voltar</button>
      </div>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{client.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={client.status === 'active' ? 'badge-green' : 'badge-red'}>
              {client.status === 'active' ? '● Ativo' : '● Inativo'}
            </span>
            {client.ca_connected ? (
              <span className="badge-green">● Conta Azul conectada</span>
            ) : (
              <button className="badge-yellow cursor-pointer hover:bg-amber-100 transition-colors" onClick={connectCA}>
                ⚠ Conectar Conta Azul
              </button>
            )}
          </div>
        </div>
        {client.ca_connected && (
          <button className="btn-primary" onClick={() => navigate(`/report/${id}`)}>
            📊 Gerar relatório
          </button>
        )}
      </div>

      {/* Recipients */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Destinatários WhatsApp</h2>
          <button className="btn-primary text-sm" onClick={() => setModal({ name: '', phone: '', role: '', active: true })}>
            + Adicionar
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">Telefone</th>
              <th className="px-6 py-3">Cargo</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map(r => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-800">{r.name}</td>
                <td className="px-6 py-4 text-slate-600">{r.phone}</td>
                <td className="px-6 py-4 text-slate-500">{r.role || '—'}</td>
                <td className="px-6 py-4">
                  <span className={r.active ? 'badge-green' : 'badge-red'}>{r.active ? '● Ativo' : '● Inativo'}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="btn-secondary text-sm" onClick={() => setModal({ id: r.id, name: r.name, phone: r.phone, role: r.role || '', active: r.active })}>
                      Editar
                    </button>
                    <button className="text-red-500 hover:text-red-700 text-sm px-2" onClick={() => removeRecipient(r.id, r.name)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
            {recipients.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhum destinatário cadastrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {modal.id ? 'Editar destinatário' : 'Novo destinatário'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input className="input" value={modal.name} onChange={e => setModal(m => ({ ...m, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone (com DDD e código do país)</label>
                <input className="input" value={modal.phone} onChange={e => setModal(m => ({ ...m, phone: e.target.value }))} placeholder="5511999990000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                <input className="input" value={modal.role} onChange={e => setModal(m => ({ ...m, role: e.target.value }))} placeholder="Ex: Sócio, Contador..." />
              </div>
              {modal.id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select className="input" value={modal.active} onChange={e => setModal(m => ({ ...m, active: e.target.value === 'true' }))}>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-primary flex-1" onClick={saveRecipient} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              <button className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
