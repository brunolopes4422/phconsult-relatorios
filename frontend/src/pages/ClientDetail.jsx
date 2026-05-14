import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'

const FREQUENCY_LABELS = {
  daily_morning: 'Todo dia — manhã',
  daily_evening: 'Todo dia — fim do dia',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
}

const PERIOD_LABELS = {
  day: 'Dia atual',
  week: 'Últimos 7 dias',
  biweek: 'Últimos 15 dias',
  month: 'Mês atual',
}

const DAYS_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function CredentialsTab({ clientId }) {
  const [creds, setCreds] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState({})

  useEffect(() => {
    api.get(`/clients/${clientId}/credentials`)
      .then(({ data }) => setCreds(data))
      .finally(() => setLoading(false))
  }, [clientId])

  function mask(str) {
    if (!str) return '—'
    return str.slice(0, 10) + '...' + str.slice(-6)
  }

  function toggle(key) {
    setRevealed(r => ({ ...r, [key]: !r[key] }))
  }

  function copyToClipboard(str) {
    navigator.clipboard.writeText(str)
    alert('Copiado!')
  }

  if (loading) return <div className="card p-8 text-center text-slate-400">Carregando...</div>

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-slate-800 mb-1">Credenciais Conta Azul</h2>
      <p className="text-sm text-slate-500 mb-6">Tokens de acesso salvos para este cliente. Informação sensível.</p>
      <div className="space-y-4">
        {[
          { key: 'ca_access_token', label: 'Access Token' },
          { key: 'ca_refresh_token', label: 'Refresh Token' },
        ].map(({ key, label }) => (
          <div key={key}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
              <code className="text-sm text-slate-700 flex-1 break-all">
                {revealed[key] ? (creds?.[key] || '—') : mask(creds?.[key])}
              </code>
              <div className="flex gap-2 flex-shrink-0">
                <button className="text-xs text-brand-600 hover:underline" onClick={() => toggle(key)}>
                  {revealed[key] ? 'Ocultar' : 'Revelar'}
                </button>
                {revealed[key] && creds?.[key] && (
                  <button className="text-xs text-slate-500 hover:underline" onClick={() => copyToClipboard(creds[key])}>
                    Copiar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Token expira em</p>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm text-slate-700">
              {creds?.ca_token_expires_at
                ? new Date(creds.ca_token_expires_at).toLocaleString('pt-BR')
                : '—'}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Status da conexão</p>
          <div className="bg-slate-50 rounded-lg p-3">
            <span className={creds?.ca_connected ? 'badge-green' : 'badge-red'}>
              {creds?.ca_connected ? '● Conectado' : '● Desconectado'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('recipients')
  const [modalR, setModalR] = useState(null)
  const [modalS, setModalS] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: c }, { data: r }, { data: s }] = await Promise.all([
      api.get(`/clients/${id}`),
      api.get(`/clients/${id}/recipients`),
      api.get(`/clients/${id}/schedules`),
    ])
    setClient(c)
    setRecipients(r)
    setSchedules(s)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function saveRecipient() {
    setSaving(true)
    try {
      if (modalR.id) {
        await api.put(`/recipients/${modalR.id}`, modalR)
      } else {
        await api.post(`/clients/${id}/recipients`, modalR)
      }
      setModalR(null)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function removeRecipient(rid, name) {
    if (!confirm(`Remover "${name}"?`)) return
    await api.delete(`/recipients/${rid}`)
    load()
  }

  async function saveSchedule() {
    setSaving(true)
    try {
      if (modalS.id) {
        await api.put(`/schedules/${modalS.id}`, modalS)
      } else {
        await api.post(`/clients/${id}/schedules`, modalS)
      }
      setModalS(null)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function removeSchedule(sid) {
    if (!confirm('Remover agendamento?')) return
    await api.delete(`/schedules/${sid}`)
    load()
  }

  async function toggleSchedule(s) {
    await api.put(`/schedules/${s.id}`, { ...s, active: !s.active })
    load()
  }

  function copyLink() {
    const link = `${window.location.origin}/conectar/${id}`
    navigator.clipboard.writeText(link)
    alert('Link copiado!')
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
          {client.documento && <p className="text-slate-500 text-sm mt-1">CNPJ: {client.documento}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className={client.status === 'active' ? 'badge-green' : 'badge-red'}>
              {client.status === 'active' ? '● Ativo' : '● Inativo'}
            </span>
            {client.ca_connected ? (
              <span className="badge-green">● Conta Azul conectada</span>
            ) : (
              <button className="badge-yellow cursor-pointer" onClick={copyLink}>
                ⚠ Copiar link de conexão
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {['recipients', 'schedules', 'credentials'].map(t => (
          <button
            key={t}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setTab(t)}
          >
            {t === 'recipients' ? 'Destinatários' : t === 'schedules' ? 'Agendamentos' : 'Credenciais'}
          </button>
        ))}
      </div>

      {/* Tab Destinatários */}
      {tab === 'recipients' && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Destinatários WhatsApp</h2>
            <button className="btn-primary text-sm" onClick={() => setModalR({ name: '', phone: '', role: '', active: true })}>
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
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{r.name}</td>
                  <td className="px-6 py-4 text-slate-600">{r.phone}</td>
                  <td className="px-6 py-4 text-slate-500">{r.role || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={r.active ? 'badge-green' : 'badge-red'}>{r.active ? '● Ativo' : '● Inativo'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="btn-secondary text-sm" onClick={() => setModalR({ id: r.id, name: r.name, phone: r.phone, role: r.role || '', active: r.active })}>Editar</button>
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
      )}

      {/* Tab Agendamentos */}
      {tab === 'schedules' && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Agendamentos automáticos</h2>
            <button className="btn-primary text-sm" onClick={() => setModalS({ frequency: 'monthly', send_time: '08:00', period_type: 'month', day_of_week: 5, day_of_month: 1, active: true })}>
              + Novo agendamento
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="px-6 py-3">Frequência</th>
                <th className="px-6 py-3">Horário</th>
                <th className="px-6 py-3">Período</th>
                <th className="px-6 py-3">Último envio</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{FREQUENCY_LABELS[s.frequency]}</td>
                  <td className="px-6 py-4 text-slate-600">{s.send_time}</td>
                  <td className="px-6 py-4 text-slate-600">{PERIOD_LABELS[s.period_type]}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {s.last_run ? new Date(s.last_run).toLocaleString('pt-BR') : 'Nunca'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={s.active ? 'badge-green' : 'badge-red'}>{s.active ? '● Ativo' : '● Pausado'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="btn-secondary text-sm" onClick={() => toggleSchedule(s)}>
                        {s.active ? 'Pausar' : 'Ativar'}
                      </button>
                      <button className="btn-secondary text-sm" onClick={() => setModalS({ ...s })}>Editar</button>
                      <button className="text-red-500 hover:text-red-700 text-sm px-2" onClick={() => removeSchedule(s.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Nenhum agendamento configurado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Credenciais */}
      {tab === 'credentials' && <CredentialsTab clientId={id} />}

      {/* Modal Destinatário */}
      {modalR && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">{modalR.id ? 'Editar destinatário' : 'Novo destinatário'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input className="input" value={modalR.name} onChange={e => setModalR(m => ({ ...m, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone (com DDD e código do país)</label>
                <input className="input" value={modalR.phone} onChange={e => setModalR(m => ({ ...m, phone: e.target.value }))} placeholder="5511999990000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                <input className="input" value={modalR.role} onChange={e => setModalR(m => ({ ...m, role: e.target.value }))} placeholder="Ex: Sócio, Contador..." />
              </div>
              {modalR.id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select className="input" value={modalR.active} onChange={e => setModalR(m => ({ ...m, active: e.target.value === 'true' }))}>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-primary flex-1" onClick={saveRecipient} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              <button className="btn-secondary flex-1" onClick={() => setModalR(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agendamento */}
      {modalS && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">{modalS.id ? 'Editar agendamento' : 'Novo agendamento'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Frequência</label>
                <select className="input" value={modalS.frequency} onChange={e => setModalS(m => ({ ...m, frequency: e.target.value }))}>
                  <option value="daily_morning">Todo dia — manhã</option>
                  <option value="daily_evening">Todo dia — fim do dia</option>
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quinzenal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Horário de envio</label>
                <input className="input" type="time" value={modalS.send_time} onChange={e => setModalS(m => ({ ...m, send_time: e.target.value }))} />
              </div>
              {modalS.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dia da semana</label>
                  <select className="input" value={modalS.day_of_week} onChange={e => setModalS(m => ({ ...m, day_of_week: parseInt(e.target.value) }))}>
                    {DAYS_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}
              {(modalS.frequency === 'monthly' || modalS.frequency === 'biweekly') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dia do mês</label>
                  <input className="input" type="number" min="1" max="31" value={modalS.day_of_month} onChange={e => setModalS(m => ({ ...m, day_of_month: parseInt(e.target.value) }))} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Período do relatório</label>
                <select className="input" value={modalS.period_type} onChange={e => setModalS(m => ({ ...m, period_type: e.target.value }))}>
                  <option value="day">Dia atual</option>
                  <option value="week">Últimos 7 dias</option>
                  <option value="biweek">Últimos 15 dias</option>
                  <option value="month">Mês atual</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-primary flex-1" onClick={saveSchedule} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              <button className="btn-secondary flex-1" onClick={() => setModalS(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}