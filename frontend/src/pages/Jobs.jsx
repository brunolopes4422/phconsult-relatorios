import { useEffect, useState } from 'react'
import api from '../lib/api'

const STATUS_LABELS = {
  pending: { label: 'Aguardando', class: 'badge-yellow' },
  processing: { label: 'Processando', class: 'badge-yellow' },
  sent: { label: 'Enviado', class: 'badge-green' },
  skipped: { label: 'Ignorado', class: 'text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600' },
  error: { label: 'Erro (retry)', class: 'badge-red' },
  failed: { label: 'Falhou', class: 'badge-red' },
}

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const { data } = await api.get('/jobs')
      setJobs(data)
    } catch (err) {
      alert('Erro ao carregar jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000) // atualiza a cada 15s
    return () => clearInterval(interval)
  }, [])

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleString('pt-BR')
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fila de Envios</h1>
          <p className="text-slate-500">Acompanhe o status dos relatórios automáticos</p>
        </div>
        <button className="btn-secondary" onClick={load}>🔄 Atualizar</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Período</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Tentativas</th>
                <th className="px-6 py-3">Criado em</th>
                <th className="px-6 py-3">Processado em</th>
                <th className="px-6 py-3">Erro</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => {
                const s = STATUS_LABELS[j.status] || { label: j.status, class: 'badge-yellow' }
                return (
                  <tr key={j.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{j.clients?.name || '—'}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {j.period_start === j.period_end
                        ? new Date(j.period_start + 'T12:00:00').toLocaleDateString('pt-BR')
                        : `${new Date(j.period_start + 'T12:00:00').toLocaleDateString('pt-BR')} → ${new Date(j.period_end + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className={s.class}>{s.label}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{j.attempts}/{j.max_attempts}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{fmtDate(j.created_at)}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{fmtDate(j.processed_at)}</td>
                    <td className="px-6 py-4 text-red-500 text-xs max-w-xs truncate">{j.error || '—'}</td>
                  </tr>
                )
              })}
              {jobs.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Nenhum job encontrado</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}