import { useEffect, useState } from 'react'
import api from '../lib/api'

export default function Settings() {
  const [connections, setConnections] = useState([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/config/zap-connections'),
      api.get('/config'),
    ]).then(([{ data: conns }, { data: cfg }]) => {
      const list = Array.isArray(conns) ? conns : (conns.connections || conns.data || [])
      setConnections(list)
      // marca a conexão salva no banco — usa o id numérico como string para comparar
      const saved = cfg.zap_connection_id
      if (saved) setSelected(String(saved))
    }).finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    await api.post('/config', { key: 'zap_connection_id', value: selected })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-500">Gerencie as integrações do sistema</p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-800 mb-1">Conexão WhatsApp (Zap Contábil)</h2>
        <p className="text-sm text-slate-500 mb-4">Selecione qual número será usado para enviar os relatórios</p>

        {loading ? (
          <p className="text-slate-400 text-sm">Carregando conexões...</p>
        ) : connections.length === 0 ? (
          <p className="text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">
            ⚠ Nenhuma conexão encontrada no Zap Contábil.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {connections.map(c => (
              <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="connection"
                  className="w-4 h-4 accent-brand-500"
                  checked={selected === String(c.id)}
                  onChange={() => setSelected(String(c.id))}
                />
                <div>
                  <p className="font-medium text-slate-800">{c.name}</p>
                  <p className="text-sm text-slate-500">{c.number}</p>
                  <span className={c.status === 'CONNECTED' ? 'badge-green' : 'badge-red'}>
                    {c.status}
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}

        <button className="btn-primary" onClick={save} disabled={saving || !selected}>
          {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar configuração'}
        </button>
      </div>
    </div>
  )
}