import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await api.get('/users')
    setUsers(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    try {
      if (modal.id) {
        await api.put(`/users/${modal.id}`, modal)
      } else {
        if (!modal.password) return alert('Senha obrigatória')
        await api.post('/users', modal)
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
    if (id === me.id) return alert('Não pode remover seu próprio usuário')
    if (!confirm(`Remover usuário "${name}"?`)) return
    await api.delete(`/users/${id}`)
    load()
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
          <p className="text-slate-500">Controle de acesso ao sistema</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ name: '', email: '', password: '', is_admin: false, is_active: true })}>
          + Novo usuário
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
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Perfil</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {u.name} {u.id === me.id && <span className="text-xs text-slate-400">(você)</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={u.is_admin ? 'badge-green' : 'badge-yellow'}>
                      {u.is_admin ? 'Admin' : 'Colaborador'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                      {u.is_active ? '● Ativo' : '● Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="btn-secondary text-sm" onClick={() => setModal({ id: u.id, name: u.name, email: u.email, is_admin: u.is_admin, is_active: u.is_active, password: '' })}>
                        Editar
                      </button>
                      {u.id !== me.id && (
                        <button className="text-red-500 hover:text-red-700 text-sm px-2" onClick={() => remove(u.id, u.name)}>✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {modal.id ? 'Editar usuário' : 'Novo usuário'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input className="input" value={modal.name} onChange={e => setModal(m => ({ ...m, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input className="input" type="email" value={modal.email} onChange={e => setModal(m => ({ ...m, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {modal.id ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
                </label>
                <input className="input" type="password" value={modal.password} onChange={e => setModal(m => ({ ...m, password: e.target.value }))} />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-brand-500" checked={modal.is_admin} onChange={e => setModal(m => ({ ...m, is_admin: e.target.checked }))} />
                  <span className="text-sm text-slate-700">Administrador</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-brand-500" checked={modal.is_active} onChange={e => setModal(m => ({ ...m, is_active: e.target.checked }))} />
                  <span className="text-sm text-slate-700">Ativo</span>
                </label>
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
